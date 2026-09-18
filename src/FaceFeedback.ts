import type { EyesData } from './facemesh';
import { mapVideoPointToElement, type VideoContentMapping } from './videoLayout';
import { pupilCenterInPatch } from './pupil';

const overlayStyle: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: '100000'
};

const FEEDBACK_BOX_RATIO = {
  width: 0.5,
  height: 0.7
};

/**
 * This class creates a face feedback visualization to help the user position their face in the camera.
 */
export class FaceFeedback {
  private faceFeedbackCanvas: HTMLCanvasElement;
  private videoElement: HTMLVideoElement;
  private mirrorVideo: boolean;
  private resizeObserver: ResizeObserver;
  showEyeRegions = true;
  showIris = true;

  /**
   * @param videoElement - The video element to use for face feedback
   * @param mirrorVideo - Whether to mirror the video feed
   */
  constructor (videoElement: HTMLVideoElement, mirrorVideo = false) {
    this.videoElement = videoElement;
    this.mirrorVideo = mirrorVideo;

    const container = videoElement.parentElement;
    if (!container) throw new Error('Video element must have a parent');
    container.style.position = 'relative';

    this.faceFeedbackCanvas = document.createElement('canvas');
    Object.assign(this.faceFeedbackCanvas.style, overlayStyle);
    container.appendChild(this.faceFeedbackCanvas);

    this.resizeObserver = new ResizeObserver(() => this.updateFeedbackBox());
    this.resizeObserver.observe(this.videoElement);
    this.updateFeedbackBox();
  }

  private updateFeedbackBox (): void {
    const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.videoElement;
    Object.assign(this.faceFeedbackCanvas.style, {
      width: `${offsetWidth}px`,
      height: `${offsetHeight}px`,
      top: `${offsetTop}px`,
      left: `${offsetLeft}px`
    });
    this.faceFeedbackCanvas.width = offsetWidth;
    this.faceFeedbackCanvas.height = offsetHeight;
  }

  private mappingFor (eyePatches: EyesData): VideoContentMapping {
    return eyePatches.videoToElement ?? {
      scaleX: eyePatches.scaleX,
      scaleY: eyePatches.scaleY,
      offsetX: 0,
      offsetY: 0
    };
  }

  /**
   * Updates the face feedback visualization
   * @param {EyesData} eyePatches - The positions of the eyes
   */
  update (eyePatches: EyesData): void {
    const { width, height } = this.faceFeedbackCanvas;
    const ctx = this.faceFeedbackCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const mapping = this.mappingFor(eyePatches);
    const mapBox = (x: number, y: number, w: number, h: number) => {
      const tl = mapVideoPointToElement(x, y, mapping, this.mirrorVideo, width);
      const br = mapVideoPointToElement(x + w, y + h, mapping, this.mirrorVideo, width);
      return {
        x: Math.min(tl.x, br.x),
        y: Math.min(tl.y, br.y),
        w: Math.abs(br.x - tl.x),
        h: Math.abs(br.y - tl.y)
      };
    };

    const validationBox = {
      x: width * (1 - FEEDBACK_BOX_RATIO.width) / 2,
      y: height * (1 - FEEDBACK_BOX_RATIO.height) / 2,
      w: width * FEEDBACK_BOX_RATIO.width,
      h: height * FEEDBACK_BOX_RATIO.height
    };
    const eyesBoxes = [eyePatches.left, eyePatches.right].map(eye =>
      mapBox(eye.imagex, eye.imagey, eye.width, eye.height)
    );
    const eyesInBox = eyesBoxes.every(eye => eye.x >= validationBox.x &&
      eye.x + eye.w <= validationBox.x + validationBox.w &&
      eye.y >= validationBox.y &&
      eye.y + eye.h <= validationBox.y + validationBox.h);

    if (this.showEyeRegions) {
      ctx.strokeStyle = eyesInBox ? '#000080' : '#b00000';
      ctx.lineWidth = 2;
      ctx.strokeRect(validationBox.x, validationBox.y, validationBox.w, validationBox.h);

      ctx.fillStyle = eyesInBox ? '#00a000' : '#b00000';
      ctx.globalAlpha = 0.5;
      eyesBoxes.forEach(eye => ctx.fillRect(eye.x, eye.y, eye.w, eye.h));
      ctx.globalAlpha = 1.0;
    }

    if (this.showIris) {
      const irisRadius = 4;
      ([eyePatches.left, eyePatches.right]).forEach(eye => {
        if (!eye.pupil) return;
        const [px, py] = pupilCenterInPatch(eye.pupil);
        const pt = mapVideoPointToElement(
          eye.imagex + px,
          eye.imagey + py,
          mapping,
          this.mirrorVideo,
          width
        );
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, irisRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  dispose (): void {
    this.faceFeedbackCanvas.remove();
    this.resizeObserver.disconnect();
  }
}
