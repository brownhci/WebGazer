import { FaceLandmarksDetector, load, SupportedPackages } from '@tensorflow-models/face-landmarks-detection';
import type { Eye } from './worker_scripts/util';

export type TwoEyes = {
  left: Eye;
  right: Eye;
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
  private offscreenContext2D: OffscreenCanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;

  /**
   * Constructor of TFFaceMesh object
   * @param {HTMLVideoElement} videoElement - The video element to track
   * @param {MediaStream} stream - The stream to track
   * @constructor
   * */
  constructor (videoElement: HTMLVideoElement, stream: MediaStream) {
    // Backend options are webgl, wasm, and CPU.
    // For recent laptops WASM is better than WebGL.
    this.model = load(
      SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    );
    this.videoElement = videoElement;

    // Create OffscreenCanvas with the actual video size
    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(this.videoElement);
    const videoTrack = stream.getVideoTracks()[0];
    const { width = videoElement.width, height = videoElement.height } = videoTrack.getSettings();
    const offscreenContext = new OffscreenCanvas(width, height).getContext('2d');
    if (!offscreenContext) throw new Error('No context for the offscreen drawings');
    this.offscreenContext2D = offscreenContext;
    this.updateCanvasSize();
  }

  setVideoElement (videoElement: HTMLVideoElement): void {
    this.resizeObserver.unobserve(this.videoElement);
    this.videoElement = videoElement;
    this.resizeObserver.observe(this.videoElement);
  }

  /**
   * Isolates the two patches that correspond to the user's eyes
   * @return {Promise<TwoEyes | undefined>} the two eye-patches, first left, then right eye
   */
  getEyePatches = async (): Promise<TwoEyes | undefined> => {
    const context2D = this.offscreenContext2D;
    if (!context2D || !this.videoElement.width || !this.videoElement.height) return;

    // Draw current frame to offscreen canvas
    context2D.drawImage(this.videoElement, 0, 0, context2D.canvas.width, context2D.canvas.height);

    // Load the MediaPipe facemesh model.
    const model = await this.model;

    // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
    // array of detected faces from the MediaPipe graph.
    const predictions = await model.estimateFaces({
      input: this.videoElement,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: false
    });

    if (predictions.length === 0) return;

    // Draw the face overlay if it is enabled
    const positions: [number, number, number][] = (predictions[0].scaledMesh as [number, number, number][]).map(([x, y, z]) => [x * this.videoElement.width / this.offscreenContext2D.canvas.width, y * this.videoElement.height / this.offscreenContext2D.canvas.height, z]);
    this.drawFaceOverlay(positions);

    // Get the details about the eyes
    const prediction = predictions[0];
    if (prediction.kind === 'MediaPipePredictionTensors') return;
    const annotations = prediction.annotations;
    if (!context2D || !annotations) return;

    const scaleX = this.videoElement.width / this.offscreenContext2D.canvas.width;
    const scaleY = this.videoElement.height / this.offscreenContext2D.canvas.height;

    // Keypoints indexes are documented at
    // https://github.com/tensorflow/tfjs-models/blob/118d4727197d4a21e2d4691e134a7bc30d90deee/face-landmarks-detection/mesh_map.jpg
    // https://stackoverflow.com/questions/66649492/how-to-get-specific-landmark-of-face-like-lips-or-eyes-using-tensorflow-js-face
    const [leftEye, rightEye] = ['left', 'right']
      .map(side => {
        const [{ x: upperX, y: upperY }, { x: lowerX, y: lowerY }] = ['Upper', 'Lower']
          // We read "leftEyeUpper0", "leftEyeLower0", "rightEyeUpper0", and "rightEyeLower0" from the annotations
          .map(edge => annotations[`${side}Eye${edge}0`])
          // Organize the data on x and y
          .map(points => ({ x: points.map(point => point[0]), y: points.map(point => point[1]) }));
        // Get the bounding box of the eye
        const topLeft = { x: Math.round(Math.max(Math.min(...upperX), Math.min(...lowerX))), y: Math.round(Math.max(Math.min(...upperY), Math.min(...lowerY))) };
        const bottomRight = { x: Math.round(Math.min(Math.max(...upperX), Math.max(...lowerX))), y: Math.round(Math.min(Math.max(...upperY), Math.max(...lowerY))) };
        // Get the patch of the eye
        const patch = context2D.getImageData(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        return {
          patch,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
          imagex: topLeft.x,
          imagey: topLeft.y
        };
      });

    if (leftEye.width === 0 || rightEye.width === 0) {
      console.log('an eye patch had zero width');
      return;
    }

    if (leftEye.height === 0 || rightEye.height === 0) {
      console.log('an eye patch had zero height');
      return;
    }

    // Start building object to be returned
    return {
      left: leftEye,
      right: rightEye,
      scaleX,
      scaleY
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
  };

  hideFaceOverlay = (): void => {
    if (!this.canvas) return;
    this.canvas.remove();
  };

  private updateCanvasSize (): void {
    const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.videoElement;
    // this.offscreenContext2D.canvas.width = offsetWidth;
    // this.offscreenContext2D.canvas.height = offsetHeight;
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
  private drawFaceOverlay = (positions: [number, number, number][]): void => {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // If we have face positions, draw them
    if (positions) {
      ctx.fillStyle = '#32EEDB';
      ctx.strokeStyle = '#32EEDB';
      ctx.lineWidth = 0.5;

      positions.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(this.mirrorVideo ? ctx.canvas.width - x : x, y, 1 /* radius */, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
      });
    }
  };
}
