import { load, SupportedPackages } from '@tensorflow-models/face-landmarks-detection';
import type { FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection';
import { getPupils, pupilCenterInPatch } from './pupil';
import { getVideoContentMapping, mapVideoPointToElement } from './videoLayout';
import {
  getEyeFeats,
  getNormalizedIrisOffset,
  type Eye,
  type EyeIrisOffsets
} from './worker_scripts/util';
export type TwoEyes = {
  left: Eye;
  right: Eye;
};

export type EyesData = {
  left: Eye;
  right: Eye;
  /** Ridge features: equalized grayscale histograms of eye patches. */
  features: number[];
  /** Pupil offsets relative to (possibly height-shrunk) eye bounds. */
  iris: EyeIrisOffsets;
  facemesh: [number, number, number][];
  /** Native video frame size (for solvePnP camera matrix). */
  videoWidth: number;
  videoHeight: number;
  /** @deprecated Prefer videoToElement mapping; kept for callers. */
  scaleX: number;
  scaleY: number;
  /** Maps video-frame pixels → overlay/element pixels (handles object-fit). */
  videoToElement: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  };
};

/**
 * Vertical crop of the eyelid-arc bbox before pupil search / ridge feats.
 * 1.0 = use the full eyelid opening (arcs already exclude most brow/cheek).
 * Values < 1 were tried to focus on the iris slit but made patches too thin
 * for stable pupil localization.
 */
export const EYE_PATCH_HEIGHT_RATIO = 1.0;

/** Draw every Nth landmark (full mesh is ~468/478 points). */
const OVERLAY_STRIDE = 4;

/** Min ms between overlay redraws (tracking still runs every frame). */
const OVERLAY_MIN_INTERVAL_MS = 100;

// Subject's left/right eye arcs (MediaPipe Face Mesh indices)
const EYE_INDICES = {
  leftEyeUpper0: [466, 388, 387, 386, 385, 384, 398],
  leftEyeLower0: [263, 249, 390, 373, 374, 380, 381, 382, 362],
  rightEyeUpper0: [246, 161, 160, 159, 158, 157, 173],
  rightEyeLower0: [33, 7, 163, 144, 145, 153, 154, 155, 133]
};

const overlayStyle: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  pointerEvents: 'none',
  // Above FaceFeedback (100000) so landmarks stay visible.
  zIndex: '100001'
};

const shrinkEyeBoundsVertically = (
  originX: number,
  originY: number,
  width: number,
  height: number,
  ratio: number
): { x: number; y: number; width: number; height: number } => {
  const newH = Math.max(1, Math.round(height * ratio));
  const y = originY + Math.floor((height - newH) / 2);
  return { x: originX, y, width, height: newH };
};

export type TFFaceMeshOptions = {
  /** Vertical crop of eyelid bbox (0–1). Lower = tighter on the iris slit. */
  eyePatchHeightRatio?: number;
};

export class TFFaceMesh {
  name = 'TFFaceMesh';

  private modelPromise: Promise<FaceLandmarksDetector>;
  private model: FaceLandmarksDetector | null = null;
  private mirrorVideo = false;
  private canvas: HTMLCanvasElement | null = null;
  /** Offscreen canvas used to sample eye ImageData from the video frame. */
  private frameCanvas: HTMLCanvasElement = document.createElement('canvas');
  private videoElement: HTMLVideoElement;
  private resizeObserver: ResizeObserver;
  trackEye: 'left' | 'right' | 'both';
  private eyePatchHeightRatio: number;
  private lastOverlayDrawMs = 0;

  constructor (
    videoElement: HTMLVideoElement,
    _stream: MediaStream,
    trackEye: 'left' | 'right' | 'both' = 'both',
    options: TFFaceMeshOptions = {}
  ) {
    this.eyePatchHeightRatio = options.eyePatchHeightRatio ?? EYE_PATCH_HEIGHT_RATIO;
    // face-landmarks-detection@0.0.3 — latest 0.x; 1.x migration deferred.
    // Iris model kept for 478-landmark topology (eye arc index 466); pupil is still from patches.
    this.modelPromise = load(
      SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1, shouldLoadIrisModel: true }
    ).then(model => {
      this.model = model;
      return model;
    });
    this.videoElement = videoElement;
    this.trackEye = trackEye;
    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(this.videoElement);
    this.updateCanvasSize();
  }

  /** Resolves when the face landmark model finished loading. */
  whenReady = (): Promise<FaceLandmarksDetector> => this.modelPromise;

  setVideoElement (videoElement: HTMLVideoElement): void {
    this.resizeObserver.unobserve(this.videoElement);
    this.videoElement = videoElement;
    this.resizeObserver.observe(this.videoElement);
    this.updateCanvasSize();
  }

  /**
   * Detect face landmarks, extract eye patches, locate pupils, build ridge features.
   */
  getEyePatches = async (): Promise<EyesData | undefined> => {
    const videoW = this.videoElement.videoWidth;
    const videoH = this.videoElement.videoHeight;
    if (!videoW || !videoH) return;

    const model = this.model ?? await this.modelPromise;
    const predictions = await model.estimateFaces({
      input: this.videoElement,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: true
    });
    if (!predictions.length) {
      this.clearFaceOverlay();
      return;
    }

    const prediction = predictions[0];
    if (prediction.kind === 'MediaPipePredictionTensors') return;

    const positions: [number, number, number][] = (prediction.scaledMesh as [number, number, number][]).map(
      ([x, y, z]) => [x, y, z]
    );
    if (!positions.length) return;

    const fit = getComputedStyle(this.videoElement).objectFit || 'fill';
    const videoToElement = getVideoContentMapping(this.videoElement, fit);
    this.drawFaceOverlay(positions, videoToElement);

    const ctx = this.paintVideoFrame(videoW, videoH);
    if (!ctx) return;

    const pointAt = (indices: number[]): [number, number, number][] =>
      indices.map(idx => positions[idx] ?? [0, 0, 0]);

    const makeEye = (upper: number[], lower: number[]): Eye | null => {
      const topArc = pointAt(upper);
      const bottomArc = pointAt(lower);
      const minX = Math.round(Math.min(...topArc.map(p => p[0]), ...bottomArc.map(p => p[0])));
      const maxX = Math.round(Math.max(...topArc.map(p => p[0]), ...bottomArc.map(p => p[0])));
      const minY = Math.round(Math.min(...topArc.map(p => p[1])));
      const maxY = Math.round(Math.max(...bottomArc.map(p => p[1])));
      let width = maxX - minX;
      let height = maxY - minY;
      if (width <= 0 || height <= 0) return null;

      const shrunk = shrinkEyeBoundsVertically(minX, minY, width, height, this.eyePatchHeightRatio);
      const x = Math.max(0, Math.min(shrunk.x, videoW - 1));
      const y = Math.max(0, Math.min(shrunk.y, videoH - 1));
      width = Math.max(1, Math.min(shrunk.width, videoW - x));
      height = Math.max(1, Math.min(shrunk.height, videoH - y));

      const patch = ctx.getImageData(x, y, width, height);
      return { imagex: x, imagey: y, width, height, patch };
    };

    const left = makeEye(EYE_INDICES.leftEyeUpper0, EYE_INDICES.leftEyeLower0);
    const right = makeEye(EYE_INDICES.rightEyeUpper0, EYE_INDICES.rightEyeLower0);
    if (!left || !right) {
      console.warn('WebGazer: eye region had zero size', {
        landmarks: positions.length,
        videoW,
        videoH
      });
      return;
    }

    getPupils({ left, right });

    const offsetFor = (eye: Eye): [number, number] => {
      if (!eye.pupil) return [0, 0];
      const [cx, cy] = pupilCenterInPatch(eye.pupil);
      return getNormalizedIrisOffset([eye.imagex + cx, eye.imagey + cy], eye);
    };

    const iris: EyeIrisOffsets = {
      left: offsetFor(left),
      right: offsetFor(right)
    };

    let features: number[];
    try {
      features = getEyeFeats({ left, right }, this.trackEye);
    } catch (err) {
      console.warn('WebGazer: getEyeFeats failed', err);
      return;
    }

    return {
      left,
      right,
      features,
      iris,
      facemesh: positions,
      videoWidth: videoW,
      videoHeight: videoH,
      scaleX: videoToElement.scaleX,
      scaleY: videoToElement.scaleY,
      videoToElement
    };
  };

  dispose = (): void => {
    this.hideFaceOverlay();
    this.resizeObserver.disconnect();
    this.model = null;
  };

  showFaceOverlay = (mirrorVideo = false): void => {
    if (this.canvas) return;
    const container = this.videoElement.parentElement;
    if (!container) throw new Error('Video element must have a parent');
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, overlayStyle);
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    this.mirrorVideo = mirrorVideo;
    this.updateCanvasSize();
  };

  hideFaceOverlay = (): void => {
    if (!this.canvas) return;
    this.canvas.remove();
    this.canvas = null;
  };

  private paintVideoFrame (videoW: number, videoH: number): CanvasRenderingContext2D | null {
    if (this.frameCanvas.width !== videoW) this.frameCanvas.width = videoW;
    if (this.frameCanvas.height !== videoH) this.frameCanvas.height = videoH;
    const ctx = this.frameCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(this.videoElement, 0, 0, videoW, videoH);
    return ctx;
  }

  private updateCanvasSize (): void {
    const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.videoElement;
    if (this.canvas) {
      Object.assign(this.canvas.style, {
        width: `${offsetWidth}px`,
        height: `${offsetHeight}px`,
        top: `${offsetTop}px`,
        left: `${offsetLeft}px`
      });
      this.canvas.width = offsetWidth;
      this.canvas.height = offsetHeight;
    }
  }

  private clearFaceOverlay (): void {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Sparse landmark overlay (stride subsample), throttled so drawing stays cheaper than tracking.
   */
  private drawFaceOverlay = (
    positions: [number, number, number][],
    mapping: { scaleX: number; scaleY: number; offsetX: number; offsetY: number }
  ): void => {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    if (now - this.lastOverlayDrawMs < OVERLAY_MIN_INTERVAL_MS) return;
    this.lastOverlayDrawMs = now;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!positions.length) return;

    ctx.fillStyle = '#32EEDB';
    for (let i = 0; i < positions.length; i += OVERLAY_STRIDE) {
      const [x, y] = positions[i];
      const pt = mapVideoPointToElement(x, y, mapping, this.mirrorVideo, ctx.canvas.width);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  };
}