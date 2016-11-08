(function(window) {
    
    window.webgazer = window.webgazer || {};
    webgazer.reg = webgazer.reg || {};
    webgazer.pupil = webgazer.pupil || {};

    webgazer.reg.LinearReg = function() {
        this.leftDatasetX = [];
        this.leftDatasetY = [];
        this.rightDatasetX = [];
        this.rightDatasetY = [];
        this.data = [];
    }

    webgazer.reg.LinearReg.prototype.addData = function(eyes, screenPos, type) {
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
    }

    webgazer.reg.LinearReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
        this.data = data;
    }

    webgazer.reg.LinearReg.prototype.getData = function() {
        return this.data;
    }

    webgazer.reg.LinearReg.prototype.predict = function(eyesObj) {
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
        
        webgazer.pupil.getPupils(eyesObj);

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

    webgazer.reg.LinearReg.prototype.name = 'simple';
    
}(window));
