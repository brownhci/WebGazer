var ridgeParameter  = Math.pow(10, -5);
var resizeWidth     = 10;
var resizeHeight    = 6;
var dataWindow      = 700;
var weights         = {'X': [0], 'Y': [0]};
var trailDataWindow = 10;

/**
 * Compute eyes size as gray histogram
 * @param {Object} eyes - The eyes where looking for gray histogram
 * @returns {Array.<T>} The eyes gray level histogram
 */
function getEyeFeats(eyes) {
    var resizedLeft  = webgazer.util.resizeEye(eyes.left, resizeWidth, resizeHeight);
    var resizedright = webgazer.util.resizeEye(eyes.right, resizeWidth, resizeHeight);

    var leftGray  = webgazer.util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
    var rightGray = webgazer.util.grayscale(resizedright.data, resizedright.width, resizedright.height);

    var histLeft = [];
    webgazer.util.equalizeHistogram(leftGray, 5, histLeft);
    var histRight = [];
    webgazer.util.equalizeHistogram(rightGray, 5, histRight);

    var leftGrayArray  = Array.prototype.slice.call(histLeft);
    var rightGrayArray = Array.prototype.slice.call(histRight);

    return leftGrayArray.concat(rightGrayArray);
}

function updateWeights(event) {
    console.log(event.data);
    this.weights = event.data;
}

/**
 * Constructor for the RidgeThreadedReg Object which uses unweighted ridge regression to correlate click and mouse movement to eye patch features
 * This class has the same functionality as RidgeReg with two large differences:
 * 1. training examples are batched for retraining the model instead of retraining on each new example
 * 2. the training runs on a separate thread which should enable better running time
 * @alias module:RidgeThreadedReg
 * @exports RidgeThreadedReg
 */
var RidgeRegThreaded = function () {
    this.screenXClicksArray = new webgazer.util.DataWindow(dataWindow);
    this.screenYClicksArray = new webgazer.util.DataWindow(dataWindow);
    this.eyeFeaturesClicks  = new webgazer.util.DataWindow(dataWindow);

    this.screenXTrailArray = new webgazer.util.DataWindow(trailDataWindow);
    this.screenYTrailArray = new webgazer.util.DataWindow(trailDataWindow);
    this.eyeFeaturesTrail  = new webgazer.util.DataWindow(trailDataWindow);

    this.dataClicks = new webgazer.util.DataWindow(dataWindow);
    this.dataTrail  = new webgazer.util.DataWindow(dataWindow);

    this.worker           = new Worker('ridgeWorker.js');
    this.worker.onerror   = function (err) {
        console.log(err.message);
    };
    this.worker.onmessage = function (evt) {
        weights.X = evt.data.X;
        weights.Y = evt.data.Y;
    };
};


/**
 * The RidgeRegThreaded object name
 * @type {string}
 */
RidgeRegThreaded.prototype.name = 'ridge';

/**
 * Adds data to the regression model
 * @param {Object} eyes - util.eyes Object containing left and right data
 * @param {Object} screenPos - The screen [x,y] position when a training event happens
 * @param {Object} type - The type of performed action
 */
RidgeRegThreaded.prototype.addData = function (eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    if (eyes.left.blink || eyes.right.blink) {
        return;
    }
    this.worker.postMessage({'eyes': getEyeFeats(eyes), 'screenPos': screenPos, 'type': type});
};

/**
 * Gets a prediction based on the current set of training data
 * @param {Object} eyesObj - util.eyes Object
 * @returns {Object} prediction - Object containing the prediction data
 *  @return {integer} prediction.x - the x screen coordinate predicted
 *  @return {integer} prediction.y - the y screen coordinate predicted
 */
RidgeRegThreaded.prototype.predict = function (eyesObj) {
    console.log("LOGGING..");
    if (!eyesObj) {
        return null;
    }
    var coefficientsX = weights.X;
    var coefficientsY = weights.Y;

    var eyeFeats   = getEyeFeats(eyesObj);
    var predictedX = 0, predictedY = 0;
    for (var i = 0; i < eyeFeats.length; i++) {
        predictedX += eyeFeats[i] * coefficientsX[i];
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    console.log("PredicedX");
    console.log(predictedX);
    console.log(predictedY);

    return {
        x: predictedX,
        y: predictedY
    };
};

/**
 * Seeds the model with initial training data in case data is stored in a separate location
 * @param {Array.<Object>} data - The data to set
 */
RidgeRegThreaded.prototype.setData = function (data) {
    for (var i = 0; i < data.length; i++) {
        //TODO this is a kludge, needs to be fixed
        data[i].eyes.left.patch  = new ImageData(new Uint8ClampedArray(data[i].eyes.left.patch), data[i].eyes.left.width, data[i].eyes.left.height);
        data[i].eyes.right.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.right.patch), data[i].eyes.right.width, data[i].eyes.right.height);
        this.addData(data[i].eyes, data[i].screenPos, data[i].type);
    }
};

/**
 * Gets the training data stored in this regression model,
 * this is not the model itself, but merely its training data
 * @returns {Array.<Object>|*} The set of training data stored in this regression class
 */
RidgeRegThreaded.prototype.getData = function () {
    return this.dataClicks.data.concat(this.dataTrail.data);
};

export {RidgeRegThreaded};
