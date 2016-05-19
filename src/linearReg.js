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

    LinearReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
        this.data = data;
    }

    LinearReg.prototype.getData = function() {
        return this.data;
    }

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
