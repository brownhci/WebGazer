'use strict';
(function(window) {

    window.webgazer = window.webgazer || {};
    webgazer.reg = webgazer.reg || {};
    webgazer.mat = webgazer.mat || {};
    webgazer.util = webgazer.util || {};

    var ridgeParameter = Math.pow(10,-5);
    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;
    var weights = {'X':[0],'Y':[0]};
    var trailDataWindow = 10;

    /**
     * Compute eyes size as gray histogram
     * @param {Object} eyes - The eyes where looking for gray histogram
     * @returns {Array.<T>} The eyes gray level histogram
     */
    function getEyeFeats(eyes) {
        var resizedLeft = webgazer.util.resizeEye(eyes.left, resizeWidth, resizeHeight);
        var resizedright = webgazer.util.resizeEye(eyes.right, resizeWidth, resizeHeight);

        var leftGray = webgazer.util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = webgazer.util.grayscale(resizedright.data, resizedright.width, resizedright.height);

        var histLeft = [];
        webgazer.util.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        webgazer.util.equalizeHistogram(rightGray, 5, histRight);

        var leftGrayArray = Array.prototype.slice.call(histLeft);
        var rightGrayArray = Array.prototype.slice.call(histRight);

        return leftGrayArray.concat(rightGrayArray);
    }

    /**
     * Constructor of RidgeRegThreaded object,
     * it retrieve data window, and prepare a worker,
     * this object allow to perform threaded ridge regression
     * @constructor
     */
    webgazer.reg.RidgeRegThreaded = function() {
        this.screenXClicksArray = new webgazer.util.DataWindow(dataWindow);
        this.screenYClicksArray = new webgazer.util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new webgazer.util.DataWindow(dataWindow);

        this.screenXTrailArray = new webgazer.util.DataWindow(trailDataWindow);
        this.screenYTrailArray = new webgazer.util.DataWindow(trailDataWindow);
        this.eyeFeaturesTrail = new webgazer.util.DataWindow(trailDataWindow);

        this.dataClicks = new webgazer.util.DataWindow(dataWindow);
        this.dataTrail = new webgazer.util.DataWindow(dataWindow);

        this.worker = new Worker('ridgeWorker.js');
        this.worker.onerror = function(err) { console.log(err.message); };
        this.worker.onmessage = function(evt){
          weights.X = evt.data.X;
          weights.Y = evt.data.Y;
        };

        // Initialize Kalman filter [20200608 xk] what do we do about parameters?
        // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least 
        //               by my own anecdotal observation a 4x1 x vector seems to work alright
        var F = [ [1, 0, 1, 0],
                  [0, 1, 0, 1],
                  [0, 0, 1, 0],
                  [0, 0, 0, 1]];
        
        //Parameters Q and R may require some fine tuning
        var Q = [ [1/4, 0,    1/2, 0],
                  [0,   1/4,  0,   1/2],
                  [1/2, 0,    1,   0],
                  [0,  1/2,  0,   1]];// * delta_t
        var delta_t = 1/10; // The amount of time between frames
        Q = numeric.mul(Q, delta_t);
        
        var H = [ [1, 0, 0, 0, 0, 0],
                  [0, 1, 0, 0, 0, 0],
                  [0, 0, 1, 0, 0, 0],
                  [0, 0, 0, 1, 0, 0]];
        var H = [ [1, 0, 0, 0],
                  [0, 1, 0, 0]];
        var pixel_error = 47; //We will need to fine tune this value [20200611 xk] I just put a random value here 
        
        //This matrix represents the expected measurement error
        var R = numeric.mul(numeric.identity(2), pixel_error);

        var P_initial = numeric.mul(numeric.identity(4), 0.0001); //Initial covariance matrix
        var x_initial = [[500], [500], [0], [0]]; // Initial measurement matrix

        this.kalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);
    };

    /**
     * Add given data from eyes
     * @param {Object} eyes - eyes where extract data to add
     * @param {Object} screenPos - The current screen point
     * @param {Object} type - The type of performed action
     */
    webgazer.reg.RidgeRegThreaded.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        this.worker.postMessage({'eyes':getEyeFeats(eyes), 'screenPos':screenPos, 'type':type});
    };

    /**
     * Try to predict coordinates from pupil data
     * after apply linear regression on data set
     * @param {Object} eyesObj - The current user eyes object
     * @returns {Object}
     */
    webgazer.reg.RidgeRegThreaded.prototype.predict = function(eyesObj) {
        console.log('LOGGING..');
        if (!eyesObj) {
            return null;
        }
        var coefficientsX = weights.X;
        var coefficientsY = weights.Y;

        var eyeFeats = getEyeFeats(eyesObj);
        var predictedX = 0, predictedY = 0;
        for(var i=0; i< eyeFeats.length; i++){
            predictedX += eyeFeats[i] * coefficientsX[i];
            predictedY += eyeFeats[i] * coefficientsY[i];
        }

        predictedX = Math.floor(predictedX);
        predictedY = Math.floor(predictedY);

        if (window.applyKalmanFilter) {
            // Update Kalman model, and get prediction
            var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
            newGaze = this.kalman.update(newGaze);
            console.log('Filtered Predicted X,Y');
            console.log(newGaze[0]);
            console.log(newGaze[1]);
    
            return {
                x: newGaze[0],
                y: newGaze[1]
            };
        } else {
            console.log('Predicted X,Y');
            console.log(predictedX);
            console.log(predictedY);

            return {
                x: predictedX,
                y: predictedY
            };
        }
    };

    /**
     * Add given data to current data set then,
     * replace current data member with given data
     * @param {Array.<Object>} data - The data to set
     */
    webgazer.reg.RidgeRegThreaded.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            // [20200611 xk] Previous comment said this was a kludge, but it seems like this is the best solution 
            
            // Clone data array
            var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
            var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
            // Duplicate ImageData object
            data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    };

    /**
     * Return the data
     * @returns {Array.<Object>|*}
     */
    webgazer.reg.RidgeRegThreaded.prototype.getData = function() {
        return this.dataClicks.data;
    };

    /**
     * The RidgeRegThreaded object name
     * @type {string}
     */
    webgazer.reg.RidgeRegThreaded.prototype.name = 'ridge';
    
}(window));
