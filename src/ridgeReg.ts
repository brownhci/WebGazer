import { Ridge, ridge } from './worker_scripts/regression';
import { getEyeFeats } from './worker_scripts/util';
import type { TwoEyes } from './facemesh';
import type { Matrix } from './worker_scripts/mat';

export class RidgeReg extends Ridge {
  /**
   * Try to predict coordinates from pupil data
   * after apply linear regression on data set
   * @param {TwoEyes | undefined} eyesObj - The current user eyes object
   * @returns {{ x: number; y: number } | undefined}
   */
  predict = (eyesObj: TwoEyes | undefined): { x: number; y: number } | undefined => {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) return;
    const acceptTime = performance.now() - this.trailTime;
    const trailX: Matrix = [];
    const trailY: Matrix = [];
    const trailFeat: Matrix = [];
    for (let i = 0; i < this.trailDataWindow; i++) {
      if (this.trailTimes.get(i) > acceptTime) {
        trailX.push(this.screenXTrailArray.get(i));
        trailY.push(this.screenYTrailArray.get(i));
        trailFeat.push(this.eyeFeaturesTrail.get(i));
      }
    }

    const screenXArray = this.screenXClicksArray.data.concat(trailX);
    const screenYArray = this.screenYClicksArray.data.concat(trailY);
    const eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);

    const coefficientsX = ridge(screenXArray, eyeFeatures, this.ridgeParameter);
    const coefficientsY = ridge(screenYArray, eyeFeatures, this.ridgeParameter);

    const eyeFeats = getEyeFeats(eyesObj, this.trackEye);
    let predictedX = 0;
    for (let i = 0; i < eyeFeats.length; i++) {
      predictedX += eyeFeats[i] * coefficientsX[i];
    }
    let predictedY = 0;
    for (let i = 0; i < eyeFeats.length; i++) {
      predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

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
}
