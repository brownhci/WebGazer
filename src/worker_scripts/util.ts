'use strict';

import { add, identity, inv, Matrix, mult, sub, transpose } from './mat';

export interface Point {
  x: number;
  y: number;
}

export interface Eye {
  imagex: number;
  imagey: number;
  width: number;
  height: number;
  /** Raw eye region pixels (video-frame coordinates). */
  patch?: ImageData;
  /** Binary mask of the eyelid opening (1 = inside), same size as patch. */
  eyelidMask?: Uint8Array;
  /** Pupil center in patch-local coordinates [cx, cy]. */
  pupil?: [number, number];
}

/** Histogram feature size after resize (matches classic WebGazer). */
export const EYE_FEAT_WIDTH = 10;
/** Slightly shorter than classic 6 to emphasize vertical pupil motion. */
export const EYE_FEAT_HEIGHT = 5;

// Data Window class
export class DataWindow<T> {
  data: T[];
  start: number;
  private windowSize: number;

  /**
   * DataWindow class - Operates like an array, but 'wraps' data around to keep the array at a fixed windowSize
   * @param windowSize - defines the maximum size of the window
   * @param data - optional data to seed the DataWindow with
  **/
  constructor (windowSize: number, data: T[] = []) {
    this.data = [];
    this.start = 0;
    this.windowSize = windowSize;
    data.slice(-windowSize).forEach(item => this.push(item));
  }

  get length (): number {
    return this.data.length;
  }

  clear (): void {
    this.data.length = 0;
    this.start = 0;
  }

  /**
   * [push description]
   * @param entry - item to be inserted. It either grows the DataWindow or replaces the oldest item
   * @return this
   */
  push (...entry: T[]): DataWindow<T> {
    entry.forEach(item => {
      if (this.data.length < this.windowSize) {
        this.data.push(item);
      } else {
        this.data[this.start] = item;
        this.start = (this.start + 1) % this.windowSize;
      }
    });
    return this;
  }

  /**
   * Get the element at the ind position by wrapping around the DataWindow
   * @param ind index of desired entry
   */
  get (ind: number): T {
    return this.data[(this.start + ind) % this.windowSize];
  }

  /**
   * Iterate over the DataWindow
   * @param callback
   */
  forEach (callback: (item: T, index: number, dataWindow: DataWindow<T>) => void): void {
    for (let i = 0; i < this.data.length; i++) {
      callback(this.get(i), i, this);
    }
  }

  toArray (): T[] {
    return [...this];
  }

  * [Symbol.iterator] (): IterableIterator<T> {
    for (let i = 0; i < this.data.length; i++) {
      yield this.get(i);
    }
  }
}

/** Normalized pupil/iris offset from the eye bounds center, in ~[-1, 1] per axis. */
export type EyeIrisOffsets = {
  left: [number, number];
  right: [number, number];
};

/**
 * Normalizes a point relative to the eye bounds center.
 * @param point - Absolute coordinates in the same space as eye.imagex/y
 * @param eye - Detected eye bounds
 */
export const getNormalizedIrisOffset = (
  point: [number, number] | [number, number, number],
  eye: Pick<Eye, 'imagex' | 'imagey' | 'width' | 'height'>
): [number, number] => {
  const centerX = eye.imagex + eye.width / 2;
  const centerY = eye.imagey + eye.height / 2;
  const halfW = eye.width / 2;
  const halfH = eye.height / 2;
  if (halfW === 0 || halfH === 0) return [0, 0];
  return [
    (point[0] - centerX) / halfW,
    (point[1] - centerY) / halfH
  ];
};

/**
 * Builds a short feature vector from normalized pupil offsets (MLP / overlays).
 */
export const getIrisFeatures = (iris: EyeIrisOffsets, trackEye: 'left' | 'right' | 'both'): number[] => {
  if (trackEye === 'left') return [...iris.left];
  if (trackEye === 'right') return [...iris.right];
  return [...iris.left, ...iris.right];
};

/**
 * Grayscale an RGBA ImageData buffer.
 */
export const grayscale = (pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const gray = new Uint8ClampedArray(width * height);
  let p = 0;
  let w = 0;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      gray[p++] = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
      w += 4;
    }
  }
  return gray;
};

/**
 * Histogram equalization (in-place or into dst).
 */
export const equalizeHistogram = (
  src: Uint8ClampedArray | number[],
  step = 5,
  dst?: number[]
): number[] => {
  const srcLength = src.length;
  const out = dst ?? new Array(srcLength);
  const hist = Array(256).fill(0);

  for (let i = 0; i < srcLength; i += step) {
    ++hist[src[i]];
  }

  const norm = (255 * step) / srcLength;
  let prev = 0;
  for (let i = 0; i < 256; ++i) {
    let h = hist[i];
    prev = h += prev;
    hist[i] = h * norm;
  }

  for (let i = 0; i < srcLength; ++i) {
    out[i] = hist[src[i]];
  }
  return out;
};

/**
 * Resize an eye patch to a fixed resolution for ridge features.
 */
export const resizeEye = (eye: Eye, resizeWidth: number, resizeHeight: number): ImageData => {
  if (!eye.patch) throw new Error('Eye patch is required for resizeEye');
  const canvas = document.createElement('canvas');
  canvas.width = eye.width;
  canvas.height = eye.height;
  canvas.getContext('2d', { willReadFrequently: true })!.putImageData(eye.patch, 0, 0);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = resizeWidth;
  tempCanvas.height = resizeHeight;
  tempCanvas.getContext('2d')!.drawImage(
    canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight
  );
  return tempCanvas.getContext('2d')!.getImageData(0, 0, resizeWidth, resizeHeight);
};

/**
 * Classic WebGazer ridge features: equalized grayscale histogram of resized eye patches.
 */
export const getEyeFeats = (
  eyes: { left: Eye; right: Eye },
  trackEye: 'left' | 'right' | 'both' = 'both'
): number[] => {
  const process = (eye: Eye): number[] => {
    const resized = resizeEye(eye, EYE_FEAT_WIDTH, EYE_FEAT_HEIGHT);
    const gray = grayscale(resized.data, resized.width, resized.height);
    const hist: number[] = [];
    equalizeHistogram(gray, 5, hist);
    return hist;
  };

  if (trackEye === 'left') return process(eyes.left);
  if (trackEye === 'right') return process(eyes.right);
  return process(eyes.left).concat(process(eyes.right));
};

/**
 * Checks if the prediction is within the boundaries of the viewport and constrains it
 * @param prediction predicted gaze coordinates
 * @return constrained coordinates
 */
export const bound = (prediction: Point): Point => {
  if (prediction.x < 0) prediction.x = 0;
  if (prediction.y < 0) prediction.y = 0;
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  if (prediction.x > w) prediction.x = w;
  if (prediction.y > h) prediction.y = h;
  return prediction;
};

export class DebugBox {
  buttons: Record<string, HTMLButtonElement> = {};
  canvas: Record<string, HTMLCanvasElement> = {};
  stats: Record<string, any> = {};
  para: HTMLParagraphElement = document.createElement('p');
  div: HTMLDivElement = document.createElement('div');

  /**
   * Constructor of DebugBox object,
   * it insert an paragraph inside a div to the body, in view to display debug data
   * @param interval - The log interval
   */
  constructor (interval?: number) {
    this.div.appendChild(this.para);
    document.body.appendChild(this.div);

    const updateInterval = interval || 300;

    setInterval(() => {
      this.para.innerText = Object.entries(this.stats).map(([key, value]) => `${key}: ${value}`).join('\n');
    }, updateInterval);
  }

  /**
   * Add stat data for log
   * @param key - The data key
   * @param value - The value
   */
  set = (key: string, value: any): void => {
    this.stats[key] = value;
  };

  /**
   * Initialize stats in case where key does not exist, else
   * increment value for key
   * @param key - The key to process
   * @param incBy - Value to increment for given key (default: 1)
   * @param init - Initial value in case where key does not exist (default: 0)
   */
  inc = (key: string, incBy?: number, init?: number): void => {
    if (!this.stats[key]) this.stats[key] = init || 0;
    this.stats[key] += incBy || 1;
  };

  /**
   * Create a button and register the given function to the button click event
   * @param name - The button name to link
   * @param func - The onClick callback
   */
  addButton = (name: string, func: (event: MouseEvent) => void): void => {
    if (!this.buttons[name]) {
      this.buttons[name] = document.createElement('button');
      this.div.appendChild(this.buttons[name]);
    }
    const button = this.buttons[name];
    this.buttons[name] = button;
    button.addEventListener('click', func);
    button.innerText = name;
  };

  /**
   * Search for a canvas element with name, or create on if not exist.
   * Then send the canvas element as callback parameter.
   * @param name - The canvas name to send/create
   * @param func - The callback function where send canvas
   */
  show = (name: string, func: (canvas: HTMLCanvasElement) => void): void => {
    if (!this.canvas[name]) {
      this.canvas[name] = document.createElement('canvas');
      this.div.appendChild(this.canvas[name]);
    }
    const canvas = this.canvas[name];
    const context2D = canvas.getContext('2d');
    if (context2D) context2D.clearRect(0, 0, canvas.width, canvas.height);
    func(canvas);
  };
}

export class KalmanFilter {
  F: Matrix;
  Q: Matrix;
  H: Matrix;
  R: Matrix;
  P: Matrix;
  X: Matrix;

  /**
   * Kalman Filter constructor
   * Kalman filters work by reducing the amount of noise in a models.
   * https://blog.cordiner.net/2011/05/03/object-tracking-using-a-kalman-filter-matlab/
   * @param F - transition matrix
   * @param Q - process noise matrix
   * @param H - maps between measurement vector and noise matrix
   * @param R - defines measurement error of the device
   * @param pInitial - the initial state
   * @param xInitial - the initial state of the device
   */
  constructor (
    F: Matrix,
    H: Matrix,
    Q: Matrix,
    R: Matrix,
    pInitial: Matrix,
    xInitial: Matrix
  ) {
    this.F = F; // State transition matrix
    this.Q = Q; // Process noise matrix
    this.H = H; // Transformation matrix
    this.R = R; // Measurement Noise
    this.P = pInitial; // Initial covariance matrix
    this.X = xInitial; // Initial guess of measurement
  }

  /**
   * Get Kalman next filtered value and update the internal state
   * @param z - the new measurement
   * @return
   */
  update = (z: [number, number]): [number, number] => {
    // TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    const xP = mult(this.F, this.X); // Update state vector
    const pP = add(mult(mult(this.F, this.P), transpose(this.F)), this.Q); // Predicted covaraince

    // Calculate the update values
    const innovation = sub(transpose([z]), mult(this.H, xP)); // This is the measurement error (between what we expect and the actual value)
    const yColumn: Matrix = innovation.map(row => [row[0]]); // Ensure y is a proper column vector
    const S = add(mult(mult(this.H, pP), transpose(this.H)), this.R); // This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    const K = mult(pP, mult(transpose(this.H), inv(S))); // This is the Optimal Kalman Gain

    // Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(xP, mult(K, yColumn));
    this.P = mult(sub(identity(K.length), mult(K, this.H)), pP);
    const [x, y] = transpose(mult(this.H, this.X))[0]; // Transforms the predicted state back into it's measurement form
    return [x, y];
  };
}
