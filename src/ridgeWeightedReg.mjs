import util from './util';
import util_regression from './util_regression';
import params from './params'

const reg = {};

/**
 * Constructor of RidgeWeightedReg object
 * @constructor
 */
reg.RidgeWeightedReg = function() {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
reg.RidgeWeightedReg.prototype.init = util_regression.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
reg.RidgeWeightedReg.prototype.addData = util_regression.addData

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.RidgeWeightedReg.prototype.predict = function(eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }
    var acceptTime = performance.now() - this.trailTime;
    var trailX = [];
    var trailY = [];
    var trailFeat = [];
    for (var i = 0; i < this.trailDataWindow; i++) {
        if (this.trailTimes.get(i) > acceptTime) {
            trailX.push(this.screenXTrailArray.get(i));
            trailY.push(this.screenYTrailArray.get(i));
            trailFeat.push(this.eyeFeaturesTrail.get(i));
        }
    }

    var len = this.eyeFeaturesClicks.data.length;
    var weightedEyeFeats = Array(len);
    var weightedXArray = Array(len);
    var weightedYArray = Array(len);
    for (var i = 0; i < len; i++) {
        var weight = Math.sqrt( 1 / (len - i) ); // access from oldest to newest so should start with low weight and increase steadily
        //abstraction is leaking...
        var trueIndex = this.eyeFeaturesClicks.getTrueIndex(i);
        for (var j = 0; j < this.eyeFeaturesClicks.data[trueIndex].length; j++) {
            var val = this.eyeFeaturesClicks.data[trueIndex][j] * weight;
            if (weightedEyeFeats[trueIndex] !== undefined){
                weightedEyeFeats[trueIndex].push(val);
            } else {
                weightedEyeFeats[trueIndex] = [val];
            }
        }
        weightedXArray[trueIndex] = this.screenXClicksArray.get(i).slice(0, this.screenXClicksArray.get(i).length);
        weightedYArray[trueIndex] = this.screenYClicksArray.get(i).slice(0, this.screenYClicksArray.get(i).length);
        weightedXArray[i][0] = weightedXArray[i][0] * weight;
        weightedYArray[i][0] = weightedYArray[i][0] * weight;
    }

    var screenXArray = weightedXArray.concat(trailX);
    var screenYArray = weightedYArray.concat(trailY);
    var eyeFeatures = weightedEyeFeats.concat(trailFeat);

    var coefficientsX = util_regression.ridge(screenXArray, eyeFeatures, this.ridgeParameter);
    var coefficientsY = util_regression.ridge(screenYArray, eyeFeatures, this.ridgeParameter);

    var eyeFeats = util.getEyeFeats(eyesObj);
    var predictedX = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedX += eyeFeats[i] * coefficientsX[i];
    }
    var predictedY = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};

reg.RidgeWeightedReg.prototype.setData = util_regression.setData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
reg.RidgeWeightedReg.prototype.getData = function() {
    return this.dataClicks.data;
};

/**
 * The RidgeWeightedReg object name
 * @type {string}
 */
reg.RidgeWeightedReg.prototype.name = 'ridgeWeighted';

export default reg;
