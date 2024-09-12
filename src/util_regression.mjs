// @ts-check
import params from './params.mjs'
import { identity, mult, multScalar, solve, transpose } from './worker_scripts/mat'
import { DataWindow, KalmanFilter, getEyeFeats } from './worker_scripts/util'

/**
 * Performs ridge regression, according to the Weka code.
 * @param {number[][]} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {number[][]} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {number} k - ridge parameter
 * @return {number[]} regression coefficients
 */
export const ridge = (y, X, k) => {
  const nc = X[0].length
  const mCoefficients = /** @type {number[]} */(new Array(nc))
  const xt = transpose(X)
  let solution = []
  let success = true
  const result = []
  do {
    const ss = mult(xt, X)
    // Set ridge regression adjustment
    for (let i = 0; i < nc; i++) {
      ss[i][i] = ss[i][i] + k
    }

    // Carry out the regression
    const bb = mult(xt, y)
    for (let i = 0; i < nc; i++) {
      mCoefficients[i] = bb[i][0]
    }
    try {
      const n = (mCoefficients.length !== 0 ? mCoefficients.length / mCoefficients.length : 0)
      if (mCoefficients.length * n !== mCoefficients.length) {
        console.log('Array length must be a multiple of m')
      }
      solution = solve(ss, bb)

      for (let i = 0; i < nc; i++) {
        // Should it be solution[i][i] or solution[i][0]
        result[i] = solution[i][0]
      }
      success = true
    } catch (ex) {
      k *= 10
      console.log(ex)
      success = false
    }
  } while (!success)
  return result
}

/**
 * @typedef {Object} DataSet
 * @property {import('./facemesh.mjs').TwoEyes} eyes eyes where extract data to add
 * @property {[number, number]} screenPos The current screen point
 * @property {'click' | 'move' | 'blink'} type The type of performed action
 */

const dataWindow = 700
const trailDataWindow = 10

export class Ridge {
  /**
   * The RidgeReg object name
   * @type {string}
   */
  name = 'ridge'

  ridgeParameter = Math.pow(10, -5)
  trailTime = 1000
  trailDataWindow = this.trailTime / params.moveTickSize

  /** @type {DataWindow<number[]>} */
  screenXClicksArray = new DataWindow(dataWindow)
  /** @type {DataWindow<number[]>} */
  screenYClicksArray = new DataWindow(dataWindow)
  /** @type {DataWindow<number[]>} */
  eyeFeaturesClicks = new DataWindow(dataWindow)

  // sets to one second worth of cursor trail
  /** @type {DataWindow<number[]>} */
  screenXTrailArray = new DataWindow(trailDataWindow)
  /** @type {DataWindow<number[]>} */
  screenYTrailArray = new DataWindow(trailDataWindow)
  /** @type {DataWindow<number[]>} */
  eyeFeaturesTrail = new DataWindow(trailDataWindow)
  /** @type {DataWindow<number>} */
  trailTimes = new DataWindow(trailDataWindow)

  /** @type {DataWindow<DataSet>} */
  dataClicks = new DataWindow(dataWindow)
  /** @type {DataWindow<DataSet>} */
  dataTrail = new DataWindow(trailDataWindow)

  /** @type {KalmanFilter} */
  kalman
  /**
   * Constructor of RidgeReg object,
   * this object allow to perform ridge regression
   * @constructor
   */
  constructor () {
    // Not used anywhere
    // this.errorXArray = new DataWindow(dataWindow)
    // this.errorYArray = new DataWindow(dataWindow)

    // Initialize Kalman filter [20200608 xk] what do we do about parameters?
    // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least
    // by my own anecdotal observation a 4x1 x vector seems to work alright
    const F = [[1, 0, 1, 0],
      [0, 1, 0, 1],
      [0, 0, 1, 0],
      [0, 0, 0, 1]]

    // Parameters Q and R may require some fine tuning
    let Q = [[1 / 4, 0, 1 / 2, 0],
      [0, 1 / 4, 0, 1 / 2],
      [1 / 2, 0, 1, 0],
      [0, 1 / 2, 0, 1]]// * delta_t
    const deltaT = 1 / 10 // The amount of time between frames
    Q = multScalar(Q, deltaT)

    const H = [[1, 0, 0, 0],
      [0, 1, 0, 0]]
    const pixelError = 47 // We will need to fine tune this value [20200611 xk] I just put a random value here

    // This matrix represents the expected measurement error
    const R = multScalar(identity(2), pixelError)

    const PInitial = multScalar(identity(4), 0.0001) // Initial covariance matrix
    const xInitial = [[500], [500], [0], [0]] // Initial measurement matrix

    this.kalman = new KalmanFilter(F, H, Q, R, PInitial, xInitial)
  }

  // This is not being used anywhere...?
  // getCurrentFixationIndex = () => {
  //   const recentX = this.screenXTrailArray.get(0)
  //   const recentY = this.screenYTrailArray.get(0)
  //   let i
  //   for (i = this.screenXTrailArray.length - 1; i >= 0; i--) {
  //     const currX = this.screenXTrailArray.get(i)
  //     const currY = this.screenYTrailArray.get(i)
  //     const euclideanDistance = Math.sqrt(Math.pow((currX - recentX), 2) + Math.pow((currY - recentY), 2))
  //     if (euclideanDistance > 72) {
  //       return i + 1
  //     }
  //   }
  //   return i
  // }

  /**
   * Add given data to current data set then,
   * replace current data member with given data
   * @param {DataSet[]} data - The data to set
   */
  setData = (data) => {
    for (let i = 0; i < data.length; i++) {
      // Clone data array
      const leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data)
      const rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data)
      // Duplicate ImageData object
      data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height)
      data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height)

      // Add those data objects to model
      this.addData(data[i])
    }
  }

  /**
   * Data to be added
   * @param {DataSet} data
   * @returns {void}
   */
  addData = data => {
    const { eyes, screenPos, type } = data
    if (!eyes) return

    // not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    if (type === 'click') {
      this.screenXClicksArray.push([screenPos[0]])
      this.screenYClicksArray.push([screenPos[1]])
      this.eyeFeaturesClicks.push(getEyeFeats(eyes))
      this.dataClicks.push({ eyes, screenPos, type })
    } else if (type === 'move') {
      this.screenXTrailArray.push([screenPos[0]])
      this.screenYTrailArray.push([screenPos[1]])

      this.eyeFeaturesTrail.push(getEyeFeats(eyes))
      this.trailTimes.push(performance.now())
      this.dataTrail.push({ eyes, screenPos, type })
    }

    // [20180730 JT] Why do we do this? It doesn't return anything...
    // But as JS is pass by reference, it still affects it.
    //
    // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
    // eyes.left.patch = Array.from(eyes.left.patch.data);
    // eyes.right.patch = Array.from(eyes.right.patch.data);
  }

  /**
   * Return the data
   * @returns {DataSet[]}
   */
  getData = () => {
    return this.dataClicks.data
  }
}
