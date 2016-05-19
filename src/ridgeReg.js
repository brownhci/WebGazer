define('RidgeReg', ['util', 'regression', 'matrix'], function(util, reg, mat) {
    var ridgeParameter = Math.pow(10,-5);
    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;
    var trailDataWindow = 10;

    /**
     * Performs ridge regression, according to the Weka code.
     * @param {array} y corresponds to screen coordinates (either x or y) for each of n click events
     * @param {array of arrays} X corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
     * @param {array} ridge ridge parameter
     * @return{array} regression coefficients
     */
    function ridge(y, X, k){
        var nc = X[0].length;
        var m_Coefficients = new Array(nc);
        var xt = mat.transpose(X);
        var solution = new Array();
        var success = true;
        do{
            var ss = mat.mult(xt,X);
            // Set ridge regression adjustment
            for (var i = 0; i < nc; i++) {
                ss[i][i] = ss[i][i] + k;
            }

            // Carry out the regression
            var bb = mat.mult(xt,y);
            for(var i = 0; i < nc; i++) {
                m_Coefficients[i] = bb[i][0];
            }
            try{
                var n = (m_Coefficients.length != 0 ? m_Coefficients.length/m_Coefficients.length: 0);
                if (m_Coefficients.length*n != m_Coefficients.length){
                    console.log("Array length must be a multiple of m")
                }
                solution = (ss.length == ss[0].length ? (mat.LUDecomposition(ss,bb)) : (mat.QRDecomposition(ss,bb)));

                for (var i = 0; i < nc; i++){
                    m_Coefficients[i] = solution[i][0];
                }
                success = true;
            } 
            catch (ex){
                k *= 10;
                console.log(ex);
                success = false;
            }
        } while (!success);
        return m_Coefficients;
    }


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

    function getCurrentFixationIndex() {
        var index = 0;
        var recentX = this.screenXTrailArray.get(0);
        var recentY = this.screenYTrailArray.get(0);
        for (var i = this.screenXTrailArray.length - 1; i >= 0; i--) {
            var currX = this.screenXTrailArray.get(i);
            var currY = this.screenYTrailArray.get(i);
            var euclideanDistance = Math.sqrt(Math.pow((currX-recentX),2)+Math.pow((currY-recentY),2));
            if (euclideanDistance > 72){
                return i+1;
            }
        }
        return i;
    }

    /**
     * Constructor for the RidgeReg object which uses unweighted ridge regression to correlate click and mouse movement to eye patch features
     * @alias module:RidgeReg
     * @exports RidgeReg
     */
    var RidgeReg = function(params) {
        dataWindow = params.dataWindow || dataWindow;
        this.screenXClicksArray = new util.DataWindow(dataWindow);
        this.screenYClicksArray = new util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new util.DataWindow(dataWindow);

        //sets to one second worth of cursor trail
        this.trailTime = 1000;
        this.trailDataWindow = this.trailTime / params.moveTickSize;
        this.screenXTrailArray = new util.DataWindow(trailDataWindow);
        this.screenYTrailArray = new util.DataWindow(trailDataWindow);
        this.eyeFeaturesTrail = new util.DataWindow(trailDataWindow);
        this.trailTimes = new util.DataWindow(trailDataWindow);

        this.dataClicks = new util.DataWindow(dataWindow);
        this.dataTrail = new util.DataWindow(dataWindow);
    }

    RidgeReg.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        if (type === 'click') {
            this.screenXClicksArray.push([screenPos[0]]);
            this.screenYClicksArray.push([screenPos[1]]);

            this.eyeFeaturesClicks.push(getEyeFeats(eyes));
            this.dataClicks.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        } else if (type === 'move') {
            this.screenXTrailArray.push([screenPos[0]]);
            this.screenYTrailArray.push([screenPos[1]]);

            this.eyeFeaturesTrail.push(getEyeFeats(eyes));
            this.trailTimes.push(performance.now());
            this.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        }
       
        eyes.left.patch = Array.from(eyes.left.patch.data);
        eyes.right.patch = Array.from(eyes.right.patch.data);
    }

    RidgeReg.prototype.predict = function(eyesObj) {
        if (!eyesObj || this.eyeFeaturesClicks.length == 0) {
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

        var screenXArray = this.screenXClicksArray.data.concat(trailX);
        var screenYArray = this.screenYClicksArray.data.concat(trailY);
        var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);

        var coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
        var coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter); 	

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

    RidgeReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            //TODO this is a kludge, needs to be fixed
            data[i].eyes.left.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.left.patch), data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(new Uint8ClampedArray(data[i].eyes.right.patch), data[i].eyes.right.width, data[i].eyes.right.height);
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    }

    RidgeReg.prototype.getData = function() {
        return this.dataClicks.data.concat(this.dataTrail.data);
    }


    RidgeReg.prototype.name = 'ridge';

    return RidgeReg;
});
