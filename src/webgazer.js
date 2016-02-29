(function(window, undefined) {
    console.log('initializing webgazer')
    //strict mode for type safety
    "use strict"

    //auto invoke function to bind our own copy of window and undefined
    
    //set up namespaces for modules
    window.gazer = window.gazer || {};
    gazer.tracker = gazer.tracker || {};
    gazer.reg = gazer.reg || {};

    //PRIVATE VARIABLES
    
    //video elements
    var videoScale = .5;
    var videoElement = null;
    var videoElementCanvas = null;
    var imgWidth = 0;
    var imgHeight = 0;

    //DEBUG variables
    //debug control boolean
    var showGazeDot = false;
    //debug element (starts offscreen)
    var gazeDot = document.createElement('div');
    gazeDot.style.position = 'absolute';
    gazeDot.style.left = '20px'; //'-999em';
    gazeDot.style.width = '10px';
    gazeDot.style.height = '10px';
    gazeDot.style.background = 'red';

    var debugVideoLoc = '';
        
    // loop parameters
    var clockStart = performance.now();
    var dataTimestep = 50; //TODO either make this a settable parameter or otherwise determine best value
    var paused = false;
    //registered callback for loop
    var nopCallback = function(data, time) {};
    var callback = nopCallback;

    //movelistener timeout clock parameters
    var moveClock = performance.now();
    var moveTickSize = 50; //milliseconds

    //currently used tracker and regression models, defaults to clmtrackr and linear regression
    var tracker = new gazer.tracker.ClmGaze();
    var regs = [new gazer.reg.RidgeReg()];
    var blinkDetector = new gazer.BlinkDetector();

    //lookup tables
    var trackerMap = {
        'clmtrackr': function() { return new gazer.tracker.ClmGaze(); },
        'trackingjs': function() { return new gazer.tracker.TrackingjsGaze(); },
        'js_objectdetect': function() { return new gazer.tracker.Js_objectdetectGaze(); }
    };
    var regressionMap = {
        'interaction': function() { return new gazer.reg.RidgeReg(); }
    };

    //localstorage name
    var localstorageLabel = 'webgazerGlobalData';
    //settings object for future storage of settings
    var settings = {};
    var defaults = {
        'data': [],
        'settings': {},
    };

    //PRIVATE FUNCTIONS

    /**
     * gets the pupil features by following the pipeline which threads an eyes object through each call:
     * tracker gets eye patches -> blink detector -> pupil detection 
     * @param {Canvas} canvas - a canvas which will have the video drawn onto it
     * @param {number} width - the width of canvas
     * @param {number} height - the height of canvas
     */
    function getPupilFeatures(canvas, width, height) {
        if (!canvas) {
            return;
        }
        paintCurrentFrame(canvas);
        try {
            return blinkDetector.detectBlink(tracker.getEyePatches(canvas, width, height));
        } catch(err) {
            console.log(err);
            return null;
        }
    }

    /**
     * gets the most current frame of video and paints it to the canvas
     * @param {canvas} - the canvas to paint the video on to
     */
    function paintCurrentFrame(canvas) {
        imgWidth = videoElement.videoWidth * videoScale;
        imgHeight = videoElement.videoHeight * videoScale;

        videoElementCanvas.width = imgWidth;
        videoElementCanvas.height = imgHeight;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    }

    /**
     *  paints the video to a canvas and runs the prediction pipeline to get a prediction
     */
    function getPrediction() {
        var predictions = [];
        var features = getPupilFeatures(videoElementCanvas, imgWidth, imgHeight);
        for (var reg in regs) {
            preditions.push(regs[reg].predict(features));
        }
        return prediction == null ? null : {
            'x' : prediction[0].x,
            'y' : prediction[0].y,
            'all' : predictions
        };
    }

    /**
     * runs every dataTimestep milliseconds if gazer is not paused
     */
    var smoothingVals = new gazer.util.DataWindow(4);
    function loop() {
        var gazeData = getPrediction();
        var elapsedTime = performance.now() - clockStart;

        callback(gazeData, elapsedTime);

        if (gazeData && showGazeDot) {
            smoothingVals.push(gazeData);
            var x = 0;
            var y = 0;
            var len = smoothingVals.length;
            for (var d in smoothingVals.data) {
                x += smoothingVals.get(d).x;
                y += smoothingVals.get(d).y;
            }
            var pred = gazer.util.bound({'x':x/len, 'y':y/len});
            gazeDot.style.top = pred.y + 'px';
            gazeDot.style.left = pred.x + 'px';
        }

        if (!paused) {
            //setTimeout(loop, dataTimestep);
            requestAnimationFrame(loop);
        }
    }

    /**
     * records click data and passes it to the regression model
     */
    var clickListener = function(event) {
        if (paused) {
            return;
        }
        var features = getPupilFeatures(videoElementCanvas, imgWidth, imgHeight);
        for (var reg in regs) {
            //TODO setup enum for event types
            regs[reg].addData(features, [event.clientX, event.clientY], 'click');
        }
    }

    /**
     * records mouse movement data and passes it to the regression model
     */
    var moveListener = function(event) {
        if (paused) {
            return;
        }

        var now = performance.now();
        if (now < moveClock + moveTickSize) {
            return;
        } else {
            moveClock = now;
        }
        var features = getPupilFeatures(videoElementCanvas, imgWidth, imgHeight);
        for (var reg in regs) {
            //TODO setup enum for event types
            regs[reg].addData(features, [event.clientX, event.clientY], 'move');
        }
    }

    /** loads the global data and passes it to the regression model 
     * 
     */
    function loadGlobalData() {
        var storage = JSON.parse(window.localStorage.getItem(localstorageLabel)) || defaults;
        settings = storage.settings;
        for (var reg in regs) {
            regs[reg].setData(storage.data);
        }
    }
   
   /**
    * constructs the global storage object and adds it to localstorage
    */
    function setGlobalData() {
        //TODO set localstorage to combined dataset
        var storage = {
            'settings': settings,
            'data': regs[0].getData()
        };
        window.localStorage.setItem(localstorageLabel, JSON.stringify(storage));
        //TODO data should probably be stored in webgazer object instead of each regression model
        //     -> requires duplication of data, but is likely easier on regression model implementors
    }

    /*
     * clears data from model and global storage
     */
    function clearData() {
        window.localStorage.set(localstorageLabel, undefined);
        for (var reg in regs) {
            regs[reg].setData([]);
        }
    }


    /**
     * initializes all needed dom elements and begins the loop
     */
    function init(videoSrc) {
        videoElement = document.createElement('video');
        videoElement.id = 'webgazerVideoFeed'; 
        videoElement.autoplay = true;
        console.log(videoElement);
        videoElement.style.display = 'none';

        //turn the stream into a magic URL 
        videoElement.src = videoSrc;  
        //TODO check to see if we actually need to add the element to the dom
        document.body.appendChild(videoElement);

        videoElementCanvas = document.createElement('canvas'); 
        videoElementCanvas.id = 'webgazerVideoCanvas';
        videoElementCanvas.style.display = 'none';
        document.body.appendChild(videoElementCanvas);


        //third argument set to true so that we get event on 'capture' instead of 'bubbling'
        //this prevents a client using event.stopPropagation() preventing our access to the click
        document.addEventListener('click', clickListener, true);
        document.addEventListener('mousemove', moveListener, true);

        document.body.appendChild(gazeDot);

        //BEGIN CALLBACK LOOP
        paused = false;
        loop();
    }

    //PUBLIC FUNCTIONS - CONTROL

    /**
     * starts all state related to webgazer -> dataLoop, video collection, click listener
     */
    gazer.begin = function() {
        loadGlobalData();

        if (debugVideoLoc) {
            init(debugVideoLoc);
            return gazer;
        }

        //SETUP VIDEO ELEMENTS
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        if(navigator.getUserMedia != null){ 
            var options = { 
                video:true, 
            }; 	     
            //request webcam access 
            navigator.getUserMedia(options, 
                    function(stream){
                        console.log('video stream created');
<<<<<<< HEAD
                        videoElement = document.createElement('video');
                        videoElement.id = 'webgazerVideoFeed'; 
                        videoElement.autoplay = true;
                        console.log(videoElement);
                        videoElement.style.display = 'none';

                        //turn the stream into a magic URL 
                        videoElement.src = window.URL.createObjectURL(stream); 
                        //TODO check to see if we actually need to add the element to the dom
                        document.body.appendChild(videoElement);

                        videoElementCanvas = document.createElement('canvas'); 
                        videoElementCanvas.id = 'webgazerVideoCanvas';
                        videoElementCanvas.style.display = 'none';
                        document.body.appendChild(videoElementCanvas);

        
                        //third argument set to true so that we get event on 'capture' instead of 'bubbling'
                        //this prevents a client using event.stopPropagation() preventing our access to the click
                        document.addEventListener('click', clickListener, true);
                        document.addEventListener('mousemove', moveListener, true);

                        document.body.appendChild(gazeDot);

                        //BEGIN CALLBACK LOOP
                        paused = false;
                        loop();
=======
                        init(window.URL.createObjectURL(stream));                    
>>>>>>> 9358d7e68ccf5a13692b3b67338dda097eb96a58
                    }, 
                    function(e){ 
                        console.log("No stream"); 
                        videoElement = null;
                    });
        }

        return gazer;
    }

    /*
     * checks if gazer has finished initializing after calling begin()
     * @return {boolean} if gazer is ready
     */
    gazer.isReady = function() {
        if (videoElementCanvas == null) {
            return false;
        }
        paintCurrentFrame(videoElementCanvas);
        return videoElementCanvas.width > 0;
    }

    /*
     * stops collection of data and predictions
     * @return {gazer} this
     */
    gazer.pause = function() {
        paused = true;
        return gazer;
    }

    /*
     * resumes collection of data and predictions if paused
     * @return {gazer} this
     */
    gazer.resume = function() {
        if (!paused) {
            return gazer;
        }
        paused = false;
        loop();
        return gazer;
    }

    /**
     * stops collection of data and removes dom modifications, must call begin() to reset up
     * @return {gazer} this
     */
    gazer.end = function() {
        //loop may run an extra time and fail due to removed elements
        paused = true;
        //remove video element and canvas
        document.body.removeChild(videoElement);
        document.body.removeChild(videoElementCanvas);

        setGlobalData();
        return gazer;
    }

    //PUBLIC FUNCTIONS - DEBUG

    /**
     * returns if the browser is compatible with gazer
     * @return {boolean} if browser is compatible
     */
    gazer.detectCompatibility = function() {
        //TODO detectCompatibility
        return true;
    }

    /**
     * runs an initial calibration page/step
     */
    gazer.performCalibration = function(desiredAccuracy) {
        //TODO performCalibration
    }

    /**
     * displays the calibration point for debugging
     * @return {gazer} this
     */
    gazer.showPredictionPoints = function(bool) {
        showGazeDot = bool;
        gazeDot.style.left = '-999em';
        return gazer;
    }

    /**
     *  set a static video file to be used instead of webcam video
     *  @param {string} videoLoc - video file location
     *  @return {gazer} this
     */
    gazer.setStaticVideo(videoLoc) {
       debugVideoLoc = videoLoc;
       return gazer;
    }

    //SETTERS
    /**
     * sets the tracking module
     * @param {string} the name of the tracking module to use
     * @return {gazer} this
     */
    gazer.setTracker = function(name) {
        //TODO validate name
        tracker = trackerMap[name]();    
        return gazer;
    }

    /**
     * sets the regression module and clears any other regression modules
     * @param {string} the name of the regression module to use
     * @return {gazer} this
     */
    gazer.setRegression = function(name) {
        //TODO validate name
        //TODO make robust to adding regression after calling begin
        var data = regs[0].getData();
        regs = [regressionMap[name]()];
        regs[0].setData(data);
        return gazer;
    }

    /**
     * adds a new regression module to the list of regression modules, seeding its data from the first regression module
     * @param {string} name - the string name of the regression module to add
     * @return {gazer} this
     */
    gazer.addRegression = function(name) {
        var newReg = regressionMap[name]();
        var data = regs[0].getData();
        newReg.setData(data);
        regs.push(newReg);
        return gazer;
    }

    /**
     * sets a callback to be executed on every gaze event (currently all time steps)
     * @param {function}
     *      @param {data} - the prediction data
     *      @param {elapsedTime} - the elapsed time since begin() was called
     * @return {gazer} this
     */
    gazer.setGazeListener = function(listener) {
        //TODO validate listener
        callback = listener;
        return gazer;
    }

    /**
     * removes the callback set by setGazeListener
     * @return {gazer} this
     */
    gazer.clearGazeListener = function() {
        callback = nopCallback;
        return gazer;
    }

    //GETTERS
    /**
     * returns the tracker currently in use
     * @return {tracker} an object following the tracker interface
     */
    gazer.getTracker = function() {
        //TODO decide if this should return the tracker object or just the string, tracker.name
        return tracker;
    }
    
    /**
     * returns the regression currently in use
     * @return {regression} an object following the regression interface
     */
    gazer.getRegression = function() {
        //TODO decide if this should return the regression object or just the string, reg.name
        return reg;
    }

    /**
     * requests an immediate prediction
     * @return {object} prediction data object
     */
    gazer.getCurrentPrediction = function() {
        return getPrediction(); 
    }
}(window));
