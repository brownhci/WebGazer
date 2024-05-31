// @ts-check
'use strict'

import params from '../params.mjs'
import { add, identity, inv, mult, sub, transpose } from './mat'

const resizeWidth = 10
const resizeHeight = 6

/**
 * @typedef {Object} Point
 * @property {number} x x coordinate
 * @property {number} y y coordinate
 */

/**
 * @typedef {[[number, number], number]} Pupil
 */

/**
 * @typedef {Object} Eye represents an eye patch detected in the video stream
 * @property {ImageData} patch the image data corresponding to an eye
 * @property {number} imagex x-axis offset from the top-left corner of the video canvas
 * @property {number} imagey y-axis offset from the top-left corner of the video canvas
 * @property {number} width width of the eye patch
 * @property {number} height height of the eye patch
 * @property {boolean=} blink is the eye closed
 * @property {Pupil=} pupil coordinate of the bottom right corner and width of the best fitted pupil
 */

// Data Window class
/**
 * @template T
 * @class
 */
export class DataWindow {
  // operates like an array but 'wraps' data around to keep the array at a fixed windowSize
  /**
   * DataWindow class - Operates like an array, but 'wraps' data around to keep the array at a fixed windowSize
   * @param {number} windowSize - defines the maximum size of the window
   * @param {Array<T>} data - optional data to seed the DataWindow with
  **/
  constructor (windowSize, data = []) {
    this.windowSize = windowSize
    this.index = 0
    this.data = data.slice(data.length - windowSize, data.length)
    this.length = this.data.length
  }

  /**
   * [push description]
   * @param  {T} entry - item to be inserted. It either grows the DataWindow or replaces the oldest item
   * @return {DataWindow} this
   */
  push = entry => {
    if (this.data.length < this.windowSize) {
      this.data.push(entry)
      this.length = this.data.length
      return this
    }

    // replace oldest entry by wrapping around the DataWindow
    this.data[this.index] = entry
    this.index = (this.index + 1) % this.windowSize
    return this
  }

  /**
   * Get the element at the ind position by wrapping around the DataWindow
   * @param  {number} ind index of desired entry
   * @return {T}
   */
  get = ind => {
    return this.data[this.getTrueIndex(ind)]
  }

  /**
   * Gets the true this.data array index given an index for a desired element
   * @param {number} ind - index of desired entry
   * @return {number} index of desired entry in this.data
   */
  getTrueIndex = ind => {
    if (this.data.length < this.windowSize) {
      return ind
    } else {
      // wrap around ind so that we can traverse from oldest to newest
      return (ind + this.index) % this.windowSize
    }
  }

  /**
   * Append all the contents of data
   * @param {T[]} data - to be inserted
   */
  addAll = data => {
    for (let i = 0; i < data.length; i++) {
      this.push(data[i])
    }
  }
}

/**
 * Compute eyes size as gray histogram
 * @param {import('../facemesh.mjs').TwoEyes} eyes - The eyes where looking for gray histogram
 * @returns {Uint8ClampedArray} The eyes gray level histogram
 */
export const getEyeFeats = eyes => {
  const process = (eye) => {
    const resized = resizeEye(eye, resizeWidth, resizeHeight)
    const gray = grayscale(resized.data, resized.width, resized.height)
    const hist = new Uint8ClampedArray()
    equalizeHistogram(gray, 5, hist)
    return hist
  }

  if (params.trackEye === 'left') {
    return process(eyes.left)
  } else if (params.trackEye === 'right') {
    return process(eyes.right)
  } else {
    return Uint8ClampedArray.from([...process(eyes.left), ...process(eyes.right)])
  }
}

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
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
   * IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
   * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *
   * @param  {Uint8ClampedArray} pixels - image data to be grayscaled
   * @param  {number} width  - width of image data to be grayscaled
   * @param  {number} height - height of image data to be grayscaled
   * @return {Uint8ClampedArray} grayscaledImage
   */
export const grayscale = (pixels, width, height) => {
  const gray = new Uint8ClampedArray(pixels.length >> 2)
  let p = 0
  let w = 0
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114
      gray[p++] = value

      w += 4
    }
  }
  return gray
}

/**
 * Increase contrast of an image.
 *
 * Code from Martin Tschirsich, Copyright (c) 2012.
 * https://github.com/mtschirs/js-objectdetect/blob/gh-pages/js/objectdetect.js
 *
 * @param {Uint8ClampedArray} src - grayscale integer array
 * @param {number} step - sampling rate, control performance
 * @param {Uint8ClampedArray} dst - array to hold the resulting image
 */
const equalizeHistogram = (src, step, dst) => {
  const srcLength = src.length
  if (!dst) dst = src
  if (!step) step = 5

  // Compute histogram and histogram sum:
  const hist = /** @type {number[]} */(Array(256).fill(0))

  for (let i = 0; i < srcLength; i += step) {
    ++hist[src[i]]
  }

  // Compute integral histogram:
  const norm = 255 * step / srcLength
  let prev = 0
  for (let i = 0; i < 256; ++i) {
    let h = hist[i]
    prev = h += prev
    hist[i] = h * norm // For non-integer src: ~~(h * norm + 0.5);
  }

  // Equalize image:
  for (let i = 0; i < srcLength; ++i) {
    dst[i] = hist[src[i]]
  }
  return dst
}

/**
 * Set all values above the provided threshold to 255, set the other values to 0
 * @param {number[]} data The list of numbers to split
 * @param {number} threshold The threshold value
 * @returns {(255|0)[]} the list of 255/0 values
 */
export const threshold = (data, threshold) => {
  for (let i = 0; i < data.length; i++) {
    data[i] = (data[i] > threshold) ? 255 : 0
  }
  return /** @type {(255|0)[]} **/(data)
}

/**
 * Evaluate the similarities between 2 list of data
 * (should we use levenstein algorithme for more accurate results?)
 * @param {number[]} data1 The first list
 * @param {number[]} data2 The second list
 * @returns {number} The ratio of similarities (between 0 and 1)
 */
export const correlation = (data1, data2) => {
  const length = Math.min(data1.length, data2.length)
  let count = 0
  for (let i = 0; i < length; i++) {
    if (data1[i] === data2[i]) {
      count++
    }
  }
  return count / Math.max(data1.length, data2.length)
}

/**
 * Gets an Eye object and resizes it to the desired resolution
 * @param  {Eye} eye - patch to be resized
 * @param  {number} resizeWidth - desired width
 * @param  {number} resizeHeight - desired height
 * @return {ImageData} resized eye patch
 */
export const resizeEye = (eye, resizeWidth, resizeHeight) => {
  const canvas = document.createElement('canvas')
  canvas.width = eye.width
  canvas.height = eye.height
  let context2D = canvas.getContext('2d')
  if (!context2D) return eye.patch // Theoretically impossible
  context2D.putImageData(eye.patch, 0, 0)

  const tempCanvas = document.createElement('canvas')

  tempCanvas.width = resizeWidth
  tempCanvas.height = resizeHeight

  // save the canvas into temp canvas
  context2D = canvas.getContext('2d')
  if (!context2D) return eye.patch // Theoretically impossible
  context2D.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight)

  return context2D.getImageData(0, 0, resizeWidth, resizeHeight)
}

/**
 * Checks if the prediction is within the boundaries of the viewport and constrains it
 * @param  {Point} prediction predicted gaze coordinates
 * @return {Point} constrained coordinates
 */
export const bound = (prediction) => {
  if (prediction.x < 0) prediction.x = 0
  if (prediction.y < 0) prediction.y = 0
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
  if (prediction.x > w) prediction.x = w
  if (prediction.y > h) prediction.y = h
  return prediction
}

export class DebugBox {
  /** @type {Record<String, HTMLButtonElement>} */
  buttons = {}
  /** @type {Record<String, HTMLCanvasElement>} */
  canvas = {}
  /** @type {Record<String, any>} */
  stats = {}
  /** @type {HTMLParagraphElement} */
  para = document.createElement('p')
  /** @type {HTMLDivElement} */
  div = document.createElement('div')

  /**
 * Constructor of DebugBox object,
 * it insert an paragraph inside a div to the body, in view to display debug data
 * @constructor
 * @param {number} interval - The log interval
 */
  constructor (interval) {
    this.div.appendChild(this.para)
    document.body.appendChild(this.div)

    const updateInterval = interval || 300

    setInterval(() => {
      this.para.innerText = Object.entries(this.stats).map(([key, value]) => `${key}: ${value}`).join('\n')
    }, updateInterval)
  }

  /**
   * Add stat data for log
   * @param {string} key - The data key
   * @param {*} value - The value
   */
  set = (key, value) => {
    this.stats[key] = value
  }

  /**
   * Initialize stats in case where key does not exist, else
   * increment value for key
   * @param {string} key - The key to process
   * @param {number} incBy - Value to increment for given key (default: 1)
   * @param {number} init - Initial value in case where key does not exist (default: 0)
   */
  inc = (key, incBy, init) => {
    if (!this.stats[key]) this.stats[key] = init || 0
    this.stats[key] += incBy || 1
  }

  /**
   * Create a button and register the given function to the button click event
   * @param {string} name - The button name to link
   * @param {(event: MouseEvent) => void} func - The onClick callback
   */
  addButton = (name, func) => {
    if (!this.buttons[name]) {
      this.buttons[name] = document.createElement('button')
      this.div.appendChild(this.buttons[name])
    }
    const button = this.buttons[name]
    this.buttons[name] = button
    button.addEventListener('click', func)
    button.innerText = name
  }

  /**
   * Search for a canvas element with name, or create on if not exist.
   * Then send the canvas element as callback parameter.
   * @param {string} name - The canvas name to send/create
   * @param {(canvas: HTMLCanvasElement) => void} func - The callback function where send canvas
   */
  show = (name, func) => {
    if (!this.canvas[name]) {
      this.canvas[name] = document.createElement('canvas')
      this.div.appendChild(this.canvas[name])
    }
    const canvas = this.canvas[name]
    const context2D = canvas.getContext('2d')
    if (context2D) context2D.clearRect(0, 0, canvas.width, canvas.height)
    func(canvas)
  }
}

export class KalmanFilter {
  /** @type {number[][]} */
  F
  /** @type {number[][]} */
  Q
  /** @type {number[][]} */
  H
  /** @type {number[][]} */
  R
  /** @type {number[][]} */
  P
  /** @type {number[][]} */
  X
  /**
   * Kalman Filter constructor
   * Kalman filters work by reducing the amount of noise in a models.
   * https://blog.cordiner.net/2011/05/03/object-tracking-using-a-kalman-filter-matlab/
   * @constructor
   * @param {number[][]} F - transition matrix
   * @param {number[][]} Q - process noise matrix
   * @param {number[][]} H - maps between measurement vector and noise matrix
   * @param {number[][]} R - defines measurement error of the device
   * @param {number[][]} pInitial - the initial state
   * @param {number[][]} xInitial - the initial state of the device
   */
  constructor (F, H, Q, R, pInitial, xInitial) {
    this.F = F // State transition matrix
    this.Q = Q // Process noise matrix
    this.H = H // Transformation matrix
    this.R = R // Measurement Noise
    this.P = pInitial // Initial covariance matrix
    this.X = xInitial // Initial guess of measurement
  }

  /**
   * Get Kalman next filtered value and update the internal state
   * @param {number[]} z - the new measurement
   * @return {number[]}
   */
  update = (z) => {
    // TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    const xP = mult(this.F, this.X) // Update state vector
    const pP = add(mult(mult(this.F, this.P), transpose(this.F)), this.Q) // Predicted covaraince

    // Calculate the update values
    const transposedZ = transpose([z])
    const y = sub(transposedZ, mult(this.H, xP)) // This is the measurement error (between what we expect and the actual value)
    const S = add(mult(mult(this.H, pP), transpose(this.H)), this.R) // This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    const K = mult(pP, mult(transpose(this.H), inv(S))) // This is the Optimal Kalman Gain

    // We need to change Y into it's column vector form
    const line = y[0]
    for (let i = 0; i < y.length; i++) {
      y[i] = [line[i]]
    }

    // Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(xP, mult(K, y))
    this.P = mult(sub(identity(K.length), mult(K, this.H)), pP)
    return transpose(mult(this.H, this.X))[0] // Transforms the predicted state back into it's measurement form
  }
}
