// MISSING DEPS
// import "../dependencies/clmtrackr/mosse.js";
// import "../dependencies/clmtrackr/jsfeat-min.js";
// import "../dependencies/clmtrackr/frontalface.js";
// import "../dependencies/clmtrackr/jsfeat_detect.js";
// import "../dependencies/clmtrackr/left_eye_filter.js";
// import "../dependencies/clmtrackr/right_eye_filter.js";
// import "../dependencies/clmtrackr/nose_filter.js";
// import "../dependencies/clmtrackr/model_pca_20_svm.js";
// import "../dependencies/clmtrackr/clm.js";
// import "../dependencies/clmtrackr/svmfilter_webgl.js";
// import "../dependencies/clmtrackr/svmfilter_fft.js";
// import "../dependencies/clmtrackr/mossefilter.js";
// import "../dependencies/clmtrackr/utils.js";

/**
 * IMPORT DEPENDENCIES
 */
// tracker is located at window.tracking !
import * as Tracking from "tracking";

import {
  ObjectDetect,
  // Tracking,
  Numeric,
  supportsVideo,
  supportsH264BaselineVideo,
  supportsOggTheoraVideo
  MosseFilter,
  fastFourierTransformation
} from "../dependencies/dependencies";


console.log(Tracking);
console.log(ObjectDetect);

/**
 * IMPORT SOURCES
 */
import * as Core from "./core/core";
import * as Regression from "./regression/regressions";
import * as Tracker from "./tracker/trackers";
import * as Util from "./utils/util";

var WebGazer = (function (window) {

    //PRIVATE VARIABLES

    /**
     * Top level control module
     * @alias module:webgazer
     * @exports webgazer
     */
    //var webgazer = {};

    //params Object to be passed into tracker and regression constructors
    //contains various potentially useful knowledge like the video size and data collection rates
    //var params = {};
    var params             = {
        videoScale:           1,
        videoElementId:       'webgazerVideoFeed',
        videoElementCanvasId: 'webgazerVideoCanvas',
        imgWidth:             1280,
        imgHeight:            720,
        //Params to clmtrackr and getUserMedia constraints
        clmParams:            params.clmParams || {useWebGL: true},
        camConstraints:       params.camConstraints || {video: true},
        dataTimestep:         50,
        moveTickSize:         50 //milliseconds
    };
    var videoElement       = null;
    var videoElementCanvas = null;

    //DEBUG variables
    var showGazeDot            = false;
    //debug element (starts offscreen)
    var gazeDot                = document.createElement('div');
    gazeDot.style.position     = 'fixed';
    gazeDot.style.zIndex       = 99999;
    gazeDot.style.left         = '-5px'; //'-999em';
    gazeDot.style.top          = '-5px';
    gazeDot.style.width        = '10px';
    gazeDot.style.height       = '10px';
    gazeDot.style.background   = 'red';
    gazeDot.style.display      = 'none';
    gazeDot.style.borderRadius = '100%';
    gazeDot.style.opacity      = '0.7';

    var debugVideoLoc = '';
    // loop parameters
    var clockStart    = performance.now();
    // webgazer.params.dataTimestep = 50;
    var paused        = false;
    //registered callback for loop
    var nopCallback   = function (data, time) {
    };
    var callback      = nopCallback;

    //Types that regression systems should handle
    //Describes the source of data so that regression systems may ignore or handle differently the various generating events
    var eventTypes = ['click', 'move'];

    //movelistener timeout clock parameters
    var moveClock = performance.now();

    //currently used tracker and regression models, defaults to clmtrackr and linear regression
    var curTracker    = new Tracker.ClmGaze();
    var regs          = [new Regression.RidgeReg()];
    var blinkDetector = new Util.BlinkDetector();

    //lookup tables
    var curTrackerMap = {
        'clmtrackr':       function () {
            return new Tracker.ClmGaze();
        },
        'trackingjs':      function () {
            return new Tracker.TrackingjsGaze();
        },
        'js_objectdetect': function () {
            return new Tracker.Js_objectdetectGaze();
        }
    };
    var regressionMap = {
        'ridge':         function () {
            return new Regression.RidgeReg();
        },
        'weightedRidge': function () {
            return new Regression.RidgeWeightedReg();
        },
        'threadedRidge': function () {
            return new Regression.RidgeRegThreaded();
        },
        'linear':        function () {
            return new Regression.LinearReg();
        }
    };

    //localstorage name
    var localstorageLabel = 'webgazerGlobalData';
    //settings object for future storage of settings
    var settings          = {};
    var data              = [];
    var defaults          = {
        'data':     [],
        'settings': {}
    };

//PRIVATE FUNCTIONS

    /**
     * Gets the pupil features by following the pipeline which threads an eyes object through each call:
     * curTracker gets eye patches -> blink detector -> pupil detection
     * @param {HTMLCanvasElement} canvas - a canvas which will have the video drawn onto it
     * @param {Number} width - the width of canvas
     * @param {Number} height - the height of canvas
     */
    function getPupilFeatures(canvas, width, height) {
        if (!canvas) {
            return;
        }
        paintCurrentFrame(canvas, width, height);
        try {
            return blinkDetector.detectBlink(curTracker.getEyePatches(canvas, width, height));
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    /**
     * Gets the most current frame of video and paints it to a resized version of the canvas with width and height
     * @param {HTMLCanvasElement} canvas - the canvas to paint the video on to
     * @param {Number} width - the new width of the canvas
     * @param {Number} height - the new height of the canvas
     */
    function paintCurrentFrame(canvas, width, height) {
        //imgWidth = videoElement.videoWidth * videoScale;
        //imgHeight = videoElement.videoHeight * videoScale;
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
     * @param {Number|undefined} regModelIndex - If specified, gives a specific regression model prediction, otherwise gives all predictions
     *  @return {Object} prediction - Object containing the prediction data
     *  @return {integer} prediction.x - the x screen coordinate predicted
     *  @return {integer} prediction.y - the y screen coordinate predicted
     *  @return {Array} prediction.all - if regModelIndex is unset, an array of prediction Objects each with correspodning x and y attributes
     * @returns {*}
     */
    function getPrediction(regModelIndex) {
        var predictions = [];
        var features    = getPupilFeatures(videoElementCanvas, params.imgWidth, params.imgHeight);
        if (regs.length == 0) {
            console.log('regression not set, call setRegression()');
            return null;
        }
        for (var reg in regs) {
            predictions.push(regs[reg].predict(features));
        }
        if (regModelIndex !== undefined) {
            return predictions[regModelIndex] == null ? null : {
                'x': predictions[regModelIndex].x,
                'y': predictions[regModelIndex].y
            };
        } else {
            return predictions.length == 0 || predictions[0] == null ? null : {
                'x':   predictions[0].x,
                'y':   predictions[0].y,
                'all': predictions
            };
        }
    }

    /**
     * Runs every available animation frame if webgazer is not paused
     */
    var smoothingVals = new Util.DataWindow(4);

    function loop() {
        var gazeData    = getPrediction();
        var elapsedTime = performance.now() - clockStart;

        callback(gazeData, elapsedTime);

        if (gazeData && showGazeDot) {
            smoothingVals.push(gazeData);
            var x   = 0;
            var y   = 0;
            var len = smoothingVals.length;
            for (var d in smoothingVals.data) {
                x += smoothingVals.get(d).x;
                y += smoothingVals.get(d).y;
            }
            var pred                = Util.bound({'x': x / len, 'y': y / len});
            gazeDot.style.transform = 'translate3d(' + pred.x + 'px,' + pred.y + 'px,0)';
        }

        if (!paused) {
            //setTimeout(loop, webgazer.params.dataTimestep);
            requestAnimationFrame(loop);
        }
    }

    /**
     * Records screen position data based on current pupil feature and passes it
     * to the regression model.
     * @param {Number} x - The x screen position
     * @param {Number} y - The y screen position
     * @param {String} eventType - The event type to store
     * @returns {null}
     */
    var recordScreenPosition = function (x, y, eventType) {
        if (paused) {
            return;
        }
        var features = getPupilFeatures(videoElementCanvas, params.imgWidth, params.imgHeight);
        if (regs.length == 0) {
            console.log('regression not set, call setRegression()');
            return null;
        }
        for (var reg in regs) {
            regs[reg].addData(features, [x, y], eventType);
        }
    };

    /**
     * Records click data and passes it to the regression model
     * @param {Event} event - The listened event
     */
    var clickListener = function (event) {
        recordScreenPosition(event.clientX, event.clientY, eventTypes[0]); // eventType[0] === 'click'
    };

    /**
     * Records mouse movement data and passes it to the regression model
     * @param {Event} event - The listened event
     */
    var moveListener = function (event) {
        if (paused) {
            return;
        }

        var now = performance.now();
        if (now < moveClock + params.moveTickSize) {
            return;
        } else {
            moveClock = now;
        }
        recordScreenPosition(event.clientX, event.clientY, eventTypes[1]); //eventType[1] === 'move'
    };

    /**
     * Add event listeners for mouse click and move.
     */
    var addMouseEventListeners = function () {
        //third argument set to true so that we get event on 'capture' instead of 'bubbling'
        //this prevents a client using event.stopPropagation() preventing our access to the click
        document.addEventListener('click', clickListener, true);
        document.addEventListener('mousemove', moveListener, true);
    };

    /**
     * Remove event listeners for mouse click and move.
     */
    var removeMouseEventListeners = function () {
        // must set third argument to same value used in addMouseEventListeners
        // for this to work.
        document.removeEventListener('click', clickListener, true);
        document.removeEventListener('mousemove', moveListener, true);
    };

    /**
     * Loads the global data and passes it to the regression model
     */
    function loadGlobalData() {
        var storage = JSON.parse(window.localStorage.getItem(localstorageLabel)) || defaults;
        settings    = storage.settings;
        data        = storage.data;
        for (var reg in regs) {
            regs[reg].setData(storage.data);
        }
    }

    /**
     * Constructs the global storage object and adds it to local storage
     */
    function setGlobalData() {
        var storage = {
            'settings': settings,
            'data':     regs[0].getData() || data
        };
        window.localStorage.setItem(localstorageLabel, JSON.stringify(storage));
        //TODO data should probably be stored in webgazer object instead of each regression model
        //     -> requires duplication of data, but is likely easier on regression model implementors
    }

    /**
     * Clears data from model and global storage
     */
    function clearData() {
        window.localStorage.set(localstorageLabel, undefined);
        for (var reg in regs) {
            regs[reg].setData([]);
        }
    }

    /**
     * Initializes all needed dom elements and begins the loop
     * @param {URL} videoSrc - The video url to use
     */
    function init(videoSrc) {
        videoElement          = document.createElement('video');
        videoElement.id       = params.videoElementId;
        videoElement.autoplay = true;
        console.log(videoElement);
        videoElement.style.display = 'none';

        //turn the stream into a magic URL
        videoElement.src = videoSrc;
        document.body.appendChild(videoElement);

        videoElementCanvas               = document.createElement('canvas');
        videoElementCanvas.id            = params.videoElementCanvasId;
        videoElementCanvas.style.display = 'none';
        document.body.appendChild(videoElementCanvas);

        addMouseEventListeners();

        document.body.appendChild(gazeDot);

        //BEGIN CALLBACK LOOP
        paused = false;

        clockStart = performance.now();

        loop();
    }


    //PUBLIC FUNCTIONS - CONTROL

    /**
     * Starts all state related to webgazer -> dataLoop, video collection, click listener
     * If starting fails, call `onFail` param function.
     * @param {Function} onFail - Callback to call in case it is impossible to find user camera
     * @returns {*}
     */
    function begin(onFail) {
        loadGlobalData();

        onFail = onFail || function () {
                console.log("No stream")
            };

        if (debugVideoLoc) {
            init(debugVideoLoc);
            return webgazer;
        }

        //SETUP VIDEO ELEMENTS
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        if (navigator.getUserMedia != null) {
            var options = params.camConstraints;
            //request webcam access
            navigator.getUserMedia(options,
                function (stream) {
                    console.log('video stream created');
                    init(window.URL.createObjectURL(stream));
                },
                function (e) {
                    onFail();
                    videoElement = null;
                });
        }
        if (!navigator.getUserMedia) {
            alert("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead.");
        }
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.chrome) {
            alert("WebGazer works only over https. If you are doing local development you need to run a local server.");
        }

        return webgazer;
    }

    /**
     * Checks if webgazer has finished initializing after calling begin()
     * @returns {boolean} if webgazer is ready
     */
    function isReady() {
        if (videoElementCanvas == null) {
            return false;
        }
        paintCurrentFrame(videoElementCanvas, params.imgWidth, params.imgHeight);
        return (videoElementCanvas.width > 0);
    }

    /**
     * Stops collection of data and predictions
     * @returns {webgazer} this
     */
    function pause() {
        paused = true;
        return this;
    }

    /**
     * Resumes collection of data and predictions if paused
     * @returns {webgazer} this
     */
    function resume() {
        if (!paused) {
            return webgazer;
        }
        paused = false;
        loop();
        return webgazer;
    }

    /**
     * stops collection of data and removes dom modifications, must call begin() to reset up
     * @return {webgazer} this
     */
    function end() {
        //loop may run an extra time and fail due to removed elements
        paused = true;
        //remove video element and canvas
        document.body.removeChild(videoElement);
        document.body.removeChild(videoElementCanvas);

        setGlobalData();
        return webgazer;
    }


    //PUBLIC FUNCTIONS - DEBUG

    /**
     * Returns if the browser is compatible with webgazer
     * @return {boolean} if browser is compatible
     */
    function detectCompatibility() {
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mediaDevices.getUserMedia;

        return navigator.getUserMedia !== undefined;
    }

    /**
     * Displays the calibration point for debugging
     * @return {webgazer} this
     */
    function showPredictionPoints(bool) {
        showGazeDot           = bool;
        gazeDot.style.left    = '-5px';
        gazeDot.style.display = bool ? 'block' : 'none';
        return webgazer;
    }

    /**
     *  Set a static video file to be used instead of webcam video
     *  @param {String} videoLoc - video file location
     *  @return {webgazer} this
     */
    function setStaticVideo(videoLoc) {
        debugVideoLoc = videoLoc;
        return webgazer;
    }

    /**
     *  Add the mouse click and move listeners that add training data.
     *  @return {webgazer} this
     */
    function addMouseEventListeners() {
        addMouseEventListeners();
        return webgazer;
    }

    /**
     *  Remove the mouse click and move listeners that add training data.
     *  @return {webgazer} this
     */
    function removeMouseEventListeners() {
        removeMouseEventListeners();
        return webgazer;
    }

    /**
     *  Records current screen position for current pupil features.
     *  @param {String} x - position on screen in the x axis
     *  @param {String} y - position on screen in the y axis
     *  @return {webgazer} this
     */
    function recordScreenPosition(x, y) {
        // give this the same weight that a click gets.
        recordScreenPosition(x, y, eventTypes[0]);
        return webgazer;
    }


    //SETTERS
    /**
     * Sets the tracking module
     * @param {String} name - The name of the tracking module to use
     * @return {webgazer} this
     */
    function setTracker(name) {
        if (curTrackerMap[name] == undefined) {
            console.log('Invalid tracker selection');
            console.log('Options are: ');
            for (var t in curTrackerMap) {
                console.log(t);
            }
            return webgazer;
        }
        curTracker = curTrackerMap[name]();
        return webgazer;
    }

    /**
     * Sets the regression module and clears any other regression modules
     * @param {String} name - The name of the regression module to use
     * @return {webgazer} this
     */
    function setRegression(name) {
        if (regressionMap[name] == undefined) {
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
    }

    /**
     * Adds a new tracker module so that it can be used by setTracker()
     * @param {String} name - the new name of the tracker
     * @param {Function} constructor - the constructor of the curTracker object
     * @return {webgazer} this
     */
    function addTrackerModule(name, constructor) {
        curTrackerMap[name] = function () {
            contructor();
        };
    }

    /**
     * Adds a new regression module so that it can be used by setRegression() and addRegression()
     * @param {String} name - the new name of the regression
     * @param {Function} constructor - the constructor of the regression object
     */
    function addRegressionModule(name, constructor) {
        regressionMap[name] = function () {
            contructor();
        };
    }

    /**
     * Adds a new regression module to the list of regression modules, seeding its data from the first regression module
     * @param {string} name - the string name of the regression module to add
     * @return {webgazer} this
     */
    function addRegression(name) {
        var newReg = regressionMap[name]();
        data       = regs[0].getData();
        newReg.setData(data);
        regs.push(newReg);
        return webgazer;
    }

    /**
     * Sets a callback to be executed on every gaze event (currently all time steps)
     * @param {function} listener - The callback function to call (it must be like function(data, elapsedTime))
     * @return {webgazer} this
     */
    function setGazeListener(listener) {
        callback = listener;
        return webgazer;
    }

    /**
     * Removes the callback set by setGazeListener
     * @return {webgazer} this
     */
    function clearGazeListener() {
        callback = nopCallback;
        return webgazer;
    }


    //GETTERS
    /**
     * Returns the tracker currently in use
     * @return {tracker} an object following the tracker interface
     */
    function getTracker() {
        return curTracker;
    }

    /**
     * Returns the regression currently in use
     * @return {Array.<Object>} an array of regression objects following the regression interface
     */
    function getRegression() {
        return regs;
    }

    /**
     * Requests an immediate prediction
     *  @return {Object} prediction - Object containing the prediction data
     *  @return {integer} prediction.x - the x screen coordinate predicted
     *  @return {integer} prediction.y - the y screen coordinate predicted
     *  @return {Array} prediction.all - if regModelIndex is unset, an array of prediction Objects each with correspodning x and y attributes
     */
    function getCurrentPrediction() {
        return getPrediction();
    }

    /**
     * returns the different event types that may be passed to regressions when calling regression.addData()
     * @return {Array} array of strings where each string is an event type
     */
    params.getEventTypes = function () {
        return eventTypes.slice();
    };

    //PUBLIC INTERFACE
    return {
        begin:   begin,
        isReady: isReady,
        pause:   pause,
        resume:  resume,
        end:     end,

        detectCompatibility:       detectCompatibility,
        showPredictionPoints:      showPredictionPoints,
        setStaticVideo:            setStaticVideo,
        addMouseEventListeners:    addMouseEventListeners,
        removeMouseEventListeners: removeMouseEventListeners,
        recordScreenPosition:      recordScreenPosition,

        setTracker:          setTracker,
        setRegression:       setRegression,
        addTrackerModule:    addTrackerModule,
        addRegressionModule: addRegressionModule,
        addRegression:       addRegression,
        setGazeListener:     setGazeListener,
        clearGazeListener:   clearGazeListener,

        getTracker:           getTracker,
        getRegression:        getRegression,
        getCurrentPrediction: getCurrentPrediction
    }

})(window);

export {WebGazer};
