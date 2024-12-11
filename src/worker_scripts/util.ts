'use strict';

import { add, identity, inv, Matrix, mult, sub, transpose } from './mat';

// Replace magic numbers with named constants
const RESIZE_WIDTH = 10;
const RESIZE_HEIGHT = 6;
const EQUALIZE_STEP = 5;
const GRAYSCALE_RED_FACTOR = 0.299;
const GRAYSCALE_GREEN_FACTOR = 0.587;
const GRAYSCALE_BLUE_FACTOR = 0.114;

export interface Point {
  x: number;
  y: number;
}

export type Pupil = [[number, number], number];

export interface Eye {
  patch: ImageData;
  imagex: number;
  imagey: number;
  width: number;
  height: number;
  blink?: boolean;
  pupil?: Pupil;
}

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

interface TwoEyes {
  left: Eye;
  right: Eye;
}

/**
 * Compute eyes size as gray histogram
 * @param eyes - The eyes where looking for gray histogram
 * @returns The eyes gray level histogram
 */
export const getEyeFeats = (eyes: TwoEyes, trackEye: 'left' | 'right' | 'both'): number[] => {
  /**
   * Process an eye and return its gray level histogram
   * @param eye - The eye to be processed
   * @returns The gray level histogram of the eye
   */
  const process = (eye: Eye): number[] => {
    const resized = resizeEye(eye, RESIZE_WIDTH, RESIZE_HEIGHT);
    const gray = grayscale(resized.data, resized.width, resized.height);
    const hist: number[] = [];
    equalizeHistogram(gray, EQUALIZE_STEP, hist);
    return hist;
  };

  if (trackEye === 'left') {
    return process(eyes.left);
  } else if (trackEye === 'right') {
    return process(eyes.right);
  } else {
    let ret: number[] = [];
    ret = ret.concat(process(eyes.left), process(eyes.right));
    return ret;
  }
};

// Helper functions
/**
   * Grayscales an image patch. Can be used for the whole canvas, detected face, detected eye, etc.
   *
   * Code from tracking.js by Eduardo Lundgren, et al.
   * https://github.com/eduardolundgren/tracking.js/blob/master/src/tracking.js
   *
   * Software License Agreement (BSD License) Copyright (c) 2014, Eduardo A. Lundgren Melo. All rights reserved.
   * Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
   * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
   * The name of Eduardo A. Lundgren Melo may not be used to endorse or promote products derived from this software without specific prior written permission of Eduardo A. Lundgren Melo.
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
   * IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
   * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *
   * @param pixels - image data to be grayscaled
   * @param width  - width of image data to be grayscaled
   * @param height - height of image data to be grayscaled
   * @return grayscaledImage
   */
export const grayscale = (pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const gray = new Uint8ClampedArray(pixels.length >> 2);
  let p = 0;
  let w = 0;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const value = pixels[w] * GRAYSCALE_RED_FACTOR +
                    pixels[w + 1] * GRAYSCALE_GREEN_FACTOR +
                    pixels[w + 2] * GRAYSCALE_BLUE_FACTOR;
      gray[p++] = value;

      w += 4;
    }
  }
  return gray;
};

/**
 * Increase contrast of an image.
 *
 * Code from Martin Tschirsich, Copyright (c) 2012.
 * https://github.com/mtschirs/js-objectdetect/blob/gh-pages/js/objectdetect.js
 *
 * @param src - grayscale integer array
 * @param step - sampling rate, control performance
 * @param dst - array to hold the resulting image
 */
const equalizeHistogram = (src: Uint8ClampedArray, step: number, dst: number[]): number[] => {
  const srcLength = src.length;
  if (!dst) dst = Array.from(src);
  if (!step) step = 5;

  // Compute histogram and histogram sum:
  const hist: number[] = Array(256).fill(0);

  for (let i = 0; i < srcLength; i += step) {
    ++hist[src[i]];
  }

  // Compute integral histogram:
  const norm = 255 * step / srcLength;
  let prev = 0;
  for (let i = 0; i < 256; ++i) {
    let h = hist[i];
    prev = h += prev;
    hist[i] = h * norm;
  }

  // Equalize image:
  for (let i = 0; i < srcLength; ++i) {
    dst[i] = hist[src[i]];
  }
  return dst;
};

/**
 * Evaluate the similarities between 2 list of data
 * (should we use levenstein algorithme for more accurate results?)
 * @param data1 The first list
 * @param data2 The second list
 * @returns The ratio of similarities (between 0 and 1)
 */
export const correlation = (data1: number[], data2: number[]): number => {
  const length = Math.min(data1.length, data2.length);
  let count = 0;
  for (let i = 0; i < length; i++) {
    if (data1[i] === data2[i]) {
      count++;
    }
  }
  return count / Math.max(data1.length, data2.length);
};

let resizeCanvas: OffscreenCanvas;
let resizeContext: OffscreenCanvasRenderingContext2D | null;

let tempCanvas: OffscreenCanvas;
let tempContext: OffscreenCanvasRenderingContext2D | null;

/**
 * Gets an Eye object and resizes it to the desired resolution
 * @param eye - patch to be resized
 * @param resizeWidth - desired width
 * @param resizeHeight - desired height
 * @return resized eye patch
 */
const resizeEye = (eye: Eye, resizeWidth: number, resizeHeight: number): ImageData => {
  // Create canvas only once and reuse
  if (!resizeCanvas) {
    resizeCanvas = new OffscreenCanvas(resizeWidth, resizeHeight);
    resizeContext = resizeCanvas.getContext('2d');
  }
  if (!tempCanvas) {
    tempCanvas = new OffscreenCanvas(eye.width, eye.height);
    tempContext = tempCanvas.getContext('2d');
  }

  // Ensure canvas is correct size
  if (resizeCanvas.width !== resizeWidth || resizeCanvas.height !== resizeHeight) {
    resizeCanvas.width = resizeWidth;
    resizeCanvas.height = resizeHeight;
  }
  if (tempCanvas.width !== eye.width || tempCanvas.height !== eye.height) {
    tempCanvas.width = eye.width;
    tempCanvas.height = eye.height;
  }

  if (!resizeContext || !tempContext) return eye.patch; // Theoretically impossible

  // Put the eye patch data onto the temporary canvas
  tempContext.putImageData(eye.patch, 0, 0);

  // Clear the resize canvas and draw the resized image
  resizeContext.clearRect(0, 0, resizeWidth, resizeHeight);
  resizeContext.drawImage(tempCanvas, 0, 0, eye.width, eye.height, 0, 0, resizeWidth, resizeHeight);

  return resizeContext.getImageData(0, 0, resizeWidth, resizeHeight);
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
