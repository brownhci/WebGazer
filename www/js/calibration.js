// @ts-check
import * as webgazer from '../../src/index.mjs'
import swal from 'sweetalert'
import * as bootstrap from 'bootstrap'

window.onload = async function () {
  // start the webgazer tracker
  webgazer.setRegression(
    'ridge'
  ) /* currently must set regression and tracker */
  // webgazer.setTracker('TFFacemesh')
  webgazer.setGazeListener(function (data, clock) {
    // console.log(data) /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
    // console.log(clock) /* elapsed time in milliseconds since webgazer.begin() was called */
  })
  webgazer.saveDataAcrossSessions(false)
  console.log('begin webgazer')
  await webgazer.begin(() => {
    console.log('fail webgazer')
  })
  webgazer.showFaceOverlay(true)
  webgazer.showVideoPreview(true) /* shows all video previews */
  webgazer.showPredictionPoints(
    true
  ) /* shows a square every 100 milliseconds where current prediction is */
  webgazer.applyKalmanFilter(
    true
  ) /* Kalman Filter defaults to on. Can be toggled by user. */

  // Set up the webgazer video feedback.
  const setup = function () {
    // Set up the main canvas. The main canvas is used to calibrate the webgazer.
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('plotting_canvas'))
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.position = 'fixed'
  }
  setup()
}

{
/**
 * @typedef {object} CustomWindowObject
 * @property {boolean} [saveDataAcrossSessions]
 */

/**
 * @typedef {Window & CustomWindowObject} CustomWindow
 */

// Set to true if you want to save the data even if you reload the page.
// TODO consolidate it with params from webgazer
/** @type {CustomWindow} */(window).saveDataAcrossSessions = true
}

window.onbeforeunload = function () {
  webgazer.end()
}

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart() {
  const accuracyLabel = document.getElementById('Accuracy')
  if (accuracyLabel) {
    accuracyLabel.innerHTML = '<a>Not yet Calibrated</a>'
  }
  webgazer.clearData()
  ClearCalibration()
  PopUpInstruction()
}

const startCalibrationButton = document.getElementById('start_calibration')
if (startCalibrationButton) {
  startCalibrationButton.onclick = Restart
}
const recalibrateButton = document.getElementById('recalibrate')
if (recalibrateButton) {
  recalibrateButton.onclick = Restart
}

let PointCalibrate = 0
let CalibrationPoints = {}

// Find the help modal
let helpModal

/**
 * Clear the canvas and the calibration button.
 */
function ClearCanvas () {
  document.querySelectorAll('.Calibration').forEach((i) => {
    i instanceof HTMLElement && i.style.setProperty('display', 'none')
  })
  const canvas = document.getElementById('plotting_canvas')
  if (!canvas) return
  const context =
    canvas instanceof HTMLCanvasElement && canvas.getContext('2d')
  if (context) context.clearRect(0, 0, canvas.width, canvas.height)
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
export function PopUpInstruction () {
  ClearCanvas()
  swal({
    title: 'Calibration',
    text: 'Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.',
    buttons: {
      cancel: false,
      confirm: true
    }
  }).then((isConfirm) => {
    ShowCalibrationPoint()
  })
}
/**
 * Show the help instructions right at the start.
 */
function helpModalShow () {
  if (!helpModal) {
    helpModal = new bootstrap.Modal('#helpModal')
  }
  helpModal.show()
}

function calcAccuracy () {
  // show modal
  // notification for the measurement process
  swal({
    title: 'Calculating measurement',
    text: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
    closeOnEsc: false,
    closeOnClickOutside: false
  }).then(() => {
    // makes the variables true for 5 seconds & plots the points

    storePointsVariable() // start storing the prediction points

    sleep(5000).then(() => {
      stopStoringPointsVariable() // stop storing the prediction points
      const past50 = webgazer.getStoredPoints() // retrieve the stored points
      const precisionMeasurement = calculatePrecision(past50)
      const accuracyLabel = '<a>Accuracy | ' + precisionMeasurement + '%</a>'
      const accuracyNode = document.getElementById('Accuracy')
      if (!accuracyNode) return
      accuracyNode.innerHTML = accuracyLabel // Show the accuracy in the nav bar.
      swal({
        title: 'Your accuracy measure is ' + precisionMeasurement + '%',
        closeOnClickOutside: false,
        buttons: {
          cancel: {
            text:'Recalibrate',
            value:false
          },
          confirm: true
        }
      }).then((isConfirm) => {
        if (isConfirm) {
          // clear the calibration & hide the last middle button
          ClearCanvas()
        } else {
          // use restart function to restart the calibration
          accuracyNode.innerHTML = '<a>Not yet Calibrated</a>'
          webgazer.clearData()
          ClearCalibration()
          ClearCanvas()
          ShowCalibrationPoint()
        }
      })
    })
  })
}

function calPointClick (node) {
  const id = node.id

  if (!CalibrationPoints[id]) {
    // initialises if not done
    CalibrationPoints[id] = 0
  }
  CalibrationPoints[id]++ // increments values

  if (CalibrationPoints[id] === 5) {
    // only turn to yellow after 5 clicks
    node.style.setProperty('background-color', 'yellow')
    node.setAttribute('disabled', 'disabled')
    PointCalibrate++
  } else if (CalibrationPoints[id] < 5) {
    // Gradually increase the opacity of calibration points when click to give some indication to user.
    const opacity = 0.2 * CalibrationPoints[id] + 0.2
    node.style.setProperty('opacity', opacity)
  }

  // Show the middle calibration point after all other points have been clicked.
  if (PointCalibrate === 8) {
    const pt5Element = document.getElementById('Pt5')
    if (pt5Element) {
      pt5Element.style.removeProperty('display')
    }
  }

  if (PointCalibrate >= 9) {
    // last point is calibrated
    // grab every element in Calibration class and hide them except the middle point.
    const points =/** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.Calibration'))
    points.forEach((i) => {
      i.style.setProperty('display', 'none')
    })

    const pt5Element = document.getElementById('Pt5')
    if (pt5Element) {
      pt5Element.style.removeProperty('display')
    }

    // clears the canvas
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('plotting_canvas'))
    const context = canvas.getContext('2d')
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Calculate the accuracy
    calcAccuracy()
  }
}

/**
 * Load this function when the index page starts.
 * This function listens for button clicks on the html page
 * checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
 */
// $(document).ready(function(){
function docLoad() {
  ClearCanvas()
  helpModalShow()

  // click event on the calibration buttons
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.addEventListener('click', () => {
      calPointClick(i)
    })
  })
}
window.addEventListener('load', docLoad)

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint () {
  const points = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.Calibration'))
  points.forEach((i) => {
    i.style.removeProperty('display')
  })
  // initially hides the middle button
  const pt5Element = document.getElementById('Pt5')
  if (pt5Element) {
    pt5Element.style.setProperty('display', 'none')
  }
}

/**
 * This function clears the calibration buttons memory
 */
function ClearCalibration () {
  // Clear data from WebGazer

  const points = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.Calibration'))
  points.forEach((i) => {
    i.style.setProperty('background-color', 'red')
    i.style.setProperty('opacity', '0.2')
    i.removeAttribute('disabled')
  })

  CalibrationPoints = {}
  PointCalibrate = 0
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * This function calculates a measurement for how precise
 * the eye tracker currently is which is displayed to the user
 * @param {[number[], number[]]} past50Array
 */
export function calculatePrecision (past50Array) {
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth

  // Retrieve the last 50 gaze prediction points
  const x50 = past50Array[0]
  const y50 = past50Array[1]

  // Calculate the position of the point the user is staring at
  const staringPointX = windowWidth / 2
  const staringPointY = windowHeight / 2

  const precisionPercentages = calculatePrecisionPercentages(
    windowHeight,
    x50,
    y50,
    staringPointX,
    staringPointY
  )
  const precision = calculateAverage(precisionPercentages)

  // Return the precision measurement as a rounded percentage
  return Math.round(precision)
}

/**
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 * @param {number} windowHeight
 * @param {number[]} x50
 * @param {number[]} y50
 * @param {number} staringPointX
 * @param {number} staringPointY
 */
function calculatePrecisionPercentages (
  windowHeight,
  x50,
  y50,
  staringPointX,
  staringPointY
) {
  return new Array(50).fill(0).map((_, i) => {
    // Calculate distance between each prediction and staring point
    const xDiff = staringPointX - x50[i]
    const yDiff = staringPointY - y50[i]
    const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff)

    // Calculate precision percentage
    const halfWindowHeight = windowHeight / 2
    if (distance <= halfWindowHeight && distance > -1) {
      return 100 - (distance / halfWindowHeight) * 100
    } else if (distance > halfWindowHeight) {
      return 0
    } else if (distance > -1) {
      return 100
    } else return 0
  })
}

/**
 * Calculates the average of all precision percentages calculated
 * @param {number[]} precisionPercentages
 */
function calculateAverage (precisionPercentages) {
  return (
    precisionPercentages.reduce((sum, val) => sum + val, 0) /
    precisionPercentages.length
  )
}

/*
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function storePointsVariable () {
  webgazer.params.storingPoints = true
}

/*
 * Sets store_points to false, so prediction points aren't
 * stored any more
 */
function stopStoringPointsVariable () {
  webgazer.params.storingPoints = false
}

/**
 * This function occurs on resizing the frame
 * clears the canvas & then resizes it (as plots have moved position, can't resize without clear)
 */
function resize () {
  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById('plotting_canvas')
  )
  if (!canvas) return console.error('Canvas plotting_canvas not found')
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
window.addEventListener('resize', resize, false)
