define('LinearReg', ['pupil'], function(pupil) {

    /**
     * LinearReg class which uses pupil detection and simple linear regression to predict gaze from eye patches
     * @alias module:LinearReg
     * @exports LinearReg
     */
    var LinearReg = function() {
        this.leftDatasetX = [];
        this.leftDatasetY = [];
        this.rightDatasetX = [];
        this.rightDatasetY = [];
        this.data = [];
    }
    
    /**
     * adds data to the regression model
     * @param {object} eyes - util.eyes Object containing left and right data
     * @param {array} screenPos - the screen [x,y] position when a training event happens
     * @param {string} type - the type of event
     */
    LinearReg.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        pupil.getPupils(eyes);
        if (!eyes.left.blink) {
            this.leftDatasetX.push([eyes.left.pupil[0][0], screenPos[0]]);
            this.leftDatasetY.push([eyes.left.pupil[0][1], screenPos[1]]);
        }

        if (!eyes.right.blink) {
            this.rightDatasetX.push([eyes.right.pupil[0][0], screenPos[0]]);
            this.rightDatasetY.push([eyes.right.pupil[0][1], screenPos[1]]);
        }
        this.data.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
    }

    /**
     * seeds the model with initial training data in case data is stored in a separate location
     * @params {Object[]} data - array of util.eyes objects
     */
    LinearReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
        this.data = data;
    }

    /**
     * gets the training data stored in this regression model, *this is not the model itself, but merely its training data*
     * @return {Object[]} the set of training data stored in this regression class
     */
    LinearReg.prototype.getData = function() {
        return this.data;
    }

    /**
     * gets a prediction based on the current set of training data
     * @param {object} eyesObj - util.eyes Object
     * @return {Object} prediction - Object containing the prediction data
     *  @return {integer} prediction.x - the x screen coordinate predicted
     *  @return {integer} prediction.y - the y screen coordinate predicted
     */
    LinearReg.prototype.predict = function(eyesObj) {
        if (!eyesObj) {
            return null;
        }
        var result = regression('linear', this.leftDatasetX);
        var leftSlopeX = result.equation[0];
        var leftIntersceptX = result.equation[1];

        result = regression('linear', this.leftDatasetY);
        var leftSlopeY = result.equation[0];
        var leftIntersceptY = result.equation[1];

        result = regression('linear', this.rightDatasetX);
        var rightSlopeX = result.equation[0];
        var rightIntersceptX = result.equation[1];

        result = regression('linear', this.rightDatasetY);
        var rightSlopeY = result.equation[0];
        var rightIntersceptY = result.equation[1];
        
        pupil.getPupils(eyesObj);

        var leftPupilX = eyesObj.left.pupil[0][0];
        var leftPupilY = eyesObj.left.pupil[0][1];

        var rightPupilX = eyesObj.right.pupil[0][0];
        var rightPupilY = eyesObj.right.pupil[0][1];

        predictedX = Math.floor((((leftSlopeX * leftPupilX) + leftIntersceptX) + ((rightSlopeX * rightPupilX) + rightIntersceptX))/2);
        predictedY = Math.floor((((leftSlopeY * leftPupilY) + leftIntersceptY) + ((rightSlopeY * rightPupilY) + rightIntersceptY))/2);
        return {
            x: predictedX,
            y: predictedY
        };
    }

    LinearReg.prototype.name = 'LinearReg';

    return LinearReg;
});
