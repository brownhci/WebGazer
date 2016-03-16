(function(window) {

    window.gazer = window.gazer || {};
    gazer.reg = gazer.reg || {};
    gazer.mat = gazer.mat || {};
    gazer.util = gazer.util || {};
    gazer.params = gazer.params || {};

    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 2000;


    //the network
    var learningRate = .5;
    var inputSize = 60;
    var hiddenSize = 120;
    var outputSize = 2;
    var inputLayer = new Layer(inputSize);
    var hiddenLayer1 = new Layer(hiddenSize);
    //change neurons to TANH function instead of sigmoid
    var hiddenNeurons = hiddenLayer1.neurons();
    for (var i in hiddenNeurons) {
        hiddenNeurons[i].squash = Neuron.squash.TANH;
    }
    var hiddenLayer2 = new Layer(hiddenSize);
    var outputLayer = new Layer(outputSize);
    var outputNeurons = outputLayer.neurons();
    for (var i in outputNeurons) {
        outputNeurons[i].squash = Neuron.squash.TANH;
        outputNeurons[i].bias = .5;
    }
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

   
    function getEyeFeats(eyes, debug) {
        var resizedLeft = gazer.util.resizeEye(eyes.left, resizeWidth, resizeHeight);
        var resizedright = gazer.util.resizeEye(eyes.right, resizeWidth, resizeHeight);

        var leftGray = gazer.util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = gazer.util.grayscale(resizedright.data, resizedright.width, resizedright.height);

        //TODO either move objectdetect into gazer namespace or re-implement
        var histLeft = [];
        objectdetect.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        objectdetect.equalizeHistogram(rightGray, 5, histRight);
       
        var leftLen = 255;
        var rightLen = 255;
        //leftLen = Math.sqrt(histLeft.reduce(function(prev, curr){return prev + (curr * curr);}, 0));
        //rightLen = Math.sqrt(histRight.reduce(function(prev, curr){return prev + (curr * curr);}, 0));
        leftGrayArray = Array.prototype.slice.call(histLeft).map(function(val) { return val / leftLen; });
        rightGrayArray = Array.prototype.slice.call(histRight).map(function(val) { return val / rightLen; });

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
        var str = '\n';
        /*
        for (var i = 0; i < resizeHeight; i++) {
            for (var j = 0; j < resizeWidth; j++) {
                if (leftGrayArray[i * resizeWidth + j] > .5) {
                    str += '_';
                } else {
                    str += '*';
                }
            }
            str += '\n';
        }
        */
        debug.set('eyeFeats', str);
        debug.show('leftEye', function(canvas) {
            canvas.getContext('2d').putImageData(eyes.left.patch, 0, 0);
        })
        (function(debug) {
        debug.addButton('captureEye', function() {
            debug.show('capture', function(canvas) {
                var eye = debug.canvas['leftEye'];
                canvas.getContext('2d').putImageData(eye.getImageData(0,0,eye.width,eye.height));
            });
        });
        }(debug))
        return leftGrayArray; //.concat(rightGrayArray).concat(headVals);
    }

    gazer.reg.Neural = function() {
        this.screenCoords = new gazer.util.DataWindow(dataWindow);
        this.eyeFeatures = new gazer.util.DataWindow(dataWindow);
        this.debug = new gazer.util.DebugBox();
        this.debug.set('inSize', inputSize);
        this.debug.set('hiddenSize', hiddenSize);
        this.debug.set('learningRate', learningRate);
        /* doesn't actually reset the neural network unfortunately */
        (function(t) {
            t.debug.addButton('reset', function() {
                t.eyeFeatures = new gazer.util.DataWindow(dataWindow);
                t.eyeFeatures = new gazer.util.DataWindow(dataWindow);
                t.debug.set('trainings',0);
            });
            t.debug.addButton('train', function() {
                for (var j = 0; j < 10; j++) {
                    for (var i = 0; i < t.eyeFeatures.length; i++) {
                        network.activate(t.eyeFeatures.get(i));
                        network.propagate(learningRate, t.screenCoords.get(i));
                    }
                }

                t.debug.inc('trainings');
            });
        }(this));
    }

    gazer.reg.Neural.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        screenPos[0] = screenPos[0] / window.innerWidth;
        screenPos[1] = screenPos[1] / window.innerHeight;

        var features = getEyeFeats(eyes, this.debug);
        this.eyeFeatures.push(features);
        this.screenCoords.push(screenPos);

/*
        for (var j = 0; j < 10; j++) {
            for (var i = 0; i < this.eyeFeatures.length; i++) {
                network.activate(this.eyeFeatures.get(i));
                network.propagate(learningRate, this.screenCoords.get(i));
            }
        }

        this.debug.inc('trainings');
*/
        this.debug.set('dataLen', this.eyeFeatures.length);
        
        console.log('trained');
    }

    gazer.reg.Neural.prototype.predict = function(eyesObj) {
        if (!eyesObj || this.eyeFeatures.length < 2) {
            return null;
        }
        var features = getEyeFeats(eyesObj, this.debug);
        var predicted = network.activate(features);
        this.debug.set('prectictedX', predicted[0] + ' ' + (predicted[0] * window.innerWidth));
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
