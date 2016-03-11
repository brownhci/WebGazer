(function(window) {

    window.gazer = window.gazer || {};
    gazer.reg = gazer.reg || {};
    gazer.mat = gazer.mat || {};
    gazer.util = gazer.util || {};
    gazer.params = gazer.params || {};

    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;

    //the network
    var learningRate = .3;
    var inputSize = 120;
    var hiddenSize = 10;
    var outputSize = 2;
    var inputLayer = new Layer(inputSize);
    var hiddenLayer1 = new Layer(hiddenSize);
    var hiddenLayer2 = new Layer(hiddenSize);
    var outputLayer = new Layer(outputSize);

    //inputLayer.project(outputLayer);
    inputLayer.project(hiddenLayer1);
    //hiddenLayer1.project(hiddenLayer2);
    hiddenLayer1.project(outputLayer);
    //hiddenLayer2.project(outputLayer);

    var network = new Network({
        input: inputLayer,
        hidden: [hiddenLayer1],
        //hidden: [hiddenLayer1, hiddenLayer2],
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

        leftGrayArray = Array.prototype.slice.call(histLeft).map(function(val) { return val / 255; });
        rightGrayArray = Array.prototype.slice.call(histRight).map(function(val) { return val / 255; });

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
        this.screenCoords = new gazer.util.DataWindow(dataWindow);
        this.eyeFeatures = new gazer.util.DataWindow(dataWindow);
    }

    gazer.reg.Neural.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        if (type == 'move') {
            return;
        }
        screenPos[0] = screenPos[0] / window.innerWidth;
        screenPos[1] = screenPos[1] / window.innerHeight;

        var features = getEyeFeats(eyes);
        this.eyeFeatures.push(features);
        this.screenCoords.push(screenPos);

        //for (var j = 0; j < 100; j++) {
            for (var i = 0; i < this.eyeFeatures.length; i++) {
                network.activate(this.eyeFeatures.get(i));
                network.propagate(learningRate, this.screenCoords.get(i));
            }
        //}
        
        console.log('trained');
    }

    gazer.reg.Neural.prototype.predict = function(eyesObj) {
        if (!eyesObj || this.eyeFeatures.length < 2) {
            return null;
        }
        var features = getEyeFeats(eyesObj);
        var predicted = network.activate(features);
        return {
            x: predicted[0] * window.innerWidth,
            y: predicted[1] * window.innerHeight
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
