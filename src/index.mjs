import '@tensorflow/tfjs';
//import(/* webpackPreload: true */ '@tensorflow/tfjs');
//import(/* webpackChunkName: 'pageA' */ './vendors~main.js')

import 'regression';
import params from './params';
import './dom_util';
import localforage from 'localforage';
import TFFaceMesh from './facemesh';
import Reg from './ridgeReg';
import ridgeRegWeighted from './ridgeWeightedReg';
import ridgeRegThreaded from './ridgeRegThreaded';
import util from './util';

const webgazer = {};
webgazer.tracker = {};
webgazer.tracker.TFFaceMesh = TFFaceMesh;
webgazer.reg = Reg;
webgazer.reg.RidgeWeightedReg = ridgeRegWeighted.RidgeWeightedReg;
webgazer.reg.RidgeRegThreaded = ridgeRegThreaded.RidgeRegThreaded;
webgazer.util = util;
webgazer.params = params;

//PRIVATE VARIABLES

//video elements
var videoStream = null;
var videoContainerElement = null;
var videoElement = null;
var videoElementCanvas = null;
var faceOverlay = null;
var faceFeedbackBox = null;
var gazeDot = null;
// Why is this not in webgazer.params ?
var debugVideoLoc = '';

/*
 * Initialises variables used to store accuracy eigenValues
 * This is used by the calibration example file
 */
var xPast50 = new Array(50);
var yPast50 = new Array(50);

// loop parameters
var clockStart = performance.now();
var latestEyeFeatures = null;
var latestGazeData = null;
var paused = false;
//registered callback for loop
var nopCallback = function(data, time) {};
var callback = nopCallback;

//Types that regression systems should handle
//Describes the source of data so that regression systems may ignore or handle differently the various generating events
var eventTypes = ['click', 'move'];

//movelistener timeout clock parameters
var moveClock = performance.now();
//currently used tracker and regression models, defaults to clmtrackr and linear regression
var curTracker = new webgazer.tracker.TFFaceMesh();
var regs = [new webgazer.reg.RidgeReg()];
// var blinkDetector = new webgazer.BlinkDetector();

//lookup tables
var curTrackerMap = {
  'TFFacemesh': function() { return new webgazer.tracker.TFFaceMesh(); },
};
var regressionMap = {
  'ridge': function() { return new webgazer.reg.RidgeReg(); },
  'weightedRidge': function() { return new webgazer.reg.RidgeWeightedReg(); },
  'threadedRidge': function() { return new webgazer.reg.RidgeRegThreaded(); },
};

//localstorage name
var localstorageDataLabel = 'webgazerGlobalData';
var localstorageSettingsLabel = 'webgazerGlobalSettings';
//settings object for future storage of settings
var settings = {};
var data = [];
var defaults = {
  'data': [],
  'settings': {}
};


//PRIVATE FUNCTIONS

/**
 * Computes the size of the face overlay validation box depending on the size of the video preview window.
 * @returns {Object} The dimensions of the validation box as top, left, width, height.
 */
webgazer.computeValidationBoxSize = function() {

  var vw = videoElement.videoWidth;
  var vh = videoElement.videoHeight;
  var pw = parseInt(videoElement.style.width);
  var ph = parseInt(videoElement.style.height);

  // Find the size of the box.
  // Pick the smaller of the two video preview sizes
  var smaller = Math.min( vw, vh );
  var larger  = Math.max( vw, vh );

  // Overall scalar
  var scalar = ( vw == larger ? pw / vw : ph / vh );

  // Multiply this by 2/3, then adjust it to the size of the preview
  var boxSize = (smaller * webgazer.params.faceFeedbackBoxRatio) * scalar;

  // Set the boundaries of the face overlay validation box based on the preview
  var topVal = (ph - boxSize)/2;
  var leftVal = (pw - boxSize)/2;

  // top, left, width, height
  return [topVal, leftVal, boxSize, boxSize]
}

/**
 * Checks if the pupils are in the position box on the video
 * // TODO These are all wrong. The latestEyeFeatures will be in 'video' space not 'preview' space, and so need to be converted.
 */
function checkEyesInValidationBox() {

  if (faceFeedbackBox != null && latestEyeFeatures) {
    var w = videoElement.videoWidth;
    var h = videoElement.videoHeight;

    // Find the size of the box.
    // Pick the smaller of the two video preview sizes
    var smaller = Math.min( w, h );
    var boxSize = smaller * webgazer.params.faceFeedbackBoxRatio;

    // Set the boundaries of the face overlay validation box based on the preview
    var topBound = (h - boxSize)/2;
    var leftBound = (w - boxSize)/2;
    var rightBound = leftBound + boxSize;
    var bottomBound = topBound + boxSize;

    //get the x and y positions of the left and right eyes
    var eyeLX = latestEyeFeatures.left.imagex;
    var eyeLY = latestEyeFeatures.left.imagey;
    var eyeRX = latestEyeFeatures.right.imagex;
    var eyeRY = latestEyeFeatures.right.imagey;


    var xPositions = false;
    var yPositions = false;

    //check if the x values for the left and right eye are within the
    //validation box
    if (eyeLX > leftBound && eyeLX < rightBound) {
      if (eyeRX > leftBound && eyeRX < rightBound) {
        xPositions = true;
      }
    }

    //check if the y values for the left and right eye are within the
    //validation box
    if (eyeLY > topBound && eyeLY < bottomBound) {
      if (eyeRY > topBound && eyeRY < bottomBound) {
        yPositions = true;
      }
    }

    //if the x and y values for both the left and right eye are within
    //the validation box then the box border turns green, otherwise if
    //the eyes are outside of the box the colour is red
    if (xPositions && yPositions){
      faceFeedbackBox.style.border = 'solid green';
    } else {
      faceFeedbackBox.style.border = 'solid red';
    }
  }
  else
    faceFeedbackBox.style.border = 'solid black';
}

/**
 * This draws the point (x,y) onto the canvas in the HTML
 * @param {colour} colour - The colour of the circle to plot
 * @param {x} x - The x co-ordinate of the desired point to plot
 * @param {y} y - The y co-ordinate of the desired point to plot
 */
function drawCoordinates(colour,x,y){
  var ctx = document.getElementById("plotting_canvas").getContext('2d');
  ctx.fillStyle = colour; // Red color
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2, true);
  ctx.fill();
}

/**
 * Gets the pupil features by following the pipeline which threads an eyes object through each call:
 * curTracker gets eye patches -> blink detector -> pupil detection
 * @param {Canvas} canvas - a canvas which will have the video drawn onto it
 * @param {Number} width - the width of canvas
 * @param {Number} height - the height of canvas
 */
function getPupilFeatures(canvas, width, height) {
  if (!canvas) {
    return;
  }
  try {
    return curTracker.getEyePatches(canvas, width, height);
  } catch(err) {
    console.log("can't get pupil features ", err);
    return null;
  }
}

/**
 * Gets the most current frame of video and paints it to a resized version of the canvas with width and height
 * @param {Canvas} canvas - the canvas to paint the video on to
 * @param {Number} width - the new width of the canvas
 * @param {Number} height - the new height of the canvas
 */
function paintCurrentFrame(canvas, width, height) {
  if (canvas.width != width) {
    canvas.width = width;
  }
  if (canvas.height != height) {
    canvas.height = height;
  }

  var ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
}

/**
 * Paints the video to a canvas and runs the prediction pipeline to get a prediction
 * @param {Number|undefined} regModelIndex - The prediction index we're looking for
 * @returns {*}
 */
async function getPrediction(regModelIndex) {
  var predictions = [];
  // [20200617 xk] TODO: this call should be made async somehow. will take some work.
  latestEyeFeatures = await getPupilFeatures(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height);

  if (regs.length === 0) {
    console.log('regression not set, call setRegression()');
    return null;
  }
  for (var reg in regs) {
    predictions.push(regs[reg].predict(latestEyeFeatures));
  }
  if (regModelIndex !== undefined) {
    return predictions[regModelIndex] === null ? null : {
      'x' : predictions[regModelIndex].x,
      'y' : predictions[regModelIndex].y,
      'eyeFeatures': latestEyeFeatures
    };
  } else {
    return predictions.length === 0 || predictions[0] === null ? null : {
      'x' : predictions[0].x,
      'y' : predictions[0].y,
      'eyeFeatures': latestEyeFeatures,
      'all' : predictions
    };
  }
}

/**
 * Runs every available animation frame if webgazer is not paused
 */
var smoothingVals = new util.DataWindow(4);
var k = 0;

async function loop() {
  if (!paused) {

    // [20200617 XK] TODO: there is currently lag between the camera input and the face overlay. This behavior
    // is not seen in the facemesh demo. probably need to optimize async implementation. I think the issue lies
    // in the implementation of getPrediction().

    // Paint the latest video frame into the canvas which will be analyzed by WebGazer
    // [20180729 JT] Why do we need to do this? clmTracker does this itself _already_, which is just duplicating the work.
    // Is it because other trackers need a canvas instead of an img/video element?
    paintCurrentFrame(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height);

    // Get gaze prediction (ask clm to track; pass the data to the regressor; get back a prediction)
    latestGazeData = getPrediction();
    // Count time
    var elapsedTime = performance.now() - clockStart;


    // Draw face overlay
    if( webgazer.params.showFaceOverlay )
    {
      // Get tracker object
      var tracker = webgazer.getTracker();
      faceOverlay.getContext('2d').clearRect( 0, 0, videoElement.videoWidth, videoElement.videoHeight);
      tracker.drawFaceOverlay(faceOverlay.getContext('2d'), tracker.getPositions());
    }

    // Feedback box
    // Check that the eyes are inside of the validation box
    if( webgazer.params.showFaceFeedbackBox )
      checkEyesInValidationBox();

    latestGazeData = await latestGazeData;

    // [20200623 xk] callback to function passed into setGazeListener(fn)
    callback(latestGazeData, elapsedTime);

    if( latestGazeData ) {
      // [20200608 XK] Smoothing across the most recent 4 predictions, do we need this with Kalman filter?
      smoothingVals.push(latestGazeData);
      var x = 0;
      var y = 0;
      var len = smoothingVals.length;
      for (var d in smoothingVals.data) {
        x += smoothingVals.get(d).x;
        y += smoothingVals.get(d).y;
      }

      var pred = util.bound({'x':x/len, 'y':y/len});

      if (webgazer.params.storingPoints) {
        drawCoordinates('blue',pred.x,pred.y); //draws the previous predictions
        //store the position of the past fifty occuring tracker preditions
        webgazer.storePoints(pred.x, pred.y, k);
        k++;
        if (k == 50) {
          k = 0;
        }
      }
      // GazeDot
      if (webgazer.params.showGazeDot) {
        gazeDot.style.display = 'block';
      }
      gazeDot.style.transform = 'translate3d(' + pred.x + 'px,' + pred.y + 'px,0)';
    } else {
      gazeDot.style.display = 'none';
    }

    requestAnimationFrame(loop);
  }
}

//is problematic to test
//because latestEyeFeatures is not set in many cases

/**
 * Records screen position data based on current pupil feature and passes it
 * to the regression model.
 * @param {Number} x - The x screen position
 * @param {Number} y - The y screen position
 * @param {String} eventType - The event type to store
 * @returns {null}
 */
var recordScreenPosition = function(x, y, eventType) {
  if (paused) {
    return;
  }
  if (regs.length === 0) {
    console.log('regression not set, call setRegression()');
    return null;
  }
  for (var reg in regs) {
    if( latestEyeFeatures )
      regs[reg].addData(latestEyeFeatures, [x, y], eventType);
  }
};

/**
 * Records click data and passes it to the regression model
 * @param {Event} event - The listened event
 */
var clickListener = async function(event) {
  recordScreenPosition(event.clientX, event.clientY, eventTypes[0]); // eventType[0] === 'click'

  if (webgazer.params.saveDataAcrossSessions) {
    // Each click stores the next data point into localforage.
    await setGlobalData();

    // // Debug line
    // console.log('Model size: ' + JSON.stringify(await localforage.getItem(localstorageDataLabel)).length / 1000000 + 'MB');
  }
};

/**
 * Records mouse movement data and passes it to the regression model
 * @param {Event} event - The listened event
 */
var moveListener = function(event) {
  if (paused) {
    return;
  }

  var now = performance.now();
  if (now < moveClock + webgazer.params.moveTickSize) {
    return;
  } else {
    moveClock = now;
  }
  recordScreenPosition(event.clientX, event.clientY, eventTypes[1]); //eventType[1] === 'move'
};

/**
 * Add event listeners for mouse click and move.
 */
var addMouseEventListeners = function() {
  //third argument set to true so that we get event on 'capture' instead of 'bubbling'
  //this prevents a client using event.stopPropagation() preventing our access to the click
  document.addEventListener('click', clickListener, true);
  document.addEventListener('mousemove', moveListener, true);
};

/**
 * Remove event listeners for mouse click and move.
 */
var removeMouseEventListeners = function() {
  // must set third argument to same value used in addMouseEventListeners
  // for this to work.
  document.removeEventListener('click', clickListener, true);
  document.removeEventListener('mousemove', moveListener, true);
};

/**
 * Loads the global data and passes it to the regression model
 */
async function loadGlobalData() {
  // Get settings object from localforage
  // [20200611 xk] still unsure what this does, maybe would be good for Kalman filter settings etc?
  settings = await localforage.getItem(localstorageSettingsLabel);
  settings = settings || defaults;

  // Get click data from localforage
  var loadData = await localforage.getItem(localstorageDataLabel);
  loadData = loadData || defaults;

  // Set global var data to newly loaded data
  data = loadData;

  // Load data into regression model(s)
  for (var reg in regs) {
    regs[reg].setData(loadData);
  }

  console.log("loaded stored data into regression model");
}

/**
 * Adds data to localforage
 */
async function setGlobalData() {
  // Grab data from regression model
  var storeData = regs[0].getData() || data; // Array

  // Store data into localforage
  localforage.setItem(localstorageSettingsLabel, settings) // [20200605 XK] is 'settings' ever being used?
  localforage.setItem(localstorageDataLabel, storeData);
  //TODO data should probably be stored in webgazer object instead of each regression model
  //     -> requires duplication of data, but is likely easier on regression model implementors
}

/**
 * Clears data from model and global storage
 */
function clearData() {
  // Removes data from localforage
  localforage.clear();

  // Removes data from regression model
  for (var reg in regs) {
    regs[reg].init();
  }
}

/**
 * Initializes all needed dom elements and begins the loop
 * @param {URL} stream - The video stream to use
 */
async function init(stream) {
  //////////////////////////
  // Video and video preview
  //////////////////////////
  var topDist = '0px'
  var leftDist = '0px'

  // used for webgazer.stopVideo() and webgazer.setCameraConstraints()
  videoStream = stream;

  // create a video element container to enable customizable placement on the page
  videoContainerElement = document.createElement('div');
  videoContainerElement.id = webgazer.params.videoContainerId;
  videoContainerElement.style.display = webgazer.params.showVideo ? 'block' : 'none';
  videoContainerElement.style.position = 'fixed';
  videoContainerElement.style.top = topDist;
  videoContainerElement.style.left = leftDist;
  videoContainerElement.style.width = webgazer.params.videoViewerWidth + 'px';
  videoContainerElement.style.height = webgazer.params.videoViewerHeight + 'px';
  
  videoElement = document.createElement('video');
  videoElement.setAttribute('playsinline', '');
  videoElement.id = webgazer.params.videoElementId;
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  videoElement.style.display = webgazer.params.showVideo ? 'block' : 'none';
  videoElement.style.position = 'absolute';
  // We set these to stop the video appearing too large when it is added for the very first time
  videoElement.style.width = webgazer.params.videoViewerWidth + 'px';
  videoElement.style.height = webgazer.params.videoViewerHeight + 'px';
  // videoElement.style.zIndex="-1";

  // Canvas for drawing video to pass to clm tracker
  videoElementCanvas = document.createElement('canvas');
  videoElementCanvas.id = webgazer.params.videoElementCanvasId;
  videoElementCanvas.style.display = 'none';

  // Face overlay
  // Shows the CLM tracking result
  faceOverlay = document.createElement('canvas');
  faceOverlay.id = webgazer.params.faceOverlayId;
  faceOverlay.style.display = webgazer.params.showFaceOverlay ? 'block' : 'none';
  faceOverlay.style.position = 'absolute';

  // Mirror video feed
  if (webgazer.params.mirrorVideo) {
    videoElement.style.setProperty("-moz-transform", "scale(-1, 1)");
    videoElement.style.setProperty("-webkit-transform", "scale(-1, 1)");
    videoElement.style.setProperty("-o-transform", "scale(-1, 1)");
    videoElement.style.setProperty("transform", "scale(-1, 1)");
    videoElement.style.setProperty("filter", "FlipH");
    faceOverlay.style.setProperty("-moz-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("-webkit-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("-o-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("filter", "FlipH");
  }

  // Feedback box
  // Lets the user know when their face is in the middle
  faceFeedbackBox = document.createElement('canvas');
  faceFeedbackBox.id = webgazer.params.faceFeedbackBoxId;
  faceFeedbackBox.style.display = webgazer.params.showFaceFeedbackBox ? 'block' : 'none';
  faceFeedbackBox.style.border = 'solid';
  faceFeedbackBox.style.position = 'absolute';

  // Gaze dot
  // Starts offscreen
  gazeDot = document.createElement('div');
  gazeDot.id = webgazer.params.gazeDotId;
  gazeDot.style.display = webgazer.params.showGazeDot ? 'block' : 'none';
  gazeDot.style.position = 'fixed';
  gazeDot.style.zIndex = 99999;
  gazeDot.style.left = '-5px'; //'-999em';
  gazeDot.style.top  = '-5px';
  gazeDot.style.background = 'red';
  gazeDot.style.borderRadius = '100%';
  gazeDot.style.opacity = '0.7';
  gazeDot.style.width = '10px';
  gazeDot.style.height = '10px';

  // Add other preview/feedback elements to the screen once the video has shown and its parameters are initialized
  videoContainerElement.appendChild(videoElement);
  document.body.appendChild(videoContainerElement);
  function setupPreviewVideo(e) {

    // All video preview parts have now been added, so set the size both internally and in the preview window.
    setInternalVideoBufferSizes( videoElement.videoWidth, videoElement.videoHeight );
    webgazer.setVideoViewerSize( webgazer.params.videoViewerWidth, webgazer.params.videoViewerHeight );

    videoContainerElement.appendChild(videoElementCanvas);
    videoContainerElement.appendChild(faceOverlay);
    videoContainerElement.appendChild(faceFeedbackBox);
    document.body.appendChild(gazeDot);

    // Run this only once, so remove the event listener
    e.target.removeEventListener(e.type, setupPreviewVideo);
  };
  videoElement.addEventListener('timeupdate', setupPreviewVideo);

  addMouseEventListeners();

  //BEGIN CALLBACK LOOP
  paused = false;
  clockStart = performance.now();

  await loop();
}

/**
 * Initializes navigator.mediaDevices.getUserMedia
 * depending on the browser capabilities
 * 
 * @return Promise 
 */
function setUserMediaVariable(){

  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

      // gets the alternative old getUserMedia is possible
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // set an error message if browser doesn't support getUserMedia
      if (!getUserMedia) {
        return Promise.reject(new Error("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead."));
      }

      // uses navigator.getUserMedia for older browsers
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }
}

//PUBLIC FUNCTIONS - CONTROL

/**
 * Starts all state related to webgazer -> dataLoop, video collection, click listener
 * If starting fails, call `onFail` param function.
 * @param {Function} onFail - Callback to call in case it is impossible to find user camera
 * @returns {*}
 */
webgazer.begin = function(onFail) {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.chrome){
    alert("WebGazer works only over https. If you are doing local development, you need to run a local server.");
  }

  // Load model data stored in localforage.
  if (webgazer.params.saveDataAcrossSessions) {
    loadGlobalData();
  }

  onFail = onFail || function() {console.log('No stream')};

  if (debugVideoLoc) {
    init(debugVideoLoc);
    return webgazer;
  }

  ///////////////////////
  // SETUP VIDEO ELEMENTS
  // Sets .mediaDevices.getUserMedia depending on browser
  setUserMediaVariable();

  // Request webcam access under specific constraints
  // WAIT for access
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia( webgazer.params.camConstraints );
      init(stream);
      resolve(webgazer);
    } catch(err) {
      onFail();
      videoElement = null;
      stream = null;
      reject(err);
    }
  });
};


/**
 * Checks if webgazer has finished initializing after calling begin()
 * [20180729 JT] This seems like a bad idea for how this function should be implemented.
 * @returns {boolean} if webgazer is ready
 */
webgazer.isReady = function() {
  if (videoElementCanvas === null) {
    return false;
  }
  return videoElementCanvas.width > 0;
};

/**
 * Stops collection of data and predictions
 * @returns {webgazer} this
 */
webgazer.pause = function() {
  paused = true;
  return webgazer;
};

/**
 * Resumes collection of data and predictions if paused
 * @returns {webgazer} this
 */
webgazer.resume = async function() {
  if (!paused) {
    return webgazer;
  }
  paused = false;
  await loop();
  return webgazer;
};

/**
 * stops collection of data and removes dom modifications, must call begin() to reset up
 * @return {webgazer} this
 */
webgazer.end = function() {
  //loop may run an extra time and fail due to removed elements
  paused = true;

  //webgazer.stopVideo(); // uncomment if you want to stop the video from streaming

  //remove video element and canvas
  document.body.removeChild(videoElement);
  document.body.removeChild(videoElementCanvas);

  return webgazer;
};

/**
 * Stops the video camera from streaming and removes the video outlines
 * @return {webgazer} this
 */
webgazer.stopVideo = function() {
  // Stops the video from streaming
  videoStream.getTracks()[0].stop();

  // Removes the outline of the face
  document.body.removeChild( faceOverlay );

  // Removes the box around the face
  document.body.removeChild( faceFeedbackBox );

  return webgazer;
}


//PUBLIC FUNCTIONS - DEBUG

/**
 * Returns if the browser is compatible with webgazer
 * @return {boolean} if browser is compatible
 */
webgazer.detectCompatibility = function() {

  var getUserMedia = navigator.mediaDevices.getUserMedia ||
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  return getUserMedia !== undefined;
};

/**
 * Set whether to show any of the video previews (camera, face overlay, feedback box).
 * If true: visibility depends on corresponding params (default all true).
 * If false: camera, face overlay, feedback box are all hidden
 * @param {bool} val
 * @return {webgazer} this
 */
webgazer.showVideoPreview = function(val) {
  webgazer.params.showVideoPreview = val;
  webgazer.showVideo(val && webgazer.params.showVideo);
  webgazer.showFaceOverlay(val && webgazer.params.showFaceOverlay);
  webgazer.showFaceFeedbackBox(val && webgazer.params.showFaceFeedbackBox);
  return webgazer;
}

/**
 * Set whether the camera video preview is visible or not (default true).
 * @param {*} bool
 * @return {webgazer} this
 */
webgazer.showVideo = function(val) {
  webgazer.params.showVideo = val;
  if(videoElement) {
    videoElement.style.display = val ? 'block' : 'none';
  }
  if(videoContainerElement) {
    videoContainerElement.style.display = val ? 'block' : 'none';
  }
  return webgazer;
};

/**
 * Set whether the face overlay is visible or not (default true).
 * @param {*} bool
 * @return {webgazer} this
 */
webgazer.showFaceOverlay = function(val) {
  webgazer.params.showFaceOverlay = val;
  if( faceOverlay ) {
    faceOverlay.style.display = val ? 'block' : 'none';
  }
  return webgazer;
};

/**
 * Set whether the face feedback box is visible or not (default true).
 * @param {*} bool
 * @return {webgazer} this
 */
webgazer.showFaceFeedbackBox = function(val) {

  webgazer.params.showFaceFeedbackBox = val;
  if( faceFeedbackBox ) {
    faceFeedbackBox.style.display = val ? 'block' : 'none';
  }
  return webgazer;
};

/**
 * Set whether the gaze prediction point(s) are visible or not.
 * Multiple because of a trail of past dots. Default true
 * @return {webgazer} this
 */
webgazer.showPredictionPoints = function(val) {
  webgazer.params.showGazeDot = val;
  if( gazeDot ) {
    gazeDot.style.display = val ? 'block' : 'none';
  }
  return webgazer;
};

/**
 * Set whether localprevious calibration data (from localforage) should be loaded.
 * Default true.
 * 
 * NOTE: Should be called before webgazer.begin() -- see www/js/main.js for example
 * 
 * @param val 
 * @returns {webgazer} this
 */
webgazer.saveDataAcrossSessions = function(val) {
  webgazer.params.saveDataAcrossSessions = val;
  return webgazer;
}

/**
 * Set whether a Kalman filter will be applied to gaze predictions (default true);
 * @return {webgazer} this
 */
webgazer.applyKalmanFilter = function(val) {
  webgazer.params.applyKalmanFilter = val;
  return webgazer;
}

/**
 * Define constraints on the video camera that is used. Useful for non-standard setups.
 * This can be set before calling webgazer.begin(), but also mid stream.
 *
 * @param {Object} constraints Example constraints object:
 * { width: { min: 320, ideal: 1280, max: 1920 }, height: { min: 240, ideal: 720, max: 1080 }, facingMode: "user" };
 *
 * Follows definition here:
 * https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints
 *
 * Note: The constraints set here are applied to the video track only. They also _replace_ any constraints, so be sure to set everything you need.
 * Warning: Setting a large video resolution will decrease performance, and may require
 */
webgazer.setCameraConstraints = async function(constraints) {
  var videoTrack,videoSettings;
  webgazer.params.camConstraints = constraints;

  // If the camera stream is already up...
  if(videoStream)
  {
    webgazer.pause();
    videoTrack = videoStream.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints( webgazer.params.camConstraints );
      videoSettings = videoTrack.getSettings();
      setInternalVideoBufferSizes( videoSettings.width, videoSettings.height );
    } catch(err) {
      console.log( err );
      return;
    }
    // Reset and recompute sizes of the video viewer.
    // This is only to adjust the feedback box, say, if the aspect ratio of the video has changed.
    webgazer.setVideoViewerSize( webgazer.params.videoViewerWidth, webgazer.params.videoViewerHeight )
    webgazer.getTracker().reset();
    await webgazer.resume();
  }
}


/**
 * Does what it says on the tin.
 * @param {*} width
 * @param {*} height
 */
function setInternalVideoBufferSizes( width, height ) {
  // Re-set the canvas size used by the internal processes
  if( videoElementCanvas )
  {
    videoElementCanvas.width = width;
    videoElementCanvas.height = height;
  }

  // Re-set the face overlay canvas size
  if( faceOverlay )
  {
    faceOverlay.width = width;
    faceOverlay.height = height;
  }
}

/**
 *  Set a static video file to be used instead of webcam video
 *  @param {String} videoLoc - video file location
 *  @return {webgazer} this
 */
webgazer.setStaticVideo = function(videoLoc) {
  debugVideoLoc = videoLoc;
  return webgazer;
};

/**
 * Set the size of the video viewer
 */
webgazer.setVideoViewerSize = function(w, h) {

  webgazer.params.videoViewerWidth = w;
  webgazer.params.videoViewerHeight = h;

  // Change the video viewer
  videoElement.style.width = w + 'px';
  videoElement.style.height = h + 'px';

  // Change the face overlay
  faceOverlay.style.width = w + 'px';
  faceOverlay.style.height = h + 'px';

  // Change the feedback box size
  // Compute the boundaries of the face overlay validation box based on the video size
  var tlwh = webgazer.computeValidationBoxSize()
  // Assign them to the object
  faceFeedbackBox.style.top = tlwh[0] + 'px';
  faceFeedbackBox.style.left = tlwh[1] + 'px';
  faceFeedbackBox.style.width = tlwh[2] + 'px';
  faceFeedbackBox.style.height = tlwh[3] + 'px';
};

/**
 *  Add the mouse click and move listeners that add training data.
 *  @return {webgazer} this
 */
webgazer.addMouseEventListeners = function() {
  addMouseEventListeners();
  return webgazer;
};

/**
 *  Remove the mouse click and move listeners that add training data.
 *  @return {webgazer} this
 */
webgazer.removeMouseEventListeners = function() {
  removeMouseEventListeners();
  return webgazer;
};

/**
 *  Records current screen position for current pupil features.
 *  @param {String} x - position on screen in the x axis
 *  @param {String} y - position on screen in the y axis
 *  @param {String} eventType - "click" or "move", as per eventTypes
 *  @return {webgazer} this
 */
webgazer.recordScreenPosition = function(x, y, eventType) {
  // give this the same weight that a click gets.
  recordScreenPosition(x, y, eventType || eventTypes[0]);
  return webgazer;
};

/*
 * Stores the position of the fifty most recent tracker preditions
 */
webgazer.storePoints = function(x, y, k) {
  xPast50[k] = x;
  yPast50[k] = y;
}

//SETTERS
/**
 * Sets the tracking module
 * @param {String} name - The name of the tracking module to use
 * @return {webgazer} this
 */
webgazer.setTracker = function(name) {
  if (curTrackerMap[name] === undefined) {
    console.log('Invalid tracker selection');
    console.log('Options are: ');
    for (var t in curTrackerMap) {
      console.log(t);
    }
    return webgazer;
  }
  curTracker = curTrackerMap[name]();
  return webgazer;
};

/**
 * Sets the regression module and clears any other regression modules
 * @param {String} name - The name of the regression module to use
 * @return {webgazer} this
 */
webgazer.setRegression = function(name) {
  if (regressionMap[name] === undefined) {
    console.log('Invalid regression selection');
    console.log('Options are: ');
    for (var reg in regressionMap) {
      console.log(reg);
    }
    return webgazer;
  }
  data = regs[0].getData();
  regs = [regressionMap[name]()];
  regs[0].setData(data);
  return webgazer;
};

/**
 * Adds a new tracker module so that it can be used by setTracker()
 * @param {String} name - the new name of the tracker
 * @param {Function} constructor - the constructor of the curTracker object
 * @return {webgazer} this
 */
webgazer.addTrackerModule = function(name, constructor) {
  curTrackerMap[name] = function() {
    return new constructor();
  };
};

/**
 * Adds a new regression module so that it can be used by setRegression() and addRegression()
 * @param {String} name - the new name of the regression
 * @param {Function} constructor - the constructor of the regression object
 */
webgazer.addRegressionModule = function(name, constructor) {
  regressionMap[name] = function() {
    return new constructor();
  };
};

/**
 * Adds a new regression module to the list of regression modules, seeding its data from the first regression module
 * @param {String} name - the string name of the regression module to add
 * @return {webgazer} this
 */
webgazer.addRegression = function(name) {
  var newReg = regressionMap[name]();
  data = regs[0].getData();
  newReg.setData(data);
  regs.push(newReg);
  return webgazer;
};

/**
 * Sets a callback to be executed on every gaze event (currently all time steps)
 * @param {function} listener - The callback function to call (it must be like function(data, elapsedTime))
 * @return {webgazer} this
 */
webgazer.setGazeListener = function(listener) {
  callback = listener;
  return webgazer;
};

/**
 * Removes the callback set by setGazeListener
 * @return {webgazer} this
 */
webgazer.clearGazeListener = function() {
  callback = nopCallback;
  return webgazer;
};

/**
 * Set the video element canvas; useful if you want to run WebGazer on your own canvas (e.g., on any random image).
 * @return The current video element canvas
 */
webgazer.setVideoElementCanvas = function(canvas) {
  videoElementCanvas = canvas;
  return videoElementCanvas;
}

/**
 * Clear data from localforage and from regs
 */
webgazer.clearData = async function() {
  clearData();
}


//GETTERS
/**
 * Returns the tracker currently in use
 * @return {tracker} an object following the tracker interface
 */
webgazer.getTracker = function() {
  return curTracker;
};

/**
 * Returns the regression currently in use
 * @return {Array.<Object>} an array of regression objects following the regression interface
 */
webgazer.getRegression = function() {
  return regs;
};

/**
 * Requests an immediate prediction
 * @return {object} prediction data object
 */
webgazer.getCurrentPrediction = function(regIndex) {
  return getPrediction(regIndex);
};

/**
 * returns the different event types that may be passed to regressions when calling regression.addData()
 * @return {Array} array of strings where each string is an event type
 */
webgazer.params.getEventTypes = function() {
  return eventTypes.slice();
}

/**
 * Get the video element canvas that WebGazer uses internally on which to run its face tracker.
 * @return The current video element canvas
 */
webgazer.getVideoElementCanvas = function() {
  return videoElementCanvas;
}

/**
 * @return array [a,b] where a is width ratio and b is height ratio
 */
webgazer.getVideoPreviewToCameraResolutionRatio = function() {
  return [webgazer.params.videoViewerWidth / videoElement.videoWidth, webgazer.params.videoViewerHeight / videoElement.videoHeight];
}

/*
 * Gets the fifty most recent tracker preditions
 */
webgazer.getStoredPoints = function() {
  return [xPast50, yPast50];
}

export default webgazer;
