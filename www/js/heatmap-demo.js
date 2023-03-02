// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = false;

// heatmap configuration
const config = {
  radius: 25,
  maxOpacity: .5,
  minOpacity: 0,
  blur: .75
};

// Global variables
let heatmapInstance;

window.addEventListener('load', async function() {
  // Init webgazer
  if (!window.saveDataAcrossSessions) {
      var localstorageDataLabel = 'webgazerGlobalData';
      localforage.setItem(localstorageDataLabel, null);
      var localstorageSettingsLabel = 'webgazerGlobalSettings';
      localforage.setItem(localstorageSettingsLabel, null);
  }
  const webgazerInstance = await webgazer.setRegression('ridge') /* currently must set regression and tracker */
    .setTracker('TFFacemesh')
    .begin();
  
  // Turn off video
  webgazerInstance.showVideoPreview(false) /* shows all video previews */
    .showPredictionPoints(false); /* shows a square every 100 milliseconds where current prediction is */
  
    // Enable smoothing
  webgazerInstance.applyKalmanFilter(true); // Kalman Filter defaults to on.
  
  // Set up heatmap parts
  setupHeatmap();
  webgazer.setGazeListener( eyeListener );
});

window.addEventListener('beforeunload', function() {
  if (window.saveDataAcrossSessions) {
      webgazer.end();
  } else {
      localforage.clear();
  }
});

// Trimmed down version of webgazer's click listener since the built-in one isn't exported
// Needed so we can have just the click listener without the move listener
// (The move listener was creating a lot of drift)
async function clickListener(event) {
  webgazer.recordScreenPosition(event.clientX, event.clientY, 'click'); // eventType[0] === 'click'
}

function setupHeatmap() {
  // Don't use mousemove listener
  webgazer.removeMouseEventListeners();
  document.addEventListener('click', clickListener);

  // Get the window size
  let height = window.innerHeight;
  let width = window.innerWidth;

  // Set up the container
  let container = document.getElementById('heatmapContainer');
  container.style.height = `${height}px`;
  container.style.width = `${width}px`;
  config.container = container;

  // create heatmap
  heatmapInstance = h337.create(config);
}

// Heatmap buffer
let lastTime;
let lastGaze;

async function eyeListener(data, clock) {
  // data is the gaze data, clock is the time since webgazer.begin()

  // Init if lastTime not set
  if(!lastTime) {
    lastTime = clock;
  }

  // In this we want to track how long a point was being looked at,
  // so we need to buffer where the gaze moves to and then on next move
  // we calculate how long the gaze stayed there.
  if(!!lastGaze) {
    if(!!lastGaze.x && !!lastGaze.y) {
      let duration = clock-lastTime;
      let point = {
        x: Math.floor(lastGaze.x),
        y: Math.floor(lastGaze.y),
        value: duration
      }
      heatmapInstance.addData(point);
    }
  }

  lastGaze = data;
  lastTime = clock;
}
