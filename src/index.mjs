// @ts-check
import '@tensorflow/tfjs'

import 'regression'
import './dom_util.mjs'
import localforage from 'localforage'
import { TFFaceMesh } from './facemesh.mjs'
import { RidgeReg } from './ridgeReg.mjs'
import { RidgeWeightedReg } from './ridgeWeightedReg.mjs'
import { RidgeRegThreaded } from './ridgeRegThreaded.mjs'
import params from './params.mjs'
import { DataWindow, bound } from './worker_scripts/util'

// PRIVATE VARIABLES

// video elements
/** @type {MediaStream} */
let videoStream
/** @type {HTMLDivElement} */
let videoContainerElement
/** @type {HTMLVideoElement} */
let videoElement
/** @type {HTMLCanvasElement} */
let videoElementCanvas
/** @type {HTMLCanvasElement} */
let faceOverlay
/** @type {HTMLCanvasElement} */
let faceFeedbackBox
/** @type {HTMLDivElement} */
let gazeDot
// Why is this not in webgazer.params ?
/** @type {MediaStream} */
let debugVideoLoc

/**
 * Initialises variables used to store accuracy eigenValues
 * This is used by the calibration example file
 * @type {number[]}
 */
const xPast50 = new Array(50)
/** @type {number[]} */
const yPast50 = new Array(50)

/**
 * @typedef {Object} PredictionResult
 * @property {number} x
 * @property {number} y
 * @property {import('./facemesh.mjs').TwoEyes=} eyeFeatures
 * @property {(import('./worker_scripts/util').Point | undefined)[]=} all
 */

// loop parameters
let clockStart = performance.now()
/** @type {import('./facemesh.mjs').TwoEyes | undefined} */
let latestEyeFeatures
/** @type {PredictionResult | undefined} */
let latestGazeData
let paused = false
// registered callback for loop
const nopCallback = () => { }
/** @type {(data: PredictionResult | undefined, elapsedTime: number) => void} */
let gazeListener = nopCallback

/**
 * Types that regression systems should handle
 * Describes the source of data so that regression systems may ignore or handle differently the various generating events
 * @type {('click' | 'move')[]}
 **/
const eventTypes = ['click', 'move']

// movelistener timeout clock parameters
let moveClock = performance.now()
// currently used tracker and regression models, defaults to clmtrackr and linear regression
let curTracker = new TFFaceMesh()
/** @type {(RidgeReg | RidgeWeightedReg | RidgeRegThreaded)[]} */
let regs = [new RidgeReg()]
// var blinkDetector = new webgazer.BlinkDetector();

// lookup tables
const curTrackerMap = {
  TFFacemesh: function () { return new TFFaceMesh() }
}
const regressionMap = {
  ridge: function () { return new RidgeReg() },
  ridgeWeighted: function () { return new RidgeWeightedReg() },
  ridgeThreaded: function () { return new RidgeRegThreaded() }
}

// localstorage name
const localstorageDataLabel = 'webgazerGlobalData'
const localstorageSettingsLabel = 'webgazerGlobalSettings'
// settings object for future storage of settings
let settings = {}
let data = []
const defaults = {
  data: [],
  settings: {}
}

export const clearAll = () => {
  removeMouseEventListeners()
  regs = []
}

// PRIVATE FUNCTIONS

/**
 * Computes the size of the face overlay validation box depending on the size of the video preview window.
 * @returns {[number, number, number, number]} The dimensions of the validation box as top, left, width, height.
 */
const computeValidationBoxSize = () => {
  const vw = videoElement.videoWidth
  const vh = videoElement.videoHeight
  const pw = parseInt(videoElement.style.width)
  const ph = parseInt(videoElement.style.height)

  // Find the size of the box.
  // Pick the smaller of the two video preview sizes
  const smaller = Math.min(vw, vh)
  const larger = Math.max(vw, vh)

  // Overall scalar
  const scalar = (vw === larger ? pw / vw : ph / vh)

  // Multiply this by 2/3, then adjust it to the size of the preview
  const boxSize = (smaller * params.faceFeedbackBoxRatio) * scalar

  // Set the boundaries of the face overlay validation box based on the preview
  const topVal = (ph - boxSize) / 2
  const leftVal = (pw - boxSize) / 2

  // top, left, width, height
  return [topVal, leftVal, boxSize, boxSize]
}

/**
 * Checks if the pupils are in the position box on the video
 */
function checkEyesInValidationBox () {
  if (faceFeedbackBox != null && latestEyeFeatures) {
    const w = videoElement.videoWidth
    const h = videoElement.videoHeight

    // Find the size of the box.
    // Pick the smaller of the two video preview sizes
    const smaller = Math.min(w, h)
    const boxSize = smaller * params.faceFeedbackBoxRatio

    // Set the boundaries of the face overlay validation box based on the preview
    const topBound = (h - boxSize) / 2
    const leftBound = (w - boxSize) / 2
    const rightBound = leftBound + boxSize
    const bottomBound = topBound + boxSize

    // get the x and y positions of the left and right eyes
    const eyeLX = latestEyeFeatures.left.imagex
    const eyeLY = latestEyeFeatures.left.imagey
    const eyeRX = latestEyeFeatures.right.imagex
    const eyeRY = latestEyeFeatures.right.imagey

    let xPositions = false
    let yPositions = false

    // check if the x values for the left and right eye are within the
    // validation box
    // add the width when comparing against the rightBound (which is the left edge on the preview)
    if (eyeLX > leftBound && eyeLX + latestEyeFeatures.left.width < rightBound) {
      if (eyeRX > leftBound && eyeRX + latestEyeFeatures.right.width < rightBound) {
        xPositions = true
      }
    }

    // check if the y values for the left and right eye are within the
    // validation box
    if (eyeLY > topBound && eyeLY + latestEyeFeatures.left.height < bottomBound) {
      if (eyeRY > topBound && eyeRY + latestEyeFeatures.right.height < bottomBound) {
        yPositions = true
      }
    }

    // if the x and y values for both the left and right eye are within
    // the validation box then the box border turns green, otherwise if
    // the eyes are outside of the box the colour is red
    if (xPositions && yPositions) {
      faceFeedbackBox.style.border = 'solid green'
    } else {
      faceFeedbackBox.style.border = 'solid red'
    }
  } else { faceFeedbackBox.style.border = 'solid black' }
}

/**
 * This draws the point (x,y) onto the canvas in the HTML
 * @param {string} colour - The colour of the circle to plot
 * @param {number} x - The x co-ordinate of the desired point to plot
 * @param {number} y - The y co-ordinate of the desired point to plot
 */
function drawCoordinates (colour, x, y) {
  const canvas = /** @type {HTMLCanvasElement | null} */(document.getElementById('plotting_canvas'))
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = colour // Red color
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2, true)
  ctx.fill()
}

/**
 * Gets the pupil features by following the pipeline which threads an eyes object through each call:
 * curTracker gets eye patches -> blink detector -> pupil detection
 * @param {HTMLCanvasElement} canvas - a canvas which will have the video drawn onto it
 * @param {Number} width - the width of canvas
 * @param {Number} height - the height of canvas
 */
function getPupilFeatures (canvas, width, height) {
  if (!canvas) return
  try {
    return curTracker.getEyePatches(videoElement, canvas, width, height)
  } catch (err) {
    console.log("can't get pupil features ", err)
  }
}

/**
 * Gets the most current frame of video and paints it to a resized version of the canvas with width and height
 * @param {HTMLCanvasElement} canvas - the canvas to paint the video on to
 * @param {number} width - the new width of the canvas
 * @param {number} height - the new height of the canvas
 */
function paintCurrentFrame (canvas, width, height) {
  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  ctx && ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
}

/**
 * Paints the video to a canvas and runs the prediction pipeline to get a prediction
 * @param {number=} regModelIndex - The prediction index we're looking for
 * @returns {Promise<PredictionResult | undefined>}
 */
async function getPrediction (regModelIndex) {
  /** @type {(import('./worker_scripts/util').Point | undefined)[]} */
  const predictions = []
  // [20200617 xk] TODO: this call should be made async somehow. will take some work.
  latestEyeFeatures = await getPupilFeatures(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height)

  if (regs.length === 0) {
    console.log('regression not set, call setRegression()')
    return
  }
  for (const reg in regs) {
    predictions.push(regs[reg].predict(latestEyeFeatures))
  }
  if (regModelIndex !== undefined) {
    const prediction = predictions[regModelIndex]
    return prediction && {
      x: prediction.x,
      y: prediction.y,
      eyeFeatures: latestEyeFeatures
    }
  } else {
    return predictions[0] && {
      x: predictions[0].x,
      y: predictions[0].y,
      eyeFeatures: latestEyeFeatures,
      all: predictions
    }
  }
}

/**
 * Runs every available animation frame if webgazer is not paused
 */
const smoothingVals = /** @type {DataWindow<PredictionResult>} */(new DataWindow(4))
let k = 0

const loop = async () => {
  if (!paused) {
    // [20200617 XK] TODO: there is currently lag between the camera input and the face overlay. This behavior
    // is not seen in the facemesh demo. probably need to optimize async implementation. I think the issue lies
    // in the implementation of getPrediction().

    // Paint the latest video frame into the canvas which will be analyzed by WebGazer
    // [20180729 JT] Why do we need to do this? clmTracker does this itself _already_, which is just duplicating the work.
    // Is it because other trackers need a canvas instead of an img/video element?
    paintCurrentFrame(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height)

    // Count time
    const elapsedTime = performance.now() - clockStart

    // Draw face overlay
    if (params.showFaceOverlay) {
      // Get tracker object
      const tracker = getTracker()
      const ctx = faceOverlay.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, videoElement.videoWidth, videoElement.videoHeight)
      const positions = tracker.getPositions()

      tracker.drawFaceOverlay(ctx, /** @type {import('@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util').Coords3D} */(positions))
    }

    // Feedback box
    // Check that the eyes are inside of the validation box
    if (params.showFaceFeedbackBox) { checkEyesInValidationBox() }

    // Get gaze prediction (ask clm to track; pass the data to the regressor; get back a prediction)
    latestGazeData = await getPrediction()

    // [20200623 xk] callback to function passed into setGazeListener(fn)
    gazeListener(latestGazeData, elapsedTime)

    if (latestGazeData) {
      // [20200608 XK] Smoothing across the most recent 4 predictions, do we need this with Kalman filter?
      smoothingVals.push(latestGazeData)
      let x = 0
      let y = 0
      const len = smoothingVals.length
      smoothingVals.data.map((_, i) => smoothingVals.get(i)).forEach(val => {
        x += val.x
        y += val.y
      })

      const pred = bound({ x: x / len, y: y / len })

      if (params.storingPoints) {
        drawCoordinates('blue', pred.x, pred.y) // draws the previous predictions
        // store the position of the past fifty occuring tracker preditions
        storePoints(pred.x, pred.y, k)
        k++
        if (k === 50) {
          k = 0
        }
      }
      // GazeDot
      if (params.showGazeDot) {
        gazeDot.style.display = 'block'
      }
      gazeDot.style.transform = 'translate3d(' + pred.x + 'px,' + pred.y + 'px,0)'
    } else {
      gazeDot.style.display = 'none'
    }

    requestAnimationFrame(loop)
  }
}

// is problematic to test
// because latestEyeFeatures is not set in many cases

/**
 * Records screen position data based on current pupil feature and passes it
 * to the regression model.
 * @param {number} x - The x screen position
 * @param {number} y - The y screen position
 * @param {'click' | 'move'} eventType - The event type to store
 * @returns {void}
 */
export const recordScreenPosition = (x, y, eventType = eventTypes[0]) => {
  if (paused) return
  if (regs.length === 0) {
    console.log('regression not set, call setRegression()')
    return
  }
  for (const reg in regs) {
    if (latestEyeFeatures) { regs[reg].addData({ eyes: latestEyeFeatures, screenPos: [x, y], type: eventType }) }
  }
}

/**
 * Records click data and passes it to the regression model
 * @param {MouseEvent} event - The listened event
 */
const clickListener = async event => {
  recordScreenPosition(event.clientX, event.clientY, eventTypes[0]) // eventType[0] === 'click'

  if (params.saveDataAcrossSessions) {
    // Each click stores the next data point into localforage.
    await setGlobalData()

    // // Debug line
    // console.log('Model size: ' + JSON.stringify(await localforage.getItem(localstorageDataLabel)).length / 1000000 + 'MB');
  }
}

/**
 * Records mouse movement data and passes it to the regression model
 * @param {MouseEvent} event - The listened event
 */
const moveListener = event => {
  if (paused) {
    return
  }

  const now = performance.now()
  if (now < moveClock + params.moveTickSize) {
    return
  } else {
    moveClock = now
  }
  recordScreenPosition(event.clientX, event.clientY, eventTypes[1]) // eventType[1] === 'move'
}

/**
 * Add event listeners for mouse click and move.
 */
const addMouseEventListeners = () => {
  // third argument set to true so that we get event on 'capture' instead of 'bubbling'
  // this prevents a client using event.stopPropagation() preventing our access to the click
  document.addEventListener('click', clickListener, true)
  document.addEventListener('mousemove', moveListener, true)
}

/**
 * Remove event listeners for mouse click and move.
 */
export const removeMouseEventListeners = () => {
  // must set third argument to same value used in addMouseEventListeners
  // for this to work.
  document.removeEventListener('click', clickListener, true)
  document.removeEventListener('mousemove', moveListener, true)
}

/**
 * Loads the global data and passes it to the regression model
 */
const loadGlobalData = async () => {
  // Get settings object from localforage
  // [20200611 xk] still unsure what this does, maybe would be good for Kalman filter settings etc?
  settings = await localforage.getItem(localstorageSettingsLabel)
  settings = settings || defaults

  // Get click data from localforage
  let loadData = await localforage.getItem(localstorageDataLabel)
  loadData = loadData || defaults

  // Set global var data to newly loaded data
  data = loadData

  // Load data into regression model(s)
  for (const reg in regs) {
    regs[reg].setData(loadData)
  }

  console.log('loaded stored data into regression model')
}

/**
 * Adds data to localforage
 */
const setGlobalData = async () => {
  // Grab data from regression model
  const storeData = regs[0].getData() || data // Array

  // Store data into localforage
  localforage.setItem(localstorageSettingsLabel, settings) // [20200605 XK] is 'settings' ever being used?
  localforage.setItem(localstorageDataLabel, storeData)
  // TODO data should probably be stored in webgazer object instead of each regression model
  //     -> requires duplication of data, but is likely easier on regression model implementors
}

/**
 * Clears data from model and global storage
 */
export const clearData = () => {
  // Removes data from localforage
  localforage.clear()

  // Create fresh instances of the regression models
  regs = regs.map(reg => regressionMap[reg.name]())
}

/**
 * Initializes all needed dom elements and begins the loop
 * @param {MediaStream} stream - The video stream to use
 */
const init = async stream => {
  /// ///////////////////////
  // Video and video preview
  /// ///////////////////////
  const topDist = '0px'
  const leftDist = '0px'

  // create a video element container to enable customizable placement on the page
  videoContainerElement = document.createElement('div')
  videoContainerElement.id = params.videoContainerId

  videoContainerElement.style.position = 'fixed'
  videoContainerElement.style.top = topDist
  videoContainerElement.style.left = leftDist
  videoContainerElement.style.width = params.videoViewerWidth + 'px'
  videoContainerElement.style.height = params.videoViewerHeight + 'px'
  hideVideoElement(videoContainerElement)

  videoElement = document.createElement('video')
  videoElement.setAttribute('playsinline', '')
  videoElement.id = params.videoElementId
  videoElement.srcObject = stream
  videoElement.autoplay = true
  videoElement.style.position = 'absolute'
  // We set these to stop the video appearing too large when it is added for the very first time
  videoElement.style.width = params.videoViewerWidth + 'px'
  videoElement.style.height = params.videoViewerHeight + 'px'
  hideVideoElement(videoElement)
  // videoElement.style.zIndex="-1";

  // used for stopVideo() and setCameraConstraints()
  videoStream = stream

  // Canvas for drawing video to pass to clm tracker
  videoElementCanvas = document.createElement('canvas')
  videoElementCanvas.id = params.videoElementCanvasId
  videoElementCanvas.style.display = 'none'

  // Face overlay
  // Shows the CLM tracking result
  faceOverlay = document.createElement('canvas')
  faceOverlay.id = params.faceOverlayId
  faceOverlay.style.display = params.showFaceOverlay ? 'block' : 'none'
  faceOverlay.style.position = 'absolute'

  // Mirror video feed
  if (params.mirrorVideo) {
    videoElement.style.setProperty('-moz-transform', 'scale(-1, 1)')
    videoElement.style.setProperty('-webkit-transform', 'scale(-1, 1)')
    videoElement.style.setProperty('-o-transform', 'scale(-1, 1)')
    videoElement.style.setProperty('transform', 'scale(-1, 1)')
    videoElement.style.setProperty('filter', 'FlipH')
    faceOverlay.style.setProperty('-moz-transform', 'scale(-1, 1)')
    faceOverlay.style.setProperty('-webkit-transform', 'scale(-1, 1)')
    faceOverlay.style.setProperty('-o-transform', 'scale(-1, 1)')
    faceOverlay.style.setProperty('transform', 'scale(-1, 1)')
    faceOverlay.style.setProperty('filter', 'FlipH')
  }

  // Feedback box
  // Lets the user know when their face is in the middle
  faceFeedbackBox = document.createElement('canvas')
  faceFeedbackBox.id = params.faceFeedbackBoxId
  faceFeedbackBox.style.display = params.showFaceFeedbackBox ? 'block' : 'none'
  faceFeedbackBox.style.border = 'solid'
  faceFeedbackBox.style.position = 'absolute'

  // Gaze dot
  // Starts offscreen
  gazeDot = document.createElement('div')
  gazeDot.id = params.gazeDotId
  gazeDot.style.display = params.showGazeDot ? 'block' : 'none'
  gazeDot.style.position = 'fixed'
  gazeDot.style.zIndex = '99999'
  gazeDot.style.left = '-5px'
  gazeDot.style.top = '-5px'
  gazeDot.style.background = 'red'
  gazeDot.style.borderRadius = '100%'
  gazeDot.style.opacity = '0.7'
  gazeDot.style.width = '10px'
  gazeDot.style.height = '10px'

  // Add other preview/feedback elements to the screen once the video has shown and its parameters are initialized
  videoContainerElement.appendChild(videoElement)
  document.body.appendChild(videoContainerElement)
  const videoPreviewSetup = /** @type {Promise<void>} */(new Promise(resolve => {
    function setupPreviewVideo (e) {
      // All video preview parts have now been added, so set the size both internally and in the preview window.
      setInternalVideoBufferSizes(videoElement.videoWidth, videoElement.videoHeight)
      setVideoViewerSize(params.videoViewerWidth, params.videoViewerHeight)

      videoContainerElement.appendChild(videoElementCanvas)
      videoContainerElement.appendChild(faceOverlay)
      videoContainerElement.appendChild(faceFeedbackBox)
      document.body.appendChild(gazeDot)

      // Run this only once, so remove the event listener
      e.target.removeEventListener(e.type, setupPreviewVideo)
      resolve()
    };
    videoElement.addEventListener('loadeddata', setupPreviewVideo)
  }))

  addMouseEventListeners()

  // BEGIN CALLBACK LOOP
  paused = false
  clockStart = performance.now()

  await videoPreviewSetup
  await loop()
}

/**
 * Initializes navigator.mediaDevices.getUserMedia
 * depending on the browser capabilities
 *
 * @return Promise
 */
const setUserMediaVariable = () => {
  if (navigator.mediaDevices === undefined) {
    Object.assign(navigator.mediaDevices, {})
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      // gets the alternative old getUserMedia is possible
      // @ts-ignore
      const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia

      // set an error message if browser doesn't support getUserMedia
      if (!getUserMedia) {
        return Promise.reject(new Error('Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead.'))
      }

      // uses navigator.getUserMedia for older browsers
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject)
      })
    }
  }
}

// PUBLIC FUNCTIONS - CONTROL

/**
 * Starts all state related to webgazer -> dataLoop, video collection, click listener
 * If starting fails, call `onFail` param function.
 * @param {() => void} onFail - Callback to call in case it is impossible to find user camera
 * @returns {*}
 */
export const begin = (onFail) => {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && /** @type {any} */(window).chrome) {
    alert('WebGazer works only over https. If you are doing local development, you need to run a local server.')
  }

  // Load model data stored in localforage.
  if (params.saveDataAcrossSessions) loadGlobalData()

  onFail = onFail || (() => console.log('No stream'))

  if (debugVideoLoc) {
    init(debugVideoLoc)
    return
  }

  /// ////////////////////
  // SETUP VIDEO ELEMENTS
  // Sets .mediaDevices.getUserMedia depending on browser
  setUserMediaVariable()

  // Request webcam access under specific constraints
  // WAIT for access
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia(params.camConstraints).then(init)
      .then(() => resolve(undefined))
      .catch(err => {
        onFail()
        reject(err)
      })
  })
}

/**
 * Checks if webgazer has finished initializing after calling begin()
 * [20180729 JT] This seems like a bad idea for how this function should be implemented.
 * @returns {boolean} if webgazer is ready
 */
export const isReady = () => {
  if (!videoElementCanvas) return false
  return videoElementCanvas.width > 0
}

/**
 * Stops collection of data and predictions
 * @return {void}
 */
export const pause = () => {
  paused = true
}

/**
 * Resumes collection of data and predictions if paused
 * @return {Promise<void>}
 */
export const resume = async () => {
  if (!paused) return
  paused = false
  await loop()
}

/**
 * stops collection of data and removes dom modifications, must call begin() to reset up
 * @return {void}
 */
export const end = () => {
  // loop may run an extra time and fail due to removed elements
  paused = true

  stopVideo() // uncomment if you want to stop the video from streaming

  // remove video element and canvas
  videoContainerElement.remove()
  gazeDot.remove()
}

/**
 * Stops the video camera from streaming and removes the video outlines
 * @return {void}
 */
export const stopVideo = () => {
  // Stops the video from streaming
  videoStream.getTracks()[0].stop()

  // Removes the outline of the face
  videoContainerElement.removeChild(faceOverlay)

  // Removes the box around the face
  videoContainerElement.removeChild(faceFeedbackBox)
}

// PUBLIC FUNCTIONS - DEBUG

/**
 * Returns if the browser is compatible with webgazer
 * @return {boolean} if browser is compatible
 */
export const detectCompatibility = () => {
  const getUserMedia = navigator.mediaDevices.getUserMedia ||
    // @ts-ignore
    navigator.getUserMedia ||
    // @ts-ignore
    navigator.webkitGetUserMedia ||
    // @ts-ignore
    navigator.mozGetUserMedia

  return getUserMedia !== undefined
}

/**
 * Set whether to show any of the video previews (camera, face overlay, feedback box).
 * If true: visibility depends on corresponding params (default all true).
 * If false: camera, face overlay, feedback box are all hidden
 * @param {boolean} val
 * @return {void}
 */
export const showVideoPreview = (val) => {
  params.showVideoPreview = val
  showVideo(val && params.showVideo)
  showFaceOverlay(val && params.showFaceOverlay)
  showFaceFeedbackBox(val && params.showFaceFeedbackBox)
}

/**
 * hides a video element (videoElement or videoContainerElement)
 * uses display = 'none' for all browsers except Safari, which uses opacity = '1'
 * because Safari optimizes out video element if display = 'none'
 * @param {HTMLElement} val
 * @return {void}
 */
export const hideVideoElement = (val) => {
  if (
    (navigator.vendor && navigator.vendor.indexOf('Apple') > -1) ||
    (navigator.userAgent && navigator.userAgent.search('Firefox') > -1)
  ) {
    val.style.opacity = params.showVideo ? '1' : '0'
    val.style.display = 'block'
  } else {
    val.style.display = params.showVideo ? 'block' : 'none'
  }
}

/**
 * Set whether the camera video preview is visible or not (default true).
 * @param {boolean} bool
 * @return {void}
 */
export const showVideo = (bool) => {
  params.showVideo = bool
  if (videoElement) {
    hideVideoElement(videoElement)
  }
  if (videoContainerElement) {
    hideVideoElement(videoContainerElement)
  }
}

/**
 * Set whether the face overlay is visible or not (default true).
 * @param {boolean} bool
 * @return {void}
 */
export const showFaceOverlay = (bool) => {
  params.showFaceOverlay = bool
  if (faceOverlay) faceOverlay.style.display = bool ? 'block' : 'none'
}

/**
 * Set whether the face feedback box is visible or not (default true).
 * @param {boolean} bool
 * @return {void}
 */
export const showFaceFeedbackBox = (bool) => {
  params.showFaceFeedbackBox = bool
  if (faceFeedbackBox) faceFeedbackBox.style.display = bool ? 'block' : 'none'
}

/**
 * Set whether the gaze prediction point(s) are visible or not.
 * Multiple because of a trail of past dots. Default true
 * @param {boolean} showGazeDot
 */
export const showPredictionPoints = showGazeDot => {
  params.showGazeDot = showGazeDot
  if (gazeDot) {
    gazeDot.style.display = showGazeDot ? 'block' : 'none'
  }
}

/**
 * Set whether previous calibration data (from localforage) should be loaded.
 * Default true.
 *
 * NOTE: Should be called before webgazer.begin() -- see www/js/main.js for example
 *
 * @param {boolean} val
 */
export const saveDataAcrossSessions = val => {
  params.saveDataAcrossSessions = val
}

/**
 * Set whether a Kalman filter will be applied to gaze predictions (default true);
 * @param {boolean} val
 */
export const applyKalmanFilter = val => {
  params.applyKalmanFilter = val
}

/**
 * Define constraints on the video camera that is used. Useful for non-standard setups.
 * This can be set before calling webgazer.begin(), but also mid stream.
 *
 * @param {import('./params.mjs').CamConstraints} constraints Example constraints object:
 * { width: { min: 320, ideal: 1280, max: 1920 }, height: { min: 240, ideal: 720, max: 1080 }, facingMode: "user" };
 *
 * Follows definition here:
 * https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints
 *
 * Note: The constraints set here are applied to the video track only. They also _replace_ any constraints, so be sure to set everything you need.
 * Warning: Setting a large video resolution will decrease performance, and may require
 */
export const setCameraConstraints = async constraints => {
  /** @type {MediaStreamTrack | undefined} */
  let videoTrack
  /** @type {MediaTrackSettings | undefined} */
  let videoSettings
  params.camConstraints = constraints

  // If the camera stream is already up...
  if (videoStream) {
    pause()
    videoTrack = videoStream.getVideoTracks()[0]
    try {
      await videoTrack.applyConstraints(params.camConstraints.video)
      videoSettings = videoTrack.getSettings()
      setInternalVideoBufferSizes(videoSettings.width || 0, videoSettings.height || 0)
    } catch (err) {
      console.log(err)
      return
    }
    // Reset and recompute sizes of the video viewer.
    // This is only to adjust the feedback box, say, if the aspect ratio of the video has changed.
    setVideoViewerSize(params.videoViewerWidth, params.videoViewerHeight)
    getTracker().reset()
    await resume()
  }
}

/**
 * Does what it says on the tin.
 * @param {number} width
 * @param {number} height
 */
function setInternalVideoBufferSizes (width, height) {
  // Re-set the canvas size used by the internal processes
  if (videoElementCanvas) {
    videoElementCanvas.width = width
    videoElementCanvas.height = height
  }

  // Re-set the face overlay canvas size
  if (faceOverlay) {
    faceOverlay.width = width
    faceOverlay.height = height
  }
}

/**
 *  Set a static video file to be used instead of webcam video
 *  @param {MediaStream} videoLoc - video file location
 */
export const setStaticVideo = videoLoc => {
  debugVideoLoc = videoLoc
}

/**
 * Set the size of the video viewer
 * @param {number} w width
 * @param {number} h height
 */
export const setVideoViewerSize = (w, h) => {
  params.videoViewerWidth = w
  params.videoViewerHeight = h

  // Change the video viewer
  videoElement.style.width = w + 'px'
  videoElement.style.height = h + 'px'

  // Change video container
  videoContainerElement.style.width = w + 'px'
  videoContainerElement.style.height = h + 'px'

  // Change the face overlay
  faceOverlay.style.width = w + 'px'
  faceOverlay.style.height = h + 'px'

  // Change the feedback box size
  // Compute the boundaries of the face overlay validation box based on the video size
  const tlwh = computeValidationBoxSize()
  // Assign them to the object
  faceFeedbackBox.style.top = tlwh[0] + 'px'
  faceFeedbackBox.style.left = tlwh[1] + 'px'
  faceFeedbackBox.style.width = tlwh[2] + 'px'
  faceFeedbackBox.style.height = tlwh[3] + 'px'
}

/*
 * Stores the position of the fifty most recent tracker preditions
 */
export const storePoints = function (x, y, k) {
  xPast50[k] = x
  yPast50[k] = y
}

// SETTERS
/**
 * Sets the tracking module
 * @param {string} name - The name of the tracking module to use
 */
export const setTracker = name => {
  if (curTrackerMap[name] === undefined) {
    console.log('Invalid tracker selection')
    console.log('Options are: ')
    for (const t in curTrackerMap) {
      console.log(t)
    }
  } else {
    curTracker = curTrackerMap[name]()
  }
}

/**
 * Sets the regression module and clears any other regression modules
 * @param {string} name - The name of the regression module to use
 */
export const setRegression = name => {
  if (regressionMap[name] === undefined) {
    console.log('Invalid regression selection')
    console.log('Options are: ')
    for (const reg in regressionMap) {
      console.log(reg)
    }
  } else {
    data = regs[0].getData()
    regs = [regressionMap[name]()]
    regs[0].setData(data)
  }
}

/**
 * Adds a new tracker module so that it can be used by setTracker()
 * @param {string} name - the new name of the tracker
 * @param {() => void} constructor - the constructor of the curTracker object
 */
export const addTrackerModule = (name, constructor) => {
  curTrackerMap[name] = function () {
    return new constructor()
  }
}

/**
 * Adds a new regression module so that it can be used by setRegression() and addRegression()
 * @param {string} name - the new name of the regression
 * @param {() => void} constructor - the constructor of the regression object
 */
export const addRegressionModule = (name, constructor) => {
  regressionMap[name] = function () {
    return new constructor()
  }
}

/**
 * Adds a new regression module to the list of regression modules, seeding its data from the first regression module
 * @param {string} name - the string name of the regression module to add
 */
export const addRegression = name => {
  const newReg = regressionMap[name]()
  data = regs[0].getData()
  newReg.setData(data)
  regs.push(newReg)
}

/**
 * Sets a callback to be executed on every gaze event (currently all time steps)
 * @param {(data: PredictionResult | undefined, elapsedTime: number) => void} listener - The callback function to call (it must be like function(data, elapsedTime))
 */
export const setGazeListener = listener => {
  gazeListener = listener
}

/**
 * Removes the callback set by setGazeListener
 */
export const clearGazeListener = () => {
  gazeListener = nopCallback
}

/**
 * Set the video element canvas; useful if you want to run WebGazer on your own canvas (e.g., on any random image).
 * @param {HTMLCanvasElement} canvas
 * @return {HTMLCanvasElement} The current video element canvas
 */
export const setVideoElementCanvas = canvas => {
  videoElementCanvas = canvas
  return videoElementCanvas
}

// GETTERS
/**
 * Returns the tracker currently in use
 * @return {TFFaceMesh} an object following the tracker interface
 */
export const getTracker = () => {
  return curTracker
}

/**
 * Returns the regression currently in use
 * @return {(RidgeReg | RidgeWeightedReg | RidgeRegThreaded)[]} an array of regression objects following the regression interface
 */
export const getRegression = () => {
  return regs
}

/**
 * Requests an immediate prediction
 * @return {object} prediction data object
 */
export const getCurrentPrediction = (regIndex) => {
  return getPrediction(regIndex)
}

/**
 * returns the different event types that may be passed to regressions when calling regression.addData()
 * @return {typeof eventTypes} array of strings where each string is an event type
 */
export const getEventTypes = () => [...eventTypes]

/**
 * Get the video element canvas that WebGazer uses internally on which to run its face tracker.
 * @return The current video element canvas
 */
export const getVideoElementCanvas = () => {
  return videoElementCanvas
}

/**
 * @return array [a,b] where a is width ratio and b is height ratio
 */
export const getVideoPreviewToCameraResolutionRatio = function () {
  return [params.videoViewerWidth / videoElement.videoWidth, params.videoViewerHeight / videoElement.videoHeight]
}

/**
 * Gets the fifty most recent tracker predictions
 * @return {[number[], number[]]}
 **/
export const getStoredPoints = () => {
  return [xPast50, yPast50]
}

export { params }
