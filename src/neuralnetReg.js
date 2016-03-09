(function(window) {

    window.gazer = window.gazer || {};
    gazer.reg = gazer.reg || {};
    gazer.mat = gazer.mat || {};
    gazer.util = gazer.util || {};
    gazer.params = gazer.params || {};

    var resizeWidth = 10;
    var resizeHeight = 6;

    //the network
    var learningRate = .7;
    var inputSize = 120;
    var hiddenSize = 100;
    var outputSize = 2;
    var inputLayer = new Layer(inputSize);
    var hiddenLayer = new Layer(hiddenSize);
    var outputLayer = new Layer(outputSize);

    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    var network = new Network({
        input: inputLayer,
        hidden: [hiddenLayer],
        output: outputLayer
    });

   
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

    gazer.reg.Neural = function() {
        this.screenXClicksArray = new gazer.util.DataWindow(dataWindow);
        this.screenYClicksArray = new gazer.util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new gazer.util.DataWindow(dataWindow);

        
    }

    gazer.reg.Neural.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        network.activate(getEyeFeats(eyes));
        network.propagate(learningRate, screenPos);
    }

    gazer.reg.Neural.prototype.predict = function(eyesObj) {
        if (!eyesObj || this.eyeFeaturesClicks.length == 0) {
            return null;
        }
        var features = getEyeFeats(eyesObj);
        var predicted = network.activate(features);
        return {
            x: predicted[0],
            y: predicted[1]
        };
    }

    gazer.reg.Neural.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            //TODO this is a kludge, needs to be fixed
            data[i].eyes.left.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.left.patch), data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.right.patch), data[i].eyes.right.width, data[i].eyes.right.height);
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    }

    gazer.reg.Neural.prototype.getData = function() {
        //TODO move data storage to webgazer object level
        return this.dataClicks.data.concat(this.dataTrail.data);
    }


    gazer.reg.Neural.prototype.name = 'ridge';
}(window));
