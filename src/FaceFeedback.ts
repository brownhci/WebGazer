import type { EyesData } from './facemesh';

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

  /**
   * @param {HTMLVideoElement} videoElement - The video element to use for face feedback
   * @param {boolean=} mirrorVideo - Whether to mirror the video feed
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

  /**
   * Updates the face feedback visualization
   * @param {DOMRect} facePosition - The position of the face
   * @param {EyesData} eyePatches - The positions of the eyes
   */
  update (eyePatches: EyesData): void {
    const { width, height } = this.faceFeedbackCanvas;
    const ctx = this.faceFeedbackCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);

      const { scaleX, scaleY } = eyePatches;
      const validationBox = {
        x: width * (1 - FEEDBACK_BOX_RATIO.width) / 2,
        y: height * (1 - FEEDBACK_BOX_RATIO.height) / 2,
        w: width * FEEDBACK_BOX_RATIO.width,
        h: height * FEEDBACK_BOX_RATIO.height
      };
      const eyesBoxes = [eyePatches.left, eyePatches.right].map(eye => ({
        x: this.mirrorVideo ? width - eye.imagex * scaleX - eye.width * scaleX : eye.imagex * scaleX,
        y: eye.imagey * scaleY,
        w: eye.width * scaleX,
        h: eye.height * scaleY
      }));
      const eyesInBox = eyesBoxes.every(eye => eye.x >= validationBox.x &&
        eye.x + eye.w <= validationBox.x + validationBox.w &&
        eye.y >= validationBox.y &&
        eye.y + eye.h <= validationBox.y + validationBox.h);

      ctx.strokeStyle = eyesInBox ? '#000080' : '#b00000';
      ctx.lineWidth = 2;
      ctx.strokeRect(validationBox.x, validationBox.y, validationBox.w, validationBox.h);

      ctx.fillStyle = eyesInBox ? '#00a000' : '#b00000';
      ctx.globalAlpha = 0.5; // Semi-transparent
      eyesBoxes.forEach(eye => ctx.fillRect(eye.x, eye.y, eye.w, eye.h));
      ctx.globalAlpha = 1.0; // Reset alpha
    }
  }

  dispose (): void {
    this.faceFeedbackCanvas.remove();
    this.resizeObserver.disconnect();
  }
}
