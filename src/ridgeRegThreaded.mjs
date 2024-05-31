// @ts-check
import params from './params.mjs'
import { Ridge } from './util_regression.mjs'
import { getEyeFeats } from './worker_scripts/util'

/**
 * @typedef {Object} Weights
 * @property {number[]} X
 * @property {number[]} Y
 */

export class RidgeRegThreaded extends Ridge {
  /**
   * The RidgeWeightedReg object name
   * @type {string}
   */
  name = 'ridgeThreaded'

  /** @type {Weights} */
  weights = { X: [0], Y: [0] }
  /** @type {Worker} */
  worker
  /**
   * Constructor of RidgeRegThreaded object,
   * it retrieve data window, and prepare a worker,
   * this object allow to perform threaded ridge regression
   * @constructor
   */
  constructor () {
    super()

    // Place the src/ridgeworker.js file into the same directory as your html file.
    if (!this.worker) {
      this.worker = new Worker('ridgeWorker.worker.mjs', { type: 'module' }) // [20200708] TODO: Figure out how to make this inline
      this.worker.onerror = err => console.log(err.message)
      this.worker.onmessage = /** @type {(evt: MessageEvent<Weights>) => void} */evt => {
        this.weights.X = evt.data.X
        this.weights.Y = evt.data.Y
      }
      console.log('initialized worker')
    }
  }

  /**
   * Data to be added
   * @param {import('./util_regression.mjs').DataSet} data
   * @returns
   */
  addData = data => {
    const { eyes, screenPos, type } = data
    if (!eyes) return
    if (type === 'click') this.dataClicks.push(data)
    this.worker.postMessage(/** @type {import('./ridgeWorker.worker.mjs').EyeData} */({ eyes: getEyeFeats(eyes), screenPos, type }))
  }

  /**
   * Return the data
   * @returns {import('./util_regression.mjs').DataSet[]}
   */
  getData = () => {
    return this.dataClicks.data
  }

  /**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {import('./facemesh.mjs').TwoEyes | undefined} eyesObj - The current user eyes object
 * @returns {import('./worker_scripts/util').Point | undefined}
 */
  predict = eyesObj => {
    // console.log('LOGGING..');
    if (!eyesObj) return
    const coefficientsX = this.weights.X
    const coefficientsY = this.weights.Y

    const eyeFeats = getEyeFeats(eyesObj)
    let predictedX = 0; let predictedY = 0
    for (let i = 0; i < eyeFeats.length; i++) {
      predictedX += eyeFeats[i] * coefficientsX[i]
      predictedY += eyeFeats[i] * coefficientsY[i]
    }

    predictedX = Math.floor(predictedX)
    predictedY = Math.floor(predictedY)

    if (params.applyKalmanFilter) {
      // Update Kalman model, and get prediction
      let newGaze = [predictedX, predictedY] // [20200607 xk] Should we use a 1x4 vector?
      newGaze = this.kalman.update(newGaze)

      return {
        x: newGaze[0],
        y: newGaze[1]
      }
    } else {
      return {
        x: predictedX,
        y: predictedY
      }
    }
  }
}
