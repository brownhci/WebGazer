// @ts-check
'use strict'

import { ridge } from './util_regression.mjs'
import { DataWindow } from './worker_scripts/util'

console.log('thread starting')

const trainInterval = 500
const ridgeParameter = Math.pow(10, -5)
const dataWindow = 700
const trailDataWindow = 10

let needsTraining = false

const screenXClicksArray = new DataWindow(dataWindow)
const screenYClicksArray = new DataWindow(dataWindow)
const eyeFeaturesClicks = new DataWindow(dataWindow)
const screenXTrailArray = new DataWindow(trailDataWindow)
const screenYTrailArray = new DataWindow(trailDataWindow)
const eyeFeaturesTrail = new DataWindow(trailDataWindow)
const dataTrail = new DataWindow(trailDataWindow)

/**
 * @typedef {Omit<import("./util_regression.mjs").DataSet, 'eyes'> & {eyes: Uint8ClampedArray}} EyeData
 * @property {Uint8ClampedArray} eyes
 */

/**
 * Event handler, it store screen position to allow training
 * @param {MessageEvent<EyeData>} event - the receive event
 */
self.onmessage = function (event) {
  const data = event.data
  const screenPos = data.screenPos
  const eyes = data.eyes
  const type = data.type
  if (type === 'click') {
    screenXClicksArray.push([screenPos[0]])
    screenYClicksArray.push([screenPos[1]])

    eyeFeaturesClicks.push(eyes)
  } else if (type === 'move') {
    screenXTrailArray.push([screenPos[0]])
    screenYTrailArray.push([screenPos[1]])

    eyeFeaturesTrail.push(eyes)
    dataTrail.push({ eyes, screenPos, type })
  }
  needsTraining = true
}

/**
 * Compute coefficient from training data
 */
function retrain () {
  if (screenXClicksArray.length === 0) return
  if (!needsTraining) return
  const screenXArray = screenXClicksArray.data.concat(screenXTrailArray.data)
  const screenYArray = screenYClicksArray.data.concat(screenYTrailArray.data)
  const eyeFeatures = eyeFeaturesClicks.data.concat(eyeFeaturesTrail.data)

  const coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter)
  const coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter)
  self.postMessage(/** @type {import('./ridgeRegThreaded.mjs').Weights} */({ X: coefficientsX, Y: coefficientsY }))
  needsTraining = false
}

setInterval(retrain, trainInterval)
