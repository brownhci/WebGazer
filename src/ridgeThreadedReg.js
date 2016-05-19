define('RidgeThreadedReg', ['util', 'regression', 'matrix'], function(util, reg, mat) {

    var ridgeParameter = Math.pow(10,-5);
    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;
    var weights = {'X':[0],'Y':[0]};
    var trailDataWindow = 10;

    function getEyeFeats(eyes) {
        var resizedLeft = util.resizeEye(eyes.left, resizeWidth, resizeHeight);
        var resizedright = util.resizeEye(eyes.right, resizeWidth, resizeHeight);

        var leftGray = util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = util.grayscale(resizedright.data, resizedright.width, resizedright.height);

        var histLeft = [];
        util.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        util.equalizeHistogram(rightGray, 5, histRight);

        var leftGrayArray = Array.prototype.slice.call(histLeft);
        var rightGrayArray = Array.prototype.slice.call(histRight);

        return leftGrayArray.concat(rightGrayArray);
    }

    
    function updateWeights(event) {
        console.log(event.data);
        this.weights = event.data;
    }

    /**
     * Constructor for the RidgeThreadedReg object which uses unweighted ridge regression to correlate click and mouse movement to eye patch features
     * This class has the same functionality as RidgeReg with two large differences:
     * 1. training examples are batched for retraining the model instead of retraining on each new example
     * 2. the training runs on a separate thread which should enable better running time
     * @alias module:RidgeThreadedReg
     * @exports RidgeThreadedReg
     */
    var RidgeThreadedReg = function() {
        this.screenXClicksArray = new util.DataWindow(dataWindow);
        this.screenYClicksArray = new util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new util.DataWindow(dataWindow);

        this.screenXTrailArray = new util.DataWindow(trailDataWindow);
        this.screenYTrailArray = new util.DataWindow(trailDataWindow);
        this.eyeFeaturesTrail = new util.DataWindow(trailDataWindow);

        this.dataClicks = new util.DataWindow(dataWindow);
        this.dataTrail = new util.DataWindow(dataWindow);


        this.worker = new Worker('../src/ridgeWorker.js');
        this.worker.onerror = function(err) { console.log(err.message); };
        this.worker.onmessage = function(event) {
            weights = event.data;   
        };
    }

    RidgeThreadedReg.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        this.worker.postMessage({'eyes':getEyeFeats(eyes), 'screenPos':screenPos, 'type':type})
    }

    RidgeThreadedReg.prototype.predict = function(eyesObj) {
        console.log('in predict1');
        if (!eyesObj) {
            return null;
        }
        console.log(weights);
        var coefficientsX = weights.X;
        var coefficientsY = weights.Y;

        var eyeFeats = getEyeFeats(eyesObj);
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

        return {
            x: predictedX,
            y: predictedY
        };
    }

    RidgeThreadedReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            //TODO this is a kludge, needs to be fixed
            data[i].eyes.left.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.left.patch), data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.right.patch), data[i].eyes.right.width, data[i].eyes.right.height);
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    }

    RidgeThreadedReg.prototype.getData = function() {
        return this.dataClicks.data.concat(this.dataTrail.data);
    }


    RidgeThreadedReg.prototype.name = 'RidgeThreadedReg';

    return RidgeThreadedReg;
});
