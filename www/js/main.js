// @ts-check
import * as webgazer from '../../src/index.mjs'
export { Restart } from './calibration'

window.onload = async function () {
  // start the webgazer tracker
  await webgazer.setRegression('ridge') /* currently must set regression and tracker */
  // .setTracker('clmtrackr')
  webgazer.setGazeListener(function (data, clock) {
      //   console.log(data); /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
      //   console.log(clock); /* elapsed time in milliseconds since webgazer.begin() was called */
  })
  webgazer.saveDataAcrossSessions(true)
  webgazer.begin(console.error)
  webgazer.showVideoPreview(true) /* shows all video previews */
  webgazer.showPredictionPoints(true) /* shows a square every 100 milliseconds where current prediction is */
  webgazer.applyKalmanFilter(true) /* Kalman Filter defaults to on. Can be toggled by user. */

  // Set up the webgazer video feedback.
  const setup = function () {
    // Set up the main canvas. The main canvas is used to calibrate the webgazer.
    const canvas = /** @type {HTMLCanvasElement} */(document.getElementById('plotting_canvas'))
    if(!canvas) return console.error('Canvas not found')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.position = 'fixed'
  }
  setup()
}

// Set to true if you want to save the data even if you reload the page.
webgazer.saveDataAcrossSessions(true)

window.onbeforeunload = function () {
  webgazer.end()
}
