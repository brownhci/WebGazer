// @ts-check
import { Ridge, ridge } from './util_regression.mjs'
import params from './params.mjs'
import { getEyeFeats } from './worker_scripts/util'

export class RidgeWeightedReg extends Ridge {
  /**
   * The RidgeWeightedReg object name
   * @type {string}
   */
  name = 'ridgeWeighted'

  /**
   * Try to predict coordinates from pupil data
   * after apply linear regression on data set
   * @param {import('./facemesh.mjs').TwoEyes | undefined} eyesObj - The current user eyes object
   * @returns {import('./worker_scripts/util').Point | undefined}
   */
  predict = eyesObj => {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) return
    const acceptTime = performance.now() - this.trailTime
    const trailX = []
    const trailY = []
    const trailFeat = []
    for (let i = 0; i < this.trailDataWindow; i++) {
      if (this.trailTimes.get(i) > acceptTime) {
        trailX.push(this.screenXTrailArray.get(i))
        trailY.push(this.screenYTrailArray.get(i))
        trailFeat.push(this.eyeFeaturesTrail.get(i))
      }
    }

    const len = this.eyeFeaturesClicks.data.length
    const weightedEyeFeats = Array(len)
    const weightedXArray = Array(len)
    const weightedYArray = Array(len)
    for (let i = 0; i < len; i++) {
      const weight = Math.sqrt(1 / (len - i)) // access from oldest to newest so should start with low weight and increase steadily
      // abstraction is leaking...
      const trueIndex = this.eyeFeaturesClicks.getTrueIndex(i)
      for (let j = 0; j < this.eyeFeaturesClicks.data[trueIndex].length; j++) {
        const val = this.eyeFeaturesClicks.data[trueIndex][j] * weight
        if (weightedEyeFeats[trueIndex] !== undefined) {
          weightedEyeFeats[trueIndex].push(val)
        } else {
          weightedEyeFeats[trueIndex] = [val]
        }
      }
      weightedXArray[i] = this.screenXClicksArray.get(i).slice(0, this.screenXClicksArray.get(i).length)
      weightedYArray[i] = this.screenYClicksArray.get(i).slice(0, this.screenYClicksArray.get(i).length)
      weightedXArray[i][0] = weightedXArray[i][0] * weight
      weightedYArray[i][0] = weightedYArray[i][0] * weight
    }

    const screenXArray = weightedXArray.concat(trailX)
    const screenYArray = weightedYArray.concat(trailY)
    const eyeFeatures = weightedEyeFeats.concat(trailFeat)

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
