(function(window) {

    window.gazer = window.gazer || {};
    gazer.reg = gazer.reg || {};
    gazer.mat = gazer.mat || {};
    gazer.util = gazer.util || {};

    var ridgeParameter = Math.pow(10,-5);
    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;
    var weights = {'X':[0],'Y':[0]};
    var trailDataWindow = 10; //TODO perhaps more? less?;

    function getEyeFeats(eyes) {
        var resizedLeft = gazer.util.resizeEye(eyes.left, resizeWidth, resizeHeight);
        var resizedright = gazer.util.resizeEye(eyes.right, resizeWidth, resizeHeight);

        var leftGray = gazer.util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = gazer.util.grayscale(resizedright.data, resizedright.width, resizedright.height);

        //TODO either move objectdetect into gazer namespace or re-implement
        var histLeft = [];
        objectdetect.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        objectdetect.equalizeHistogram(rightGray, 5, histRight);

        leftGrayArray = Array.prototype.slice.call(histLeft);
        rightGrayArray = Array.prototype.slice.call(histRight);

        //TODO take into account head positions
        //23 - left eye left
        //25 - left eye right
        //30 - right eye left
        //28 - right eye right
        /*var widthLeft = eyes.positions[23][0] - eyes.positions[25][0];
        var widthRight = eyes.positions[30][0] - eyes.positions[28][0];
        var widthRatio = widthLeft / widthRight;
        var widthTotal = widthLeft + widthRight;
        var headVals = [eyes.positions[23][0], eyes.positions[23][1], eyes.positions[25][0], eyes.positions[25][1],
                        eyes.positions[30][0], eyes.positions[30][1], eyes.positions[28][0], eyes.positions[28][1],
                        widthLeft, widthRight, widthRatio, widthTotal]; */
        var headVals = [];
        return leftGrayArray.concat(rightGrayArray).concat(headVals);
    }

    
    function updateWeights(event) {
        console.log(event.data);
        this.weights = event.data;
    }

    gazer.reg.RidgeReg = function() {
        this.screenXClicksArray = new gazer.util.DataWindow(dataWindow);
        this.screenYClicksArray = new gazer.util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new gazer.util.DataWindow(dataWindow);

        this.screenXTrailArray = new gazer.util.DataWindow(trailDataWindow);
        this.screenYTrailArray = new gazer.util.DataWindow(trailDataWindow);
        this.eyeFeaturesTrail = new gazer.util.DataWindow(trailDataWindow);

        this.dataClicks = new gazer.util.DataWindow(dataWindow);
        this.dataTrail = new gazer.util.DataWindow(dataWindow);


        this.worker = new Worker('../src/ridgeWorker.js');
        this.worker.onerror = function(err) { console.log(err.message); };
        this.worker.onmessage = function(event) {
            weights = event.data;   
        };
    }

    gazer.reg.RidgeReg.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        this.worker.postMessage({'eyes':getEyeFeats(eyes), 'screenPos':screenPos, 'type':type})
    }

    gazer.reg.RidgeReg.prototype.predict = function(eyesObj) {
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

    gazer.reg.RidgeReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            //TODO this is a kludge, needs to be fixed
            data[i].eyes.left.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.left.patch), data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.right.patch), data[i].eyes.right.width, data[i].eyes.right.height);
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    }

    gazer.reg.RidgeReg.prototype.getData = function() {
        //TODO move data storage to webgazer object level
        return this.dataClicks.data.concat(this.dataTrail.data);
    }


    gazer.reg.RidgeReg.prototype.name = 'ridge';
}(window));
