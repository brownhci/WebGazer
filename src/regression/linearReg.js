/**
 * LinearReg class which uses pupil detection and simple linear regression to predict gaze from eye patches
 * @alias module:LinearReg
 * @exports LinearReg
 * @constructor
 */
var LinearReg = function () {
    this.leftDatasetX  = [];
    this.leftDatasetY  = [];
    this.rightDatasetX = [];
    this.rightDatasetY = [];
    this.data          = [];
};

/**
 * The LinearReg object name
 * @type {string}
 */
LinearReg.prototype.name = 'simple';

/**
 * Add given data from eyes to the regression model
 * @param {Object} eyes - util.eyes Object containing left and right data to extract
 * @param {Object} screenPos - The current screen point[x,y] position when a training event happens
 * @param {Object} type - The type of performed action
 */
LinearReg.prototype.addData = function (eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    webgazer.pupil.getPupils(eyes);
    if (!eyes.left.blink) {
        this.leftDatasetX.push([eyes.left.pupil[0][0], screenPos[0]]);
        this.leftDatasetY.push([eyes.left.pupil[0][1], screenPos[1]]);
    }

    if (!eyes.right.blink) {
        this.rightDatasetX.push([eyes.right.pupil[0][0], screenPos[0]]);
        this.rightDatasetY.push([eyes.right.pupil[0][1], screenPos[1]]);
    }
    this.data.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
};

/**
 * Seeds the model with initial training data,
 * in case data is stored in a separate location
 * @param {Array.<Object>} data - Array of util.eyes objects to set
 */
LinearReg.prototype.setData = function (data) {
    for (var i = 0; i < data.length; i++) {
        this.addData(data[i].eyes, data[i].screenPos, data[i].type);
    }
    this.data = data;
};

/**
 * Return the training data stored in this regression model, *this is not the model itself, but merely its training data
 * @returns {Array.<Object>|*} the set of training data stored in this regression class
 */
LinearReg.prototype.getData = function () {
    return this.data;
};

// TODO: return Point or ScreenCoordinates object to set correctly the doc and get full code base
/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @return {Object} prediction - Object containing the prediction data
 *  @return {integer} prediction.x - the x screen coordinate predicted
 *  @return {integer} prediction.y - the y screen coordinate predicted
 */
LinearReg.prototype.predict = function (eyesObj) {
    if (!eyesObj) {
        return null;
    }
    var result          = regression('linear', this.leftDatasetX);
    var leftSlopeX      = result.equation[0];
    var leftIntersceptX = result.equation[1];

    result              = regression('linear', this.leftDatasetY);
    var leftSlopeY      = result.equation[0];
    var leftIntersceptY = result.equation[1];

    result               = regression('linear', this.rightDatasetX);
    var rightSlopeX      = result.equation[0];
    var rightIntersceptX = result.equation[1];

    result               = regression('linear', this.rightDatasetY);
    var rightSlopeY      = result.equation[0];
    var rightIntersceptY = result.equation[1];

    webgazer.pupil.getPupils(eyesObj);

    var leftPupilX = eyesObj.left.pupil[0][0];
    var leftPupilY = eyesObj.left.pupil[0][1];

    var rightPupilX = eyesObj.right.pupil[0][0];
    var rightPupilY = eyesObj.right.pupil[0][1];

    var predictedX = Math.floor((((leftSlopeX * leftPupilX) + leftIntersceptX) + ((rightSlopeX * rightPupilX) + rightIntersceptX)) / 2);
    var predictedY = Math.floor((((leftSlopeY * leftPupilY) + leftIntersceptY) + ((rightSlopeY * rightPupilY) + rightIntersceptY)) / 2);
    return {
        x: predictedX,
        y: predictedY
    };
};

export {LinearReg};
