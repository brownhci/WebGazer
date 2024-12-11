// @ts-check
import { Ridge, RidgeOptions } from './worker_scripts/regression';
import type { Point } from './worker_scripts/util';
import type { EyesData } from './facemesh';
import type { EyeData } from './ridgeWorker.worker';

export interface Weights {
  X: number[];
  Y: number[];
}

export class RidgeRegThreaded extends Ridge {
  /**
   * The RidgeWeightedReg object name
   */
  name = 'ridgeThreaded' as const;

  weights: Weights = { X: [0], Y: [0] };
  worker: Worker;

  /**
   * Constructor of RidgeRegThreaded object,
   * it retrieve data window, and prepare a worker,
   * this object allow to perform threaded ridge regression
   * @constructor
   */
  constructor (options: RidgeOptions) {
    super(options);
    const workerUrl = new URL('./ridgeWorker.worker.js', import.meta.url);
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.worker.onerror = (err: ErrorEvent) => console.log(err.message);
    this.worker.onmessage = (evt: MessageEvent<Weights>) => {
      this.weights.X = evt.data.X;
      this.weights.Y = evt.data.Y;
    };
  }

  /**
   * Data to be added
   */
  addData = (data: import('./worker_scripts/regression.js').DataSet): void => {
    const { eyes, screenPos, type } = data;
    if (!eyes) return;
    if (type === 'click') this.dataClicks.push(data);
    this.worker.postMessage({ eyes: eyes.grayscale, screenPos, type } as EyeData);
  };

  /**
   * Return the data
   */
  getData = (): import('./worker_scripts/regression.js').DataSet[] => this.dataClicks.data;

  /**
   * Try to predict coordinates from pupil data
   * after apply linear regression on data set
   * @param eyesObj - The current user eyes object
   */
  predict = (eyesObj: EyesData | undefined): Point | undefined => {
    if (!eyesObj) return;
    const coefficientsX = this.weights.X;
    const coefficientsY = this.weights.Y;

    const eyeFeats = eyesObj.grayscale;
    let predictedX = 0;
    let predictedY = 0;
    for (let i = 0; i < Math.min(eyeFeats.length, coefficientsX.length, coefficientsY.length); i++) {
      predictedX += eyeFeats[i] * coefficientsX[i];
      predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);
    if (isNaN(predictedX) || isNaN(predictedY)) console.log(coefficientsX, coefficientsY, predictedX, predictedY, eyeFeats);

    if (this.useKalmanFilter) {
      // Update Kalman model, and get prediction
      const [x, y] = this.kalman.update([predictedX, predictedY]);
      return { x, y };
    } else {
      return {
        x: predictedX,
        y: predictedY
      };
    }
  };

  dispose = (): void => {
    this.worker.terminate();
  };
}
