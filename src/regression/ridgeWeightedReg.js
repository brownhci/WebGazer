import * as Mat from "../core/mat";
import * as Util from "../utils/util";

var ridgeParameter  = Math.pow(10, -5);
var resizeWidth     = 10;
var resizeHeight    = 6;
var dataWindow      = 700;
var trailDataWindow = 10;

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Array} k - ridge parameter
 * @returns {Array} regression coefficients
 */
function ridge(y, X, k) {
    var nc             = X[0].length;
    var m_Coefficients = new Array(nc);
    var xt             = Mat.transpose(X);
    var solution       = [];
    var success        = true;
    do {
        var ss = Mat.mult(xt, X);
        // Set ridge regression adjustment
        for (var i = 0; i < nc; i++) {
            ss[i][i] = ss[i][i] + k;
        }

        // Carry out the regression
        var bb = Mat.mult(xt, y);
        for (var i = 0; i < nc; i++) {
            m_Coefficients[i] = bb[i][0];
        }
        try {
            var n = (m_Coefficients.length != 0 ? m_Coefficients.length / m_Coefficients.length : 0);
            if (m_Coefficients.length * n != m_Coefficients.length) {
                console.log("Array length must be a multiple of m")
            }
            solution = (ss.length == ss[0].length ? (numeric.LUsolve(numeric.LU(ss, true), bb)) : (Mat.QRDecomposition(ss, bb)));

            for (var i = 0; i < nc; i++) {
                m_Coefficients[i] = solution[i];
            }
            success = true;
        }
        catch (ex) {
            k *= 10;
            console.log(ex);
            success = false;
        }
    } while (!success);
    return m_Coefficients;
}

/**
 * Compute eyes size as gray histogram
 * @param {Object} eyes - The eyes where looking for gray histogram
 * @returns {Array.<T>} The eyes gray level histogram
 */
function getEyeFeats(eyes) {

    var leftFeat  = getEyeFeat( eyes.left );
    var rightFeat = getEyeFeat( eyes.right );

    return leftFeat.concat(rightFeat);

}

function getEyeFeat(eye) {

    var resizeEye = Util.resizeEye( eye, resizeWidth, resizeHeight );
    var greyscale = Util.grayscale( resizeEye.data, resizeEye.width, resizeEye.height );
    var histogram = [];

    Util.equalizeHistogram(greyscale, 5, histogram);

    return Array.prototype.slice.call(histogram);

}

/**
 * Constructor for the RidgeWightedReg Object which uses *weighted* ridge regression to correlate click and mouse movement to eye patch features
 * The weighting essentially provides a scheduled falloff in influence for mouse movements. This means that mouse moevemnts will only count towards the prediction for a short period of time, unlike
 * unweighted ridge regression where all mouse movements are treated equally.
 * @alias module:RidgeWightedReg
 * @exports RidgeWightedReg
 * @constructor
 */
var RidgeWeightedReg = function () {

    this.screenXClicksArray = new Util.DataWindow(dataWindow);
    this.screenYClicksArray = new Util.DataWindow(dataWindow);
    this.eyeFeaturesClicks  = new Util.DataWindow(dataWindow);

    //sets to one second worth of cursor trail
    this.trailTime         = 1000;
    this.trailDataWindow   = this.trailTime / 50;
    // this.trailDataWindow   = this.trailTime / WebGazer.getParams().moveTickSize;
    this.screenXTrailArray = new Util.DataWindow(trailDataWindow);
    this.screenYTrailArray = new Util.DataWindow(trailDataWindow);
    this.eyeFeaturesTrail  = new Util.DataWindow(trailDataWindow);
    this.trailTimes        = new Util.DataWindow(trailDataWindow);

    this.dataClicks = new Util.DataWindow(dataWindow);
    this.dataTrail  = new Util.DataWindow(dataWindow);

};


/**
 * The RidgeWeightedReg object name
 * @type {string}
 */
RidgeWeightedReg.prototype.name = 'ridge';

/**
 * Add given data from eyes to the regression model
 * @param {Object} eyes - util.eyes Object containing left and right data to add
 * @param {Object} screenPos - The current screen [x,y] position when a training event happens
 * @param {Object} type - The type of performed action
 */
RidgeWeightedReg.prototype.addData = function (eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    
    if (eyes.left.blink || eyes.right.blink) {
        return;
    }
    if (type === 'click') {
        this.screenXClicksArray.push([screenPos[0]]);
        this.screenYClicksArray.push([screenPos[1]]);

        this.eyeFeaturesClicks.push(getEyeFeats(eyes));
        this.dataClicks.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
    } else if (type === 'move') {
        this.screenXTrailArray.push([screenPos[0]]);
        this.screenYTrailArray.push([screenPos[1]]);

        this.eyeFeaturesTrail.push(getEyeFeats(eyes));
        this.trailTimes.push(performance.now());
        this.dataTrail.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
    }

    eyes.left.patch  = Array.from(eyes.left.patch.data);
    eyes.right.patch = Array.from(eyes.right.patch.data);
};

/**
 * Try to predict coordinates from pupil data based on the current set of training data
 * @param {Object} eyesObj - util.eyes Object
 * @returns {Object} prediction - Object containing the prediction data
 */
// *  @return {integer} prediction.x - the x screen coordinate predicted
// *  @return {integer} prediction.y - the y screen coordinate predicted
RidgeWeightedReg.prototype.predict = function (eyesObj) {

    if (!eyesObj || this.eyeFeaturesClicks.length == 0) {
        return null;
    }

    var acceptTime = performance.now() - this.trailTime;
    var trailX     = [];
    var trailY     = [];
    var trailFeat  = [];

    for (var i = 0; i < this.trailDataWindow; i++) {
        if (this.trailTimes.get(i) > acceptTime) {
            trailX.push(this.screenXTrailArray.get(i));
            trailY.push(this.screenYTrailArray.get(i));
            trailFeat.push(this.eyeFeaturesTrail.get(i));
        }
    }

    var len              = this.eyeFeaturesClicks.data.length;
    var weightedEyeFeats = new Array(len);
    var weightedXArray   = new Array(len);
    var weightedYArray   = new Array(len);

    for (var j = 0; j < len; j++) {

        var weight = Math.sqrt(1 / (len - j));
        // access from oldest to newest so should start with low weight and increase steadily
        //abstraction is leaking...
        var trueIndex = this.eyeFeaturesClicks.getTrueIndex(j);

        for (var k = 0; k < this.eyeFeaturesClicks.data[trueIndex].length; k++) {

            var val = this.eyeFeaturesClicks.data[trueIndex][k] * weight;
            if (weightedEyeFeats[trueIndex]) {
                weightedEyeFeats[trueIndex].push(val);
            } else {
                weightedEyeFeats[trueIndex] = [val];
            }

        }

        weightedXArray[trueIndex] = this.screenXClicksArray.get(j).slice(0, this.screenXClicksArray.get(j).length);
        weightedYArray[trueIndex] = this.screenYClicksArray.get(j).slice(0, this.screenYClicksArray.get(j).length);
        weightedXArray[j][0]      = weightedXArray[j][0] * weight;
        weightedYArray[j][0]      = weightedYArray[j][0] * weight;

    }

    var screenXArray = weightedXArray.concat(trailX);
    var screenYArray = weightedYArray.concat(trailY);
    var eyeFeatures  = weightedEyeFeats.concat(trailFeat);


    var coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
    var coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter);

    var eyeFeats   = getEyeFeats(eyesObj);
    var predictedX = 0;
    for (var i = 0; i < eyeFeats.length; i++) {
        predictedX += eyeFeats[i] * coefficientsX[i];
    }
    var predictedY = 0;
    for (var i = 0; i < eyeFeats.length; i++) {
        predictedY += eyeFeats[i] * coefficientsY[i];
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
 * @param {Array.<Object>} data - The array of util.eyes objects to set
 */
RidgeWeightedReg.prototype.setData = function (data) {
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
 * @returns {Array.<Object>|*} the set of training data stored in this regression class
 */
RidgeWeightedReg.prototype.getData = function () {
    return this.dataClicks.data.concat(this.dataTrail.data);
};

export {RidgeWeightedReg};
