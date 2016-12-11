/**
 * IMPORT SOURCES
 */
// import * as Core from "./core/core";
import * as Tracker from "../tracker/trackers";
import * as Regression from "../regression/regressions";
import * as Util from "../utils/util";

var WebGazer = (function (window, params) {

    //PRIVATE VARIABLES

    /**
     * Top level control module
     * @alias module:webgazer
     * @exports webgazer
     */

    //params Object to be passed into tracker and regression constructors
    //contains various potentially useful knowledge like the video size and data collection rates
    var _params             = {
        videoScale:           1,
        videoElementId:       'webgazerVideoFeed',
        videoElementCanvasId: 'webgazerVideoCanvas',
        imgWidth:             1280,
        imgHeight:            720,
        trackerParams:        {
            constantVelocity:  true,
            searchWindow:      11,
            useWebGL:          true,
            scoreThreshold:    0.5,
            stopOnConvergence: false,
            weightPoints:      undefined,
            sharpenResponse:   false
        },
        regressionParams: {
            trailTime: 1000,
            moveTickSize:         50 //milliseconds
        },
        camConstraints:       {
            video: true
        },
        dataTimestep:         50,
        moveTickSize:         50 //milliseconds
    };
    Object.assign( _params, params );
    
    var _videoElement       = null;
    var _videoElementCanvas = null;

    //DEBUG variables
    var _showGazeDot            = false;
    //debug element (starts offscreen)
    var _gazeDot                = document.createElement('div');
    _gazeDot.style.position     = 'fixed';
    _gazeDot.style.zIndex       = 99999;
    _gazeDot.style.left         = '-5px'; //'-999em';
    _gazeDot.style.top          = '-5px';
    _gazeDot.style.width        = '10px';
    _gazeDot.style.height       = '10px';
    _gazeDot.style.background   = 'red';
    _gazeDot.style.display      = 'none';
    _gazeDot.style.borderRadius = '100%';
    _gazeDot.style.opacity      = '0.7';

    var _staticVideoSource = '';
    // loop parameters
    var _clockStart    = performance.now();
    // webgazer._params.dataTimestep = 50;
    var paused        = false;
    //registered callback for loop
    var _nopCallback   = function (data, time) {
    };
    var _callback      = _nopCallback;

    //Types that regression systems should handle
    //Describes the source of data so that regression systems may ignore or handle differently the various generating events
    var _eventTypes = ['click', 'move'];

    //movelistener timeout clock parameters
    var _moveClock = performance.now();

    //currently used tracker and regression models, defaults to clmtrackr and linear regression
    var _tracker       = new Tracker.ClmGaze(_params.trackerParams);
    var _regressions   = [ new Regression.RidgeReg() ];
    var _blinkDetector = new Util.BlinkDetector();

    //lookup tables
    var _trackersMap = {
        'clmtrackr':       function () {
            return new Tracker.ClmGaze(_params.trackerParams);
        },
        'trackingjs':      function () {
            return new Tracker.TrackingjsGaze(_params.trackerParams);
        },
        'js_objectdetect': function () {
            return new Tracker.Js_objectdetectGaze(_params.trackerParams);
        }
    };
    
    var _regressionsMap = {
        'ridge':         function () {
            return new Regression.RidgeReg(_params.regressionParams);
        },
        'weightedRidge': function () {
            return new Regression.RidgeWeightedReg(_params.regressionParams);
        },
        'threadedRidge': function () {
            return new Regression.RidgeRegThreaded(_params.regressionParams);
        },
        'linear':        function () {
            return new Regression.LinearReg(_params.regressionParams);
        }
    };

    //localstorage name
    var _localStorageLabel = 'webgazerGlobalData';
    //settings object for future storage of settings
    var _settings          = {};
    var _data              = [];
    var _defaults          = {
        'data':     _data,
        'settings': _settings
    };
    
    /**
     * Runs every available animation frame if webgazer is not paused
     */
    var _smoothingVals = new Util.DataWindow(4);
    //PRIVATE FUNCTIONS

    /**
     * Gets the pupil features by following the pipeline which threads an eyes object through each call:
     * _tracker gets eye patches -> blink detector -> pupil detection
     * @param {HTMLCanvasElement} canvas - a canvas which will have the video drawn onto it
     * @param {Number} width - the width of canvas
     * @param {Number} height - the height of canvas
     */
    function _getPupilFeatures(canvas, width, height) {

        if (!canvas) {
            return;
        }

        try {
            var eyePatch = _tracker.getEyePatches(canvas, width, height);
            return _blinkDetector.detectBlink(eyePatch);
        } catch (err) {
            console.error(err);
            return null;
        }

    }

    /**
     * Gets the most current frame of video and paints it to a resized version of the canvas with width and height
     * @param {HTMLCanvasElement} canvas - the canvas to paint the video on to
     * @param {Number} width - the new width of the canvas
     * @param {Number} height - the new height of the canvas
     */
    function _paintCurrentFrame(canvas, width, height) {
        //imgWidth = _videoElement.videoWidth * videoScale;
        //imgHeight = _videoElement.videoHeight * videoScale;
        // if (canvas.width != width) {
        //     canvas.width = width;
        // }
        // if (canvas.height != height) {
        //     canvas.height = height;
        // }

        // Compare if different will require an useless conditional check for any change,
        // instead of simply set the value (and if they are equals there is no more loss time)
        canvas.width = width;
        canvas.height = height;

        // instead of accessing an object property, just use what is here
        canvas.getContext('2d').drawImage(_videoElement, 0, 0, width, height);
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
    function _getPrediction(regModelIndex) {

        if (!_regressions.length) {
            console.log('Regression not set, call setRegression()');
            return null;
        }

        var predictions = [];
        var features    = _getPupilFeatures( _videoElementCanvas, _params.imgWidth, _params.imgHeight );

        for (var reg in _regressions) {
            predictions.push(_regressions[reg].predict(features));
        }

        if (regModelIndex && regModelIndex >= 0) {

            var predictionForIndex = predictions[regModelIndex];
            return (!predictionForIndex) ? null : {
                'x': predictionForIndex.x,
                'y': predictionForIndex.y
            };

        } else if (predictions.length) {

            var firstPrediction = predictions[0];
            return (!firstPrediction) ? null : {
                'x':   firstPrediction.x,
                'y':   firstPrediction.y,
                'all': predictions
            };

        } else {

            return null;

        }
    }
    
    function _loop() {

        if (!paused) {
            requestAnimationFrame(_loop);
        }
        
        _paintCurrentFrame( _videoElementCanvas, _params.imgWidth, _params.imgHeight );

        var gazeData    = _getPrediction();
        var elapsedTime = performance.now() - _clockStart;

        _callback(gazeData, elapsedTime);

        if (gazeData && _showGazeDot) {
            _smoothingVals.push(gazeData);
            var x   = 0;
            var y   = 0;
            var len = _smoothingVals.length;
            for (var d in _smoothingVals.data) {
                x += _smoothingVals.get(d).x;
                y += _smoothingVals.get(d).y;
            }
            var pred                = Util.bound({'x': x / len, 'y': y / len});
            _gazeDot.style.transform = 'translate3d(' + pred.x + 'px,' + pred.y + 'px,0)';
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
    var _recordScreenPosition = function (x, y, eventType) {
        if (paused) {
            return null;
        }

        if (!_regressions.length) {
            console.log('regression not set, call setRegression()');
            return null;
        }

        var features = _getPupilFeatures(_videoElementCanvas, _params.imgWidth, _params.imgHeight);

        for (var reg in _regressions) {
            _regressions[reg].addData(features, [x, y], eventType);
        }
    };

    /**
     * Records click data and passes it to the regression model
     * @param {Event} event - The listened event
     */
    var _clickListener = function (event) {
        _recordScreenPosition(event.clientX, event.clientY, _eventTypes[0]); // eventType[0] === 'click'
    };

    /**
     * Records mouse movement data and passes it to the regression model
     * @param {Event} event - The listened event
     */
    var _moveListener = function (event) {
        if (paused) {
            return;
        }

        var now = performance.now();
        if (now < _moveClock + _params.moveTickSize) {
            return;
        } else {
            _moveClock = now;
        }
        _recordScreenPosition(event.clientX, event.clientY, _eventTypes[1]); //eventType[1] === 'move'
    };

    /**
     * Add event listeners for mouse click and move.
     */
    var _addMouseEventListeners = function () {
        //third argument set to true so that we get event on 'capture' instead of 'bubbling'
        //this prevents a client using event.stopPropagation() preventing our access to the click
        document.addEventListener('click', _clickListener, true);
        document.addEventListener('mousemove', _moveListener, true);
    };

    /**
     * Remove event listeners for mouse click and move.
     */
    var _removeMouseEventListeners = function () {
        // must set third argument to same value used in addMouseEventListeners
        // for this to work.
        document.removeEventListener('click', _clickListener, true);
        document.removeEventListener('mousemove', _moveListener, true);
    };

    /**
     * Loads the global data and passes it to the regression model
     */
    function _loadGlobalData() {
        var storage = JSON.parse(window.localStorage.getItem(_localStorageLabel)) || _defaults;
        _settings    = storage.settings;
        _data        = storage.data;
        for (var reg in _regressions) {
            _regressions[reg].setData(_data);
        }
    }

    /**
     * Constructs the global storage object and adds it to local storage
     */
    function _setGlobalData() {
        var storage = {
            'settings': _settings,
            'data':     _regressions[0].getData() || _data
        };
        window.localStorage.setItem(_localStorageLabel, JSON.stringify(storage));
        //TODO data should probably be stored in webgazer object instead of each regression model
        //     -> requires duplication of data, but is likely easier on regression model implementors
    }

    /**
     * Clears data from model and global storage
     */
    function _clearData() {
        window.localStorage.set(_localStorageLabel, undefined);
        for (var reg in _regressions) {
            _regressions[reg].setData([]);
        }
    }

    /**
     * Initializes all needed dom elements and begins the loop
     * @param {URL} videoSrc - The video url to use
     */
    function _init(videoSrc) {
        _videoElement          = document.createElement('video');
        _videoElement.id       = _params.videoElementId;
        _videoElement.autoplay = true;
        _videoElement.style.backgroundColor = 'red';
//        _videoElement.style.display = 'none';

        //turn the stream into a magic URL
        // ONLY IF static video !
        if(videoSrc){
            _videoElement.src = videoSrc;
        }
        document.body.appendChild(_videoElement);

        _videoElementCanvas               = document.createElement('canvas');
        _videoElementCanvas.id            = _params.videoElementCanvasId;
        _videoElementCanvas.style.backgroundColor = 'green';
//        _videoElementCanvas.style.display = 'none';
        document.body.appendChild(_videoElementCanvas);

        _addMouseEventListeners();

        document.body.appendChild(_gazeDot);

        //BEGIN CALLBACK LOOP
        paused = false;

        _clockStart = performance.now();

        _loop();
    }


    //PUBLIC FUNCTIONS - CONTROL

    /**
     * Starts all state related to webgazer -> dataLoop, video collection, click listener
     * If starting fails, call `onFail` param function.
     * @param {Function} onFail - Callback to call in case it is impossible to find user camera
     * @returns {*}
     */
    function begin(onFail) {
        _loadGlobalData();

        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.chrome) {
            alert("WebGazer works only over https. If you are doing local development you need to run a local server.");
        }

        onFail = onFail || function onFailCallback() {
                _videoElement = null;
                console.log("No stream")
                alert('There has been a problem retreiving the streams - are you running on file:/// or did you disallow access?');
            };

        function onSuccess(stream) {
            console.log('Video stream created');
            _init(window.URL.createObjectURL(stream));
        }

        //TODO: Check it #FOLLOW  => Webgazer.html - checkIfReady
        // If you don't set an staticVideo (not camera)
        // You will never init WebGazer BUT !!!
        // after calling begin (in webgazer.html), you will
        // fall into a loop about isReady that check for an canvas
        // called _videoElementCanvas that will never be init.... damned ! <8-D
        if (_staticVideoSource) {
            _init(_staticVideoSource);
            return this;
        }

        //SETUP VIDEO ELEMENTS
        navigator.getUserMedia || (navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia);
        window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

        if (navigator.getUserMedia) {

            var options = _params.camConstraints;
            navigator.getUserMedia(options, onSuccess, onFail);

        } else {
            alert("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead.");
        }

        return this;
    }

    /**
     * Checks if webgazer has finished initializing after calling begin()
     * @returns {boolean} if webgazer is ready
     */
    function isReady() {
        // TODO: Care if webgazer is not init you will fall into infinit loop
        if (_videoElementCanvas === null) {
            console.log("Not ready yet !");
            return false;
        }

        _paintCurrentFrame(_videoElementCanvas, _params.imgWidth, _params.imgHeight);
        return (_videoElementCanvas.width > 0);
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
            return this;
        }
        paused = false;
        _loop();
        return this;
    }

    /**
     * stops collection of data and removes dom modifications, must call begin() to reset up
     * @return {webgazer} this
     */
    function end() {
        //loop may run an extra time and fail due to removed elements
        paused = true;
        //remove video element and canvas
        document.body.removeChild(_videoElement);
        document.body.removeChild(_videoElementCanvas);

        _setGlobalData();
        return this;
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
        _showGazeDot           = bool;
        _gazeDot.style.left    = '-5px';
        _gazeDot.style.display = bool ? 'block' : 'none';
        return this;
    }

    /**
     *  Set a static video file to be used instead of webcam video
     *  @param {String} videoLoc - video file location
     *  @return {webgazer} this
     */
    function setStaticVideo(videoLoc) {
        _staticVideoSource = videoLoc;
        return this;
    }

    /**
     *  Add the mouse click and move listeners that add training data.
     *  @return {webgazer} this
     */
    function addMouseEventListeners() {
        _addMouseEventListeners();
        return this;
    }

    /**
     *  Remove the mouse click and move listeners that add training data.
     *  @return {webgazer} this
     */
    function removeMouseEventListeners() {
        _removeMouseEventListeners();
        return this;
    }

    /**
     *  Records current screen position for current pupil features.
     *  @param {String} x - position on screen in the x axis
     *  @param {String} y - position on screen in the y axis
     *  @return {webgazer} this
     */
    function recordScreenPosition(x, y) {
        // give this the same weight that a click gets.
        _recordScreenPosition(x, y, _eventTypes[0]);
        return this;
    }


    //SETTERS
    /**
     * Sets the tracking module
     * @param {String} name - The name of the tracking module to use
     * @return {webgazer} this
     */
    function setTracker(name) {
        if (!_trackersMap[name]) {
            console.log('Invalid tracker selection');
            console.log('Options are: ');
            for (var t in _trackersMap) {
                console.log(t);
            }
            return this;
        }
        _tracker = _trackersMap[name]();
        return this;
    }

    /**
     * Sets the regression module and clears any other regression modules
     * @param {String} name - The name of the regression module to use
     * @return {webgazer} this
     */
    function setRegression(name) {
        if (!_regressionsMap[name]) {
            console.log('Invalid regression selection');
            console.log('Options are: ');
            for (var reg in _regressionsMap) {
                console.log(reg);
            }
            return this;
        }

        _data = _regressions[0].getData();
        _regressions = [_regressionsMap[name]()];
        _regressions[0].setData(_data);
        return this;
    }

    /**
     * Adds a new tracker module so that it can be used by setTracker()
     * @param {String} name - the new name of the tracker
     * @param {Function} constructor - the constructor of the _tracker object
     * @return {webgazer} this
     */
    function addTrackerModule(name, constructor) {
        _trackersMap[name] = function () {
            constructor();
        };
    }

    /**
     * Adds a new regression module so that it can be used by setRegression() and addRegression()
     * @param {String} name - the new name of the regression
     * @param {Function} constructor - the constructor of the regression object
     */
    function addRegressionModule(name, constructor) {
        _regressionsMap[name] = function () {
            constructor();
        };
    }

    /**
     * Adds a new regression module to the list of regression modules, seeding its data from the first regression module
     * @param {string} name - the string name of the regression module to add
     * @return {webgazer} this
     */
    function addRegression(name) {
        var newReg = _regressionsMap[name]();
        _data       = _regressions[0].getData();
        newReg.setData(_data);
        _regressions.push(newReg);
        return this;
    }

    /**
     * Sets a callback to be executed on every gaze event (currently all time steps)
     * @param {function} listener - The callback function to call (it must be like function(data, elapsedTime))
     * @return {webgazer} this
     */
    function setGazeListener(listener) {
        _callback = listener;
        return this;
    }

    /**
     * Removes the callback set by setGazeListener
     * @return {webgazer} this
     */
    function clearGazeListener() {
        _callback = _nopCallback;
        return this;
    }


    //GETTERS
    /**
     * Returns the tracker currently in use
     * @return {tracker} an object following the tracker interface
     */
    function getTracker() {
        return _tracker;
    }

    /**
     * Returns the regression currently in use
     * @return {Array.<Object>} an array of regression objects following the regression interface
     */
    function getRegression() {
        return _regressions;
    }

    /**
     * Requests an immediate prediction
     *  @return {Object} prediction - Object containing the prediction data
     *  @return {integer} prediction.x - the x screen coordinate predicted
     *  @return {integer} prediction.y - the y screen coordinate predicted
     *  @return {Array} prediction.all - if regModelIndex is unset, an array of prediction Objects each with correspodning x and y attributes
     */
    function getCurrentPrediction() {
        return _getPrediction();
    }

    /**
     * Return the current WebGazer params
     * @returns {{videoScale: number, videoElementId: string, videoElementCanvasId: string, imgWidth: number, imgHeight: number, clmParams: {useWebGL: boolean}, camConstraints: {video: boolean},
     *     dataTimestep: number, moveTickSize: number}}
     */
    function getParams() {
        return _params;
    }

    /**
     * returns the different event types that may be passed to regressions when calling regression.addData()
     * @return {Array} array of strings where each string is an event type
     */
    _params.getEventTypes = function () {
        return _eventTypes.slice();
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
        getParams:            getParams,
        getRegression:        getRegression,
        getCurrentPrediction: getCurrentPrediction
    }

})(window, webgazerBadGlobalParams);

export {WebGazer};
