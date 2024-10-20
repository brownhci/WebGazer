// @ts-check
import '@tensorflow/tfjs';

import 'regression';
import './dom_util';
import { RidgeReg } from './ridgeReg';
import { RidgeWeightedReg } from './ridgeWeightedReg';
import { RidgeRegThreaded } from './ridgeRegThreaded';
import { DataWindow, bound, Point } from './worker_scripts/util';
import { TFFaceMesh, TwoEyes } from './facemesh';
import { GazeDot } from './GazeDot';
import { FaceFeedback } from './FaceFeedback';
import { GazeTrail } from './GazeTrail';
import { SaveManager } from './SaveManager';
export { isBrowserCompatible } from './dom_util';

/**
 * Represents the result of a gaze prediction.
 */
export type PredictionResult = {
  x: number;
  y: number;
  eyeFeatures?: TwoEyes;
  all?: (Point | undefined)[];
};

/**
 * Options for regression configuration.
 */
export type RegressionOptions = {
  /** The regression method to use */
  regression: 'ridgeReg' | 'ridgeWeighted' | 'ridgeThreaded';
  /** Whether to use Kalman filter */
  useKalmanFilter: boolean;
  /** Size of move ticks */
  moveTickSize: number;
  /** Which eye to track */
  trackEye: 'left' | 'right' | 'both';
};

/**
 * Options for WebGazer configuration.
 */
export type WebGazerOptions = {
  /** Constraints for the camera video */
  videoConstraints: MediaTrackConstraints;
  /** Gaze dot size in pixels */
  dotSize: number;
  /** Whether to save data across sessions */
  saveDataAcrossSessions: boolean;
  /** Whether to listen to the mouse click and move events to calibrate the model */
  useCalibration: boolean | 'move' | 'click';
};

/**
 * Options for saving data.
 */
export type SaveOptions = {
  /** Interval between saves in milliseconds */
  saveInterval: number;
}

/**
 * Options for starting WebGazer.
 */
export type WebGazerStartOptions = {
  /** Whether to show the gaze dot */
  gazeDot: boolean;
  /** Whether to show the gaze trail */
  gazeTrail: boolean;
  /** Constraints for the camera video */
  videoConstraints: MediaTrackConstraints;
};

export type WebgazerVideoOptions = {
  /** Whether to mirror the video feed */
  mirrorVideo: boolean;
  /** Whether to show the face feedback */
  faceFeedback: boolean;
}

const SMOOTHING_PRECISION = 15;

/**
 * Main WebGazer class for eye-tracking functionality.
 */
export class WebGazer {
  tracker: TFFaceMesh| null = null;
  regression: RidgeRegThreaded | RidgeWeightedReg | RidgeReg;
  videoElement: HTMLVideoElement = document.createElement('video');
  stream: MediaStream | null = null;
  gazeDot: GazeDot | null = null;
  gazeTrail: GazeTrail | null = null;
  faceFeedback: FaceFeedback | null = null;
  smoothingVals: DataWindow<PredictionResult> = new DataWindow(SMOOTHING_PRECISION);
  paused = false;
  listeners: ((data: PredictionResult | undefined, elapsedTime: number) => void)[] = [];
  saveManager: SaveManager;
  destroyed = false;
  clockStart = 0;
  mirrorVideo = false;

  params: WebGazerOptions & WebGazerStartOptions = {
    gazeDot: true,
    gazeTrail: false,
    dotSize: 10,
    videoConstraints: { width: { min: 320, ideal: 640, max: 1920 }, height: { min: 240, ideal: 480, max: 1080 }, facingMode: 'user' },
    saveDataAcrossSessions: true,
    useCalibration: true
  };

  lastEyePatches: TwoEyes | undefined = undefined;

  private mouseMoveClock = performance.now();

  /**
   * Creates a new WebGazer instance.
   * @param {Partial<WebGazerOptions & RegressionOptions>} [options] - Configuration options for WebGazer.
   */
  constructor (options?: Partial<WebGazerOptions & RegressionOptions>) {
    // We duplicate the options object to avoid mutating the original object
    const optionsObject = options ? JSON.parse(JSON.stringify(options)) : {};
    const allParams = { ...this.params, ...optionsObject };
    const { regression = 'ridgeReg', trackEye = 'both', useKalmanFilter = true, moveTickSize = 50, saveInterval = 1000, ...otherParams } = allParams;
    this.params = { ...this.params, ...otherParams };
    const RegressionClass = regression === 'ridgeThreaded' ? RidgeRegThreaded : regression === 'ridgeWeighted' ? RidgeWeightedReg : RidgeReg;
    this.regression = new RegressionClass({ trackEye, useKalmanFilter, moveTickSize });

    // Save the data across sessions
    this.saveManager = new SaveManager(this.regression, saveInterval);
    if (this.params.saveDataAcrossSessions) this.saveManager.loadData();
  }

  get useKalmanFilter (): boolean {
    return this.regression.useKalmanFilter;
  }

  set useKalmanFilter (value: boolean) {
    this.regression.useKalmanFilter = value;
  }

  /**
   * Sets the regression method and options.
   * @param {RegressionOptions['regression']} regression - The regression method to use.
   * @param {Partial<Omit<RegressionOptions, 'regression'>>=} [options] - Additional regression options.
   */
  setRegression (regression: RegressionOptions['regression'], options?: Partial<Omit<RegressionOptions, 'regresssion'>>): void {
    this.params = { ...this.params, ...options };
    this.regression.dispose();
    const RegressionClass = regression === 'ridgeThreaded' ? RidgeRegThreaded : regression === 'ridgeWeighted' ? RidgeWeightedReg : RidgeReg;
    this.regression = new RegressionClass({ useKalmanFilter: this.regression.useKalmanFilter, moveTickSize: this.regression.moveTickSize, trackEye: this.regression.trackEye });
    this.saveManager = new SaveManager(this.regression, this.saveManager.saveDelay);
  }

  /**
   * Shows the gaze dot on the screen.
   */
  showGazeDot (): void {
    this.params.gazeDot = true;
    if (!this.gazeDot) this.gazeDot = new GazeDot(this.params.dotSize || 10);
  }

  /**
   * Hides the gaze dot from the screen.
   */
  hideGazeDot (): void {
    this.params.gazeDot = false;
    if (this.gazeDot) this.gazeDot.dispose();
    this.gazeDot = null;
  }

  /**
   * Shows face feedback on the screen.
   */
  showFaceFeedback (mirrorVideo = false): void {
    if (!this.faceFeedback) {
      this.faceFeedback = new FaceFeedback(this.videoElement, mirrorVideo);
      this.tracker?.showFaceOverlay(mirrorVideo);
    }
  }

  /**
   * Hides face feedback from the screen.
   */
  hideFaceFeedback (): void {
    if (this.faceFeedback) this.faceFeedback.dispose();
    this.faceFeedback = null;
  }

  /**
   * Shows the gaze trail on the screen.
   * @param {number} [length=50] - The length of the gaze trail.
   */
  showGazeTrail (length = 50): void {
    this.params.gazeTrail = true;
    if (!this.gazeTrail) this.gazeTrail = new GazeTrail(length);
  }

  /**
   * Hides the gaze trail from the screen.
   */
  hideGazeTrail (): void {
    this.params.gazeTrail = false;
    if (this.gazeTrail) this.gazeTrail.dispose();
    this.gazeTrail = null;
  }

  /**
   * Adds a gaze listener to receive gaze predictions.
   * @param {(data: PredictionResult | undefined, elapsedTime: number) => void} listener - The listener function to add.
   */
  addGazeListener (listener: (data: PredictionResult | undefined, elapsedTime: number) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Removes a gaze listener.
   * @param {(data: PredictionResult | undefined, elapsedTime: number) => void} listener - The listener function to remove.
   */
  removeGazeListener (listener: (data: PredictionResult | undefined, elapsedTime: number) => void): void {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  /**
   * Stops WebGazer and releases resources.
   */
  stop (): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.videoElement.srcObject = null;
    this.hideGazeDot();
    this.hideGazeTrail();
    this.hideFaceFeedback();
    this.saveManager.stopAutoSave();
    // We don't use stopCalibration() because we don't want to set useCalibration to false. This way, the calibration will restart when start() is called again.
    document.removeEventListener('click', this.clickListener, true);
    document.removeEventListener('mousemove', this.moveListener, true);
  }

  /**
   * Starts WebGazer
   * If no existingStream is provided, it will try to get a new MediaStream from the webcam
   * @param {Partial<WebGazerStartOptions>=} options - Options for the start method
   * @param {MediaStream=} [existingStream] - Optional existing MediaStream to use
   * @returns {Promise<void>}
   */
  async start (options?: Partial<WebGazerStartOptions>, existingStream?: MediaStream): Promise<void> {
    if (this.destroyed) throw new Error('WebGazer has been destroyed');
    this.params = { ...this.params, ...(options || {}) };
    this.clockStart = performance.now();
    if (existingStream) {
      this.stream = existingStream;
    } else {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: this.params.videoConstraints,
          audio: false
        });
      } catch (err) {
        console.error('Failed to get user media', err);
        throw err;
      }
    }

    // Get the video track to determine actual size
    this.tracker = new TFFaceMesh(this.videoElement, this.stream);

    this.videoElement.srcObject = this.stream;
    await this.videoElement.play();

    if (this.params.gazeDot) this.showGazeDot();
    if (this.params.gazeTrail) this.showGazeTrail();
    if (this.params.saveDataAcrossSessions) this.saveManager.startAutoSave();
    if (this.params.useCalibration === true || this.params.useCalibration === 'click') document.addEventListener('click', this.clickListener, true);
    if (this.params.useCalibration === true || this.params.useCalibration === 'move') document.addEventListener('mousemove', this.moveListener, true);

    this.loop();
  }

  /**
   * Gets the current gaze prediction.
   * @returns {Promise<PredictionResult | undefined>}
   */
  async getPrediction (): Promise<PredictionResult | undefined> {
    if (!this.stream) return;
    const eyeFeatures = this.lastEyePatches;
    return eyeFeatures && this.regression.predict(eyeFeatures);
  }

  async loop (): Promise<void> {
    if (this.paused || !this.stream) return;

    // Make a prediction
    const eyeFeatures = await this.tracker?.getEyePatches();
    this.lastEyePatches = eyeFeatures;
    const prediction = eyeFeatures && this.regression.predict(eyeFeatures);
    if (prediction) {
      // Smooth prediction
      this.smoothingVals.push(prediction);
      const { x, y } = this.smoothingVals.data.reduce((acc, val) => ({
        x: acc.x + val.x,
        y: acc.y + val.y
      }), { x: 0, y: 0 });
      const len = this.smoothingVals.data.length;
      const smoothedPrediction = { x: x / len, y: y / len };

      // Apply bounds to the smoothed prediction
      const boundedPrediction = bound(smoothedPrediction);

      // Update gaze dot position
      if (this.gazeDot) this.gazeDot.update(boundedPrediction.x, boundedPrediction.y);
      if (this.gazeTrail) this.gazeTrail.addPoint(boundedPrediction.x, boundedPrediction.y);
      if (this.faceFeedback) this.faceFeedback.update(eyeFeatures);

      // Send the prediction to the listeners
      const predictionEvent = { ...boundedPrediction, eyeFeatures, all: [boundedPrediction] };
      this.listeners.forEach(listener => listener(predictionEvent, performance.now() - this.clockStart));
    }

    // Continue the loop
    requestAnimationFrame(() => this.loop());
  }

  private clickListener = (event: MouseEvent): void => {
    if (this.paused) return;

    const eyesObj = this.lastEyePatches;
    if (eyesObj) {
      const x = event.clientX;
      const y = event.clientY;
      this.regression.addData({ eyes: eyesObj, screenPos: [x, y], type: 'click' });
      if (this.params.saveDataAcrossSessions) this.saveManager.saveData();
    }
  };

  private moveListener = (event: MouseEvent): void => {
    if (this.paused) return;

    const now = performance.now();
    if (now - this.mouseMoveClock < this.regression.moveTickSize) return;
    this.mouseMoveClock = now;

    const eyesObj = this.lastEyePatches;
    if (eyesObj) {
      const x = event.clientX;
      const y = event.clientY;
      this.regression.addData({ eyes: eyesObj, screenPos: [x, y], type: 'move' });
      if (this.params.saveDataAcrossSessions) this.saveManager.saveData();
    }
  };

  /**
   * Starts the calibration process.
   */
  startCalibration (): void {
    if (this.params.useCalibration) this.stopCalibration();
    this.params.useCalibration = true;
    document.addEventListener('click', this.clickListener, true);
    document.addEventListener('mousemove', this.moveListener, true);
  }

  /**
   * Stops the calibration process.
   */
  stopCalibration (): void {
    this.params.useCalibration = false;
    document.removeEventListener('click', this.clickListener, true);
    document.removeEventListener('mousemove', this.moveListener, true);
  }

  /**
   * Pauses WebGazer.
   */
  pause (): void {
    this.paused = true;
    this.saveManager.stopAutoSave();
  }

  /**
   * Resumes WebGazer after being paused.
   * @returns {Promise<void> | undefined}
   */
  resume (): Promise<void> | undefined {
    if (this.destroyed) throw new Error('WebGazer has been destroyed');
    if (!this.paused) return;
    this.paused = false;
    this.saveManager.startAutoSave();
    return this.loop();
  }

  /**
   * Clears all collected data and resets the model.
   */
  clearData (): void {
    this.regression.setData([]);
    this.smoothingVals.clear();
    this.saveManager.clearData();
  }

  /**
   * Stops WebGazer and releases all resources.
   */
  destroy (): void {
    this.destroyed = true;
    this.stop();
    this.regression.dispose();
    this.saveManager.dispose();
    this.stopCalibration();

    // Reset properties
    this.listeners = [];
  }

  /**
   * Shows video feedback on a specified video element.
   * @param {HTMLVideoElement} videoElement - The video element to show feedback on.
   * @param {boolean} [mirrorVideo] - Whether to mirror the video feed.
   * @returns {Promise<void>}
   */
  async showVideoFeedback (videoElement: HTMLVideoElement, options?: Partial<WebgazerVideoOptions>): Promise<void> {
    const { faceFeedback, mirrorVideo } = options || {};
    this.videoElement = videoElement;
    this.tracker?.setVideoElement(videoElement);

    if (mirrorVideo) {
      this.videoElement.style.setProperty('-moz-transform', 'scale(-1, 1)');
      this.videoElement.style.setProperty('-webkit-transform', 'scale(-1, 1)');
      this.videoElement.style.setProperty('-o-transform', 'scale(-1, 1)');
      this.videoElement.style.setProperty('transform', 'scale(-1, 1)');
      this.videoElement.style.setProperty('filter', 'FlipH');
    } else {
      this.videoElement.style.removeProperty('-moz-transform');
      this.videoElement.style.removeProperty('-webkit-transform');
      this.videoElement.style.removeProperty('-o-transform');
      this.videoElement.style.removeProperty('transform');
      this.videoElement.style.removeProperty('filter');
    }

    // Restart the face feedback on the new video element
    if (faceFeedback) this.showFaceFeedback(mirrorVideo);

    // Restart the video feed
    if (this.stream) {
      this.videoElement.srcObject = this.stream;
      return this.videoElement.play();
    }
  }

  /**
   * Stops video feedback.
   */
  stopVideoFeedback (): void {
    this.hideFaceFeedback();
    this.tracker?.hideFaceOverlay();
    this.videoElement.pause();
    this.videoElement.srcObject = null;
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = this.stream;
    this.videoElement.play();
  }
}
