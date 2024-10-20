// @ts-check
import { WebGazer } from '../lib/webgazer.js';
export { restart } from './calibration';

const webgazer = new WebGazer({
  regression: 'ridgeReg',
  saveDataAcrossSessions: true,
  useKalmanFilter: true,
  videoConstraints: {
    width: { min: 320, ideal: 640, max: 1920 },
    height: { min: 240, ideal: 480, max: 1080 },
    facingMode: 'user'
  }
});

window.onload = async function () {
  // Create a new WebGazer instance

  // Set up the gaze listener
  webgazer.addGazeListener(() => {
    // console.log(data); /* data is an object containing x and y keys which are the prediction coordinates */
    // console.log(elapsedTime); /* elapsed time in milliseconds since webgazer.start() was called */
  });

  try {
    // Start WebGazer
    await webgazer.start();

    // Show video preview
    const videoElement = /** @type {HTMLVideoElement} */ (document.getElementById('webgazerVideo') || document.createElement('video'));
    await webgazer.showVideoFeedback(videoElement, { mirrorVideo: true, faceFeedback: false });

    // Show prediction points (gaze dot)
    webgazer.showGazeDot();
    webgazer.showGazeTrail();
    console.log('started');
  } catch (error) {
    console.error('Failed to start WebGazer:', error);
  }
};

// Clean up WebGazer before the page unloads
window.onbeforeunload = function () {
  if (webgazer) {
    webgazer.destroy();
  }
};
