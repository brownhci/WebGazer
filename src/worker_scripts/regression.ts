import { identity, Matrix, mult, multScalar, solve, transpose } from './mat';
import { DataWindow, KalmanFilter, Point } from './util';
import type { EyesData } from '../facemesh';

const DATA_WINDOW_SIZE = 700;
const TRAIL_DATA_WINDOW_SIZE = 10;
const RIDGE_PARAMETER = Math.pow(10, -5);
const TRAIL_TIME = 1000;
const KALMAN_PIXEL_ERROR = 47;
const KALMAN_INITIAL_COVARIANCE = 0.0001;
const KALMAN_INITIAL_X = 500;
const KALMAN_INITIAL_Y = 500;
const KALMAN_DELTA_T = 1 / 100;

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Matrix} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Matrix} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {number} k - ridge parameter
 * @return {number[]} regression coefficients
 */
export const ridge = (y: Matrix, X: Matrix, k: number): number[] => {
  const nc = X[0].length;
  const mCoefficients: number[] = new Array(nc);
  try {
    const xt = transpose(X);
    let solution: Matrix = [];
    let success = true;
    const result: number[] = [];
    do {
      const ss = mult(xt, X);
      // Set ridge regression adjustment
      for (let i = 0; i < nc; i++) {
        ss[i][i] = ss[i][i] + k;
      }

      // Carry out the regression
      const bb = mult(xt, y);
      for (let i = 0; i < nc; i++) {
        mCoefficients[i] = bb[i][0];
      }
      try {
        const n = (mCoefficients.length !== 0 ? mCoefficients.length / mCoefficients.length : 0);
        if (mCoefficients.length * n !== mCoefficients.length) {
          console.log('Array length must be a multiple of m');
        }
        solution = solve(ss, bb);

        for (let i = 0; i < nc; i++) {
        // Should it be solution[i][i] or solution[i][0]
          result[i] = solution[i][0];
        }
        success = true;
      } catch (ex) {
        k *= 10;
        console.log(ex);
        success = false;
      }
    } while (!success);
    return result;
  } catch (e) {
    console.log('X', X);
    throw e;
  }
};

export interface DataSet {
  eyes: EyesData;
  screenPos: [number, number];
  type: 'click' | 'move' | 'blink';
}

export interface RidgeOptions {
  useKalmanFilter?: boolean;
  moveTickSize?: number;
}

export class Ridge {
  name: 'ridgeReg' | 'ridgeWeighted' | 'ridgeThreaded' = 'ridgeReg';

  ridgeParameter: number = RIDGE_PARAMETER;
  trailTime: number = TRAIL_TIME;
  trailDataWindow: number;
  moveTickSize: number;

  screenXClicksArray: DataWindow<number[]> = new DataWindow(DATA_WINDOW_SIZE);
  screenYClicksArray: DataWindow<number[]> = new DataWindow(DATA_WINDOW_SIZE);
  eyeFeaturesClicks: DataWindow<number[]> = new DataWindow(DATA_WINDOW_SIZE);

  // sets to one second worth of cursor trail
  screenXTrailArray: DataWindow<number[]> = new DataWindow(TRAIL_DATA_WINDOW_SIZE);
  screenYTrailArray: DataWindow<number[]> = new DataWindow(TRAIL_DATA_WINDOW_SIZE);
  eyeFeaturesTrail: DataWindow<number[]> = new DataWindow(TRAIL_DATA_WINDOW_SIZE);
  trailTimes: DataWindow<number> = new DataWindow(TRAIL_DATA_WINDOW_SIZE);

  dataClicks: DataWindow<DataSet> = new DataWindow(DATA_WINDOW_SIZE);
  dataTrail: DataWindow<DataSet> = new DataWindow(TRAIL_DATA_WINDOW_SIZE);

  kalman: KalmanFilter;
  useKalmanFilter: boolean;

  /**
   * Constructor of RidgeReg object,
   * this object allow to perform ridge regression
   * @constructor
   * @param {RidgeOptions} options
   */
  constructor ({ useKalmanFilter = true, moveTickSize = 10 }: RidgeOptions = {}) {
    this.useKalmanFilter = useKalmanFilter;
    this.moveTickSize = moveTickSize;
    this.trailDataWindow = this.trailTime / moveTickSize;

    // Initialize Kalman filter [20200608 xk] what do we do about parameters?
    // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least
    // by my own anecdotal observation a 4x1 x vector seems to work alright
    const F = [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    // Parameters Q and R may require some fine tuning
    let Q = [
      [1 / 4, 0, 1 / 2, 0],
      [0, 1 / 4, 0, 1 / 2],
      [1 / 2, 0, 1, 0],
      [0, 1 / 2, 0, 1]
    ];
    Q = multScalar(Q, KALMAN_DELTA_T);

    const H = [
      [1, 0, 0, 0],
      [0, 1, 0, 0]
    ];
    const pixelError = KALMAN_PIXEL_ERROR;

    // This matrix represents the expected measurement error
    const R = multScalar(identity(2), pixelError);

    const PInitial = multScalar(identity(4), KALMAN_INITIAL_COVARIANCE); // Initial covariance matrix
    const xInitial = [[KALMAN_INITIAL_X], [KALMAN_INITIAL_Y], [0], [0]]; // Initial measurement matrix

    this.kalman = new KalmanFilter(F, H, Q, R, PInitial, xInitial);
  }

  /**
   * Add given data to current data set then,
   * replace current data member with given data
   * @param {DataSet[]} data - The data to set
   */
  setData = (data: DataSet[]): void => {
    this.dataClicks.clear();
    this.dataTrail.clear();
    this.screenXClicksArray.clear();
    this.screenYClicksArray.clear();
    this.eyeFeaturesClicks.clear();
    this.screenXTrailArray.clear();
    this.screenYTrailArray.clear();
    this.eyeFeaturesTrail.clear();
    data.forEach(d => this.addData(d));
  };

  /**
   * Data to be added
   * @param {DataSet} data
   * @returns {void}
   */
  addData = (data: DataSet): void => {
    const { eyes, screenPos, type } = data;
    if (!eyes) return;

    if (type === 'click') {
      this.screenXClicksArray.push([screenPos[0]]);
      this.screenYClicksArray.push([screenPos[1]]);
      this.eyeFeaturesClicks.push(eyes.grayscale);
      this.dataClicks.push({ eyes, screenPos, type });
    } else if (type === 'move') {
      this.screenXTrailArray.push([screenPos[0]]);
      this.screenYTrailArray.push([screenPos[1]]);

      this.eyeFeaturesTrail.push(eyes.grayscale);
      this.trailTimes.push(performance.now());
      this.dataTrail.push({ eyes, screenPos, type });
    }
  };

  /**
   * Return the data
   * @returns {DataSet[]}
   */
  getData = (): DataSet[] => this.dataClicks.data;

  dispose = (): void => {};

  /**
   * Try to predict coordinates from pupil data
   * after apply linear regression on data set
   * @param {EyesData | undefined} _eyesObj - The current user eyes object
   * @returns {Point | undefined}
   */
  predict = (_eyesObj: EyesData | undefined): Point | undefined => undefined;
}
