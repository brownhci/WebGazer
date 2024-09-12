// @ts-check
import { Ridge, ridge } from './util_regression.mjs'
import params from './params.mjs'
import { getEyeFeats } from './worker_scripts/util'

export class RidgeReg extends Ridge {
  /**
   * Try to predict coordinates from pupil data
   * after apply linear regression on data set
   * @param {import('./facemesh.mjs').TwoEyes | undefined} eyesObj - The current user eyes object
   * @returns {{ x: number; y: number } | undefined}
   */
  predict = eyesObj => {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) return
    const acceptTime = performance.now() - this.trailTime
    /** @type {number[][]} */
    const trailX = []
    /** @type {number[][]} */
    const trailY = []
    /** @type {number[][]} */
    const trailFeat = []
    for (let i = 0; i < this.trailDataWindow; i++) {
      if (this.trailTimes.get(i) > acceptTime) {
        trailX.push(this.screenXTrailArray.get(i))
        trailY.push(this.screenYTrailArray.get(i))
        trailFeat.push(this.eyeFeaturesTrail.get(i))
      }
    }

    const screenXArray = this.screenXClicksArray.data.concat(trailX)
    const screenYArray = this.screenYClicksArray.data.concat(trailY)
    const eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat)

    const coefficientsX = ridge(screenXArray, eyeFeatures, this.ridgeParameter)
    const coefficientsY = ridge(screenYArray, eyeFeatures, this.ridgeParameter)

    const eyeFeats = getEyeFeats(eyesObj)
    let predictedX = 0
    for (let i = 0; i < eyeFeats.length; i++) {
      predictedX += eyeFeats[i] * coefficientsX[i]
    }
    let predictedY = 0
    for (let i = 0; i < eyeFeats.length; i++) {
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
