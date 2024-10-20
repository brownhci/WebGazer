'use strict';

import { ridge } from './worker_scripts/regression';
import { DataWindow } from './worker_scripts/util';

console.log('thread starting');

const DATA_WINDOW_SIZE = 700;
const TRAIL_DATA_WINDOW_SIZE = 10;
const RIDGE_PARAMETER = Math.pow(10, -5);
const TRAIL_TIME = 1000;

let needsTraining = false;

const screenXClicksArray = new DataWindow<number[]>(DATA_WINDOW_SIZE);
const screenYClicksArray = new DataWindow<number[]>(DATA_WINDOW_SIZE);
const eyeFeaturesClicks = new DataWindow<number[]>(DATA_WINDOW_SIZE);
const screenXTrailArray = new DataWindow<number[]>(TRAIL_DATA_WINDOW_SIZE);
const screenYTrailArray = new DataWindow<number[]>(TRAIL_DATA_WINDOW_SIZE);
const eyeFeaturesTrail = new DataWindow<number[]>(TRAIL_DATA_WINDOW_SIZE);
const dataTrail = new DataWindow<{ eyes: number[], screenPos: number[], type: 'move' }>(TRAIL_DATA_WINDOW_SIZE);

export type EyeData = Omit<import('./worker_scripts/regression.js').DataSet, 'eyes'> & {
  eyes: number[];
  type: 'click' | 'move';
};

/**
 * Event handler, it store screen position to allow training
 * @param {MessageEvent<EyeData>} event - the receive event
 */
self.onmessage = function (event: MessageEvent<EyeData>) {
  const data = event.data;

  // Handle regular data messages
  const [x, y] = data.screenPos;
  const eyes = data.eyes;
  if (data.type === 'click') {
    screenXClicksArray.push([x]);
    screenYClicksArray.push([y]);

    eyeFeaturesClicks.push(eyes);
  } else if (data.type === 'move') {
    screenXTrailArray.push([x]);
    screenYTrailArray.push([y]);

    eyeFeaturesTrail.push(eyes);
    dataTrail.push({ eyes, screenPos: data.screenPos, type: 'move' });
  }
  needsTraining = true;
};

/**
 * Compute coefficient from training data
 */
const retrain = (): void => {
  if (screenXClicksArray.length === 0) return;
  if (!needsTraining) return;
  const screenXArray = screenXClicksArray.data.concat(screenXTrailArray.data);
  const screenYArray = screenYClicksArray.data.concat(screenYTrailArray.data);
  const eyeFeatures = eyeFeaturesClicks.data.concat(eyeFeaturesTrail.data);

  const coefficientsX = ridge(screenXArray, eyeFeatures, RIDGE_PARAMETER);
  const coefficientsY = ridge(screenYArray, eyeFeatures, RIDGE_PARAMETER);
  if (coefficientsX.find(isNaN)) console.log(coefficientsX, coefficientsY, screenXArray, screenYArray, eyeFeatures);
  self.postMessage({ X: coefficientsX, Y: coefficientsY } as import('./ridgeRegThreaded.js').Weights);
  needsTraining = false;
};

setInterval(retrain, TRAIL_TIME);
