// @ts-check
import { WebGazer } from '../lib/webgazer.js';
import swal from 'sweetalert';

const webgazer = new WebGazer({
  regression: 'ridgeReg',
  saveDataAcrossSessions: false,
  useKalmanFilter: true,
  useCalibration: 'click'
});

/**
 * Clear the canvas and the calibration button.
 */
const clearCanvas = () => {
  const canvas = document.getElementById('plotting_canvas');
  if (!canvas) return;
  const context =
    canvas instanceof HTMLCanvasElement && canvas.getContext('2d');
  if (context) context.clearRect(0, 0, canvas.width, canvas.height);
};

/** @type {Map<string, CalibrationPoint>} */
const calibrationPoints = new Map();
const countCalibratedPoints = () => Array.from(calibrationPoints.values()).filter(point => point.isCalibrated).length;

/**
 * This function clears the calibration buttons memory
 */
const clearCalibration = () => {
  webgazer.clearData();
  calibrationPoints.forEach(point => point.reset());
  calibrateBorders();
};

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
export const restart = () => {
  const accuracyLabel = document.getElementById('Accuracy');
  if (accuracyLabel) accuracyLabel.innerHTML = '<a>Not yet Calibrated</a>';
  webgazer.clearData();
  webgazer.startCalibration();
  clearCalibration();
  clearCanvas();
};

const filters = /** @type {const} */ (['ridgeReg', 'ridgeWeighted', 'ridgeThreaded']);
const switchRegressionMethod = () => {
  const regressionLabel = document.getElementById('switch_regression');
  const index = filters.findIndex(filter => webgazer.regression.name === filter);
  const newRegression = filters[(index + 1) % filters.length];
  webgazer.setRegression(newRegression);
  if (regressionLabel) regressionLabel.innerHTML = 'Regression : ' + newRegression;
};

const onCalibrated = () => {
  const calibratedPointsCount = countCalibratedPoints();

  if (calibratedPointsCount === 8) calibrateMiddle();
  if (calibratedPointsCount >= 9) {
    calibrateMiddle();
    clearCanvas();
    webgazer.stopCalibration();
    calcAccuracy();
  }
};

window.addEventListener('load', async () => {
  await webgazer.start({ gazeDot: true, gazeTrail: true });

  // Prepare calibration points
  document.querySelectorAll('.Calibration').forEach((node) => {
    if (node instanceof HTMLElement) calibrationPoints.set(node.id, new CalibrationPoint(node, onCalibrated));
  });

  // Prepare the buttons
  const startCalibrationButton = document.getElementById('start_calibration');
  if (startCalibrationButton) startCalibrationButton.onclick = restart;
  const recalibrateButton = document.getElementById('recalibrate');
  if (recalibrateButton) recalibrateButton.onclick = restart;
  const switchRegressionButton = document.getElementById('switch_regression');
  if (switchRegressionButton) switchRegressionButton.onclick = switchRegressionMethod;
  const toggleKalmanButton = document.getElementById('toggle_kalman');
  if (toggleKalmanButton) {
    toggleKalmanButton.onclick = () => {
      webgazer.useKalmanFilter = !webgazer.useKalmanFilter;
      toggleKalmanButton.innerHTML = webgazer.useKalmanFilter ? 'Kalman Filter On' : 'Kalman Filter Off';
    };
  }
  const videoElement = /** @type {HTMLVideoElement} */ (document.getElementById('webgazerVideo'));
  if (videoElement) webgazer.showVideoFeedback(videoElement, { faceFeedback: true, mirrorVideo: true });

  // Is this really necessary?
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('plotting_canvas'));
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  calibrateBorders();
});

window.onbeforeunload = function () {
  webgazer.destroy();
};

const calcAccuracy = () => {
  /** @type {({ x: number, y: number })[]} */
  const lastPoints = [];
  let calibrationIndex = 0;

  /**
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
  const calculatePrecisionPercentages = () => {
    const { innerWidth, innerHeight } = window;
    const precisionForEachPoint = lastPoints.map(({ x, y }) => {
      const staringPointX = innerWidth / 2;
      const staringPointY = innerHeight / 2;

      // Calculate distance between each prediction and staring point
      const xDiff = staringPointX - x;
      const yDiff = staringPointY - y;
      const distance = Math.hypot(xDiff, yDiff);

      // Calculate precision percentage
      const halfWindowHeight = innerHeight / 2;
      if (distance <= halfWindowHeight && distance > -1) {
        return 100 - (distance / halfWindowHeight) * 100;
      } else if (distance > halfWindowHeight) {
        return 0;
      } else if (distance > -1) {
        return 100;
      } else return 0;
    });
    const averagePrecision = precisionForEachPoint.reduce((sum, val) => sum + val, 0) / precisionForEachPoint.length;
    return Math.round(averagePrecision);
  };

  // show modal
  // notification for the measurement process
  swal({
    title: 'Calculating measurement',
    text: 'Please don\'t move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.',
    closeOnEsc: false,
    closeOnClickOutside: false
  }).then(() => {
    // Listen for predictions for 5 seconds and store them in an array
    const precisionListener = (/** @type {{x: number; y: number} | undefined} */ data, /** @type {number} */ _clock) => {
      if (!data) return;
      lastPoints[calibrationIndex] = { x: data.x, y: data.y };
      calibrationIndex = (calibrationIndex + 1) % 50;
    };
    webgazer.addGazeListener(precisionListener);

    // Compute the precision after 5 seconds
    setTimeout(() => {
      webgazer.removeGazeListener(precisionListener);
      const precisionMeasurement = calculatePrecisionPercentages();
      const accuracyNode = document.getElementById('Accuracy');
      if (!accuracyNode) return;
      accuracyNode.innerHTML = `<a>Accuracy | ${precisionMeasurement}%</a>`; // Show the accuracy in the nav bar.
      swal({
        title: 'Your accuracy measure is ' + precisionMeasurement + '%',
        closeOnClickOutside: false,
        buttons: {
          cancel: {
            text: 'Recalibrate',
            value: false
          },
          confirm: true
        }
      }).then((isConfirm) => {
        if (isConfirm) {
          // clear the calibration & hide the last middle button
          clearCanvas();
        } else {
          // use restart function to restart the calibration
          accuracyNode.innerHTML = '<a>Not yet Calibrated</a>';
          webgazer.clearData();
          clearCalibration();
          clearCanvas();
          calibrateBorders();
        }
      });
    }, 5000);
  });
};

/**
 * This function occurs on resizing the frame
 * clears the canvas & then resizes it (as plots have moved position, can't resize without clear)
 */
const resize = () => {
  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById('plotting_canvas')
  );
  if (!canvas) return console.error('Canvas plotting_canvas not found');
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.addEventListener('resize', resize, false);

class CalibrationPoint {
  static CALIBRATION_THRESHOLD = 5;

  /**
   * @param {HTMLElement} node - The DOM node representing the calibration point
   * @param {() => void} onCalibrated - Callback function to be called when the point is calibrated
   */
  constructor (node, onCalibrated) {
    this.node = node;
    this.clickCount = 0;
    this.isCalibrated = false;
    this.onCalibrated = onCalibrated;
    this.node.addEventListener('click', () => this.click());
  }

  get id () {
    return this.node.id;
  }

  /**
   * Handles a click on the calibration point
   * @returns {boolean} - True if the point has just been calibrated, false otherwise
   */
  click () {
    this.clickCount++;

    if (this.clickCount > CalibrationPoint.CALIBRATION_THRESHOLD) return false;
    else if (this.clickCount === CalibrationPoint.CALIBRATION_THRESHOLD) {
      this.isCalibrated = true;
      this.node.style.setProperty('background-color', 'green');
      this.node.style.setProperty('opacity', '1');
      this.node.setAttribute('disabled', 'disabled');
      this.onCalibrated();
      return true;
    } else {
      const opacity = 0.2 + 0.2 * this.clickCount;
      this.node.style.setProperty('opacity', opacity.toString());
      return false;
    }
  }

  /**
   * Resets the calibration point to its initial state
   */
  reset () {
    this.clickCount = 0;
    this.isCalibrated = false;
    this.show();
    this.node.style.setProperty('background-color', 'red');
    this.node.style.setProperty('opacity', '0.2');
    this.node.removeAttribute('disabled');
  }

  /**
   * Shows the calibration point
   */
  show () {
    this.node.style.setProperty('display', 'block');
  }

  /**
   * Hides the calibration point
   */
  hide () {
    this.node.style.setProperty('display', 'none');
  }

  /**
   * Checks if this is the middle calibration point
   * @returns {boolean}
   */
  isMiddlePoint () {
    return this.id === 'Pt5';
  }
}

const calibrateBorders = () => {
  calibrationPoints.forEach(point => {
    if (point.isMiddlePoint()) {
      point.hide();
    } else {
      point.show();
    }
  });
};

const calibrateMiddle = () => {
  calibrationPoints.forEach(point => {
    if (point.isMiddlePoint()) {
      point.show();
    } else {
      point.hide();
    }
  });
};
