// @ts-check
import { WebGazer } from '../lib/webgazer.js';
import heatmap from '../lib/heatmap.min.js';

// Heatmap configuration
const HEATMAP_CONFIG = {
  radius: 25,
  maxOpacity: 0.5,
  minOpacity: 0,
  blur: 0.75
};

/** @type {{ addData: (point: { x: number; y: number; value: number }) => void }} */
let heatmapInstance;

// Create WebGazer instance
const webgazer = new WebGazer({
  regression: 'ridgeReg',
  // Set to true if you want to save the data even if you reload the page.
  saveDataAcrossSessions: false,
  useKalmanFilter: true,
  // Needed so we can have just the click listener without the move listener
  // (The move listener was creating a lot of drift)
  useCalibration: 'click'
});

window.addEventListener('load', async function () {
  // Init webgazer
  await webgazer.start({
    gazeDot: false,
    gazeTrail: false
  });

  // Set up heatmap parts
  setupHeatmap();
  webgazer.addGazeListener(eyeListener);
});

window.addEventListener('beforeunload', function () {
  webgazer.destroy();
});

// Trimmed down version of webgazer's click listener since the built-in one isn't exported
// Needed so we can have just the click listener without the move listener
// (The move listener was creating a lot of drift)

const setupHeatmap = () => {
  // Set up the container
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  // create heatmap
  // TODO better type, or switch heatmap to a new library
  heatmapInstance = heatmap.create({ ...HEATMAP_CONFIG, container });
};

// Heatmap buffer
/** @type {number} */
let lastTime;
/** @type {{x: number; y: number} | undefined} */
let lastGaze;

const eyeListener = (/** @type {{x: number; y: number} | undefined} */ data, /** @type {number} */ clock) => {
  // data is the gaze data, clock is the time since webgazer.begin()

  // Init if lastTime not set
  if (!lastTime) {
    lastTime = clock;
  }

  // In this we want to track how long a point was being looked at,
  // so we need to buffer where the gaze moves to and then on next move
  // we calculate how long the gaze stayed there.
  if (lastGaze) {
    if (!!lastGaze.x && !!lastGaze.y) {
      const duration = clock - lastTime;
      const point = {
        x: Math.floor(lastGaze.x),
        y: Math.floor(lastGaze.y),
        value: duration
      };
      heatmapInstance.addData(point);
    }
  }

  lastGaze = data;
  lastTime = clock;
};
