import { FaceLandmarksDetector, load, SupportedPackages } from '@tensorflow-models/face-landmarks-detection';
import { getIrisFeatures, getNormalizedIrisOffset, type Eye, type EyeIrisOffsets } from './worker_scripts/util';

export type TwoEyes = {
  left: Eye;
  right: Eye;
};

export type EyesData = {
  left: Eye;
  right: Eye;
  /** Regression feature vector built from normalized iris offsets. */
  features: number[];
  iris: EyeIrisOffsets;
  facemesh: [number, number, number][];
  /**
   * The scale factor for the x-axis between the stream and the videoElement
   */
  scaleX: number;
  /**
   * The scale factor for the y-axis between the stream and the videoElement
   */
  scaleY: number;
};

const overlayStyle: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: '10000'
};

export class TFFaceMesh {
  /** @type {Promise<FaceLandmarksDetector>} */
  model: Promise<FaceLandmarksDetector>;
  /**
   * The TFFaceMesh object name
   * @type {string}
   */
  name = 'TFFaceMesh';

  private mirrorVideo = false;
  private canvas: HTMLCanvasElement | null = null;
  private videoElement: HTMLVideoElement;
  private resizeObserver: ResizeObserver;
  trackEye: 'left' | 'right' | 'both';

  /**
   * Constructor of TFFaceMesh object
   * @param videoElement - The video element to track
   * @param stream - The stream to track
   * @constructor
   * */
  constructor (videoElement: HTMLVideoElement, _stream: MediaStream, trackEye: 'left' | 'right' | 'both' = 'both') {
    // Backend options are webgl, wasm, and CPU.
    // For recent laptops WASM is better than WebGL.
    this.model = load(
      SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1, shouldLoadIrisModel: true }
    );
    this.videoElement = videoElement;
    this.trackEye = trackEye;
    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(this.videoElement);
    this.updateCanvasSize();
  }

  setVideoElement (videoElement: HTMLVideoElement): void {
    this.resizeObserver.unobserve(this.videoElement);
    this.videoElement = videoElement;
    this.resizeObserver.observe(this.videoElement);
    this.updateCanvasSize();
  }

  /**
   * Detects face landmarks and extracts iris-based eye features.
   * @return Eye tracking data for the current frame
   */
  getEyePatches = async (): Promise<EyesData | undefined> => {
    const videoW = this.videoElement.videoWidth;
    const videoH = this.videoElement.videoHeight;
    if (!videoW || !videoH) return;

    const model = await this.model;

    const predictions = await model.estimateFaces({
      input: this.videoElement,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: true
    });

    if (predictions.length === 0) return;

    const displayScaleX = this.videoElement.clientWidth / videoW;
    const displayScaleY = this.videoElement.clientHeight / videoH;

    const positions: [number, number, number][] = (predictions[0].scaledMesh as [number, number, number][]).map(
      ([x, y, z]) => [x, y, z]
    );
    this.drawFaceOverlay(positions, displayScaleX, displayScaleY);

    const prediction = predictions[0];
    if (prediction.kind === 'MediaPipePredictionTensors') return;
    const annotations = prediction.annotations;
    if (!annotations) return;

    // Keypoints indexes are documented at
    // https://github.com/tensorflow/tfjs-models/blob/118d4727197d4a21e2d4691e134a7bc30d90deee/face-landmarks-detection/mesh_map.jpg
    const [leftEye, rightEye] = ['left', 'right']
      .map(side => {
        const [{ x: upperX, y: upperY }, { x: lowerX, y: lowerY }] = ['Upper', 'Lower']
          .map(edge => annotations[`${side}Eye${edge}0`])
          .map(points => ({ x: points.map(point => point[0]), y: points.map(point => point[1]) }));
        const [minUpperX, minUpperY, minLowerX, minLowerY] = [upperX, upperY, lowerX, lowerY].map(values => Math.min(...values));
        const [maxUpperX, maxUpperY, maxLowerX, maxLowerY] = [upperX, upperY, lowerX, lowerY].map(values => Math.max(...values));
        const topLeft = { x: Math.round(Math.min(minUpperX, minLowerX)), y: Math.round(Math.min(minUpperY, minLowerY)) };
        const bottomRight = { x: Math.round(Math.max(maxUpperX, maxLowerX)), y: Math.round(Math.max(maxUpperY, maxLowerY)) };
        return {
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
          imagex: topLeft.x,
          imagey: topLeft.y
        };
      });

    if (leftEye.width === 0 || rightEye.width === 0) {
      console.log('an eye region had zero width');
      return;
    }

    if (leftEye.height === 0 || rightEye.height === 0) {
      console.log('an eye region had zero height');
      return;
    }

    const leftIrisCenter = annotations.leftEyeIris?.[0];
    const rightIrisCenter = annotations.rightEyeIris?.[0];
    if (!leftIrisCenter || !rightIrisCenter) return;

    const iris: EyeIrisOffsets = {
      left: getNormalizedIrisOffset(leftIrisCenter, leftEye),
      right: getNormalizedIrisOffset(rightIrisCenter, rightEye)
    };

    const features = getIrisFeatures(iris, this.trackEye);

    return {
      features,
      iris,
      left: leftEye,
      right: rightEye,
      facemesh: positions,
      scaleX: displayScaleX,
      scaleY: displayScaleY
    };
  };

  /**
   * Reset the tracker to default values
   */
  dispose = (): void => {
    this.hideFaceOverlay();
    this.resizeObserver.disconnect();
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

  /**
   * Draw TF_FaceMesh_Overlay
   */
  private drawFaceOverlay = (
    positions: [number, number, number][],
    displayScaleX: number,
    displayScaleY: number
  ): void => {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (positions) {
      ctx.fillStyle = '#32EEDB';
      ctx.strokeStyle = '#32EEDB';
      ctx.lineWidth = 0.5;

      positions.forEach(([x, y]) => {
        const drawX = x * displayScaleX;
        const drawY = y * displayScaleY;
        ctx.beginPath();
        ctx.arc(this.mirrorVideo ? ctx.canvas.width - drawX : drawX, drawY, 1 /* radius */, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
      });
    }
  };
}
