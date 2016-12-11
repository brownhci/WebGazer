import * as Util from "../utils/util";

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
function getEyesFeats(eyes) {

    var leftFeat  = getEyeFeat( eyes.left );
    var rightFeat = getEyeFeat( eyes.right );

    return leftFeat.concat( rightFeat );

}

function getEyeFeat(eye) {

    var resizeEye = Util.resizeEye( eye, resizeWidth, resizeHeight );
    var greyscale = Util.grayscale( resizeEye.data, resizeEye.width, resizeEye.height );
    var histogram = [];

    Util.equalizeHistogram(greyscale, 5, histogram);

    return Array.prototype.slice.call(histogram);

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

    this.screenXClicksArray = new Util.DataWindow(dataWindow);
    this.screenYClicksArray = new Util.DataWindow(dataWindow);
    this.eyeFeaturesClicks  = new Util.DataWindow(dataWindow);

    this.screenXTrailArray = new Util.DataWindow(trailDataWindow);
    this.screenYTrailArray = new Util.DataWindow(trailDataWindow);
    this.eyeFeaturesTrail  = new Util.DataWindow(trailDataWindow);

    this.dataClicks = new Util.DataWindow(dataWindow);
    this.dataTrail  = new Util.DataWindow(dataWindow);

    this.worker           = new Worker('ridgeWorker.js');
    this.worker.onerror   = function (err) {
        console.log(err.message);
    };
    this.worker.onmessage = function (evt) {
        weights.X = evt.data.X;
        weights.Y = evt.data.Y;
    };


    function _getNewImageDataForEye(eye) {

        return new ImageData(new Uint8ClampedArray(eye.patch), eye.width, eye.height);

    }

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
    this.worker.postMessage({'eyes': getEyesFeats(eyes), 'screenPos': screenPos, 'type': type});
};

/**
 * Gets a prediction based on the current set of training data
 * @param {Object} eyesObj - util.eyes Object
 * @returns {Object} prediction - Object containing the prediction data
 */
// *  @return {integer} prediction.x - the x screen coordinate predicted
// *  @return {integer} prediction.y - the y screen coordinate predicted
RidgeRegThreaded.prototype.predict = function (eyesObj) {
    console.log("LOGGING..");

    if (!eyesObj) {
        return null;
    }

    var eyesFeats         = getEyesFeats( eyesObj );
    var numberOfEyesFeats = eyesFeats.length;
    var coefficientsX     = weights.X;
    var coefficientsY     = weights.Y;
    var predictedX        = 0;
    var predictedY        = 0;
    var i;

    for (i = 0; i < numberOfEyesFeats; i++) {
        predictedX += eyesFeats[i] * coefficientsX[i];
        predictedY += eyesFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

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

    //TODO this is a kludge, needs to be fixed
    //[TV:23-11-2016] Still a kludge ?

    var dataLength  = data.length;
    var currentData = undefined;
    var eyes        = undefined;
    var leftEye     = undefined;
    var rightEye    = undefined;
    var i;

    for (i = 0; i < dataLength; i++) {

        currentData = data[i];
        eyes        = currentData.eyes;
        leftEye     = eyes.left;
        rightEye    = eyes.right;

        leftEye.patch  = _getNewImageDataForEye(leftEye);
        rightEye.patch = _getNewImageDataForEye(rightEye);

        this.addData(eyes, currentData.screenPos, currentData.type);

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
