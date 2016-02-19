(function(window) {
    var ridgeParameter = Math.pow(10,-5);
    var resizeWidth = 10;
    var resizeHeight = 6;
    var dataWindow = 700;
    var trailDataWindow = 10; //TODO perhaps more? less?;
    var setInterval = 500;

    var screenXClicksArray = new gazer.util.DataWindow(dataWindow);
    var screenYClicksArray = new gazer.util.DataWindow(dataWindow);
    var eyeFeaturesClicks = new gazer.util.DataWindow(dataWindow);

    var screenXTrailArray = new gazer.util.DataWindow(trailDataWindow);
    var screenYTrailArray = new gazer.util.DataWindow(trailDataWindow);
    var eyeFeaturesTrail = new gazer.util.DataWindow(trailDataWindow);

    var dataClicks = new gazer.util.DataWindow(dataWindow);
    var dataTrail = new gazer.util.DataWindow(dataWindow);


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
        var xt = gazer.mat.transpose(X);
        var solution = new Array();
        var success = true;
        do{
            var ss = gazer.mat.mult(xt,X);
            // Set ridge regression adjustment
            for (var i = 0; i < nc; i++) {
                ss[i][i] = ss[i][i] + k;
            }

            // Carry out the regression
            var bb = gazer.mat.mult(xt,y);
            for(var i = 0; i < nc; i++) {
                m_Coefficients[i] = bb[i][0];
            }
            try{
                var n = (m_Coefficients.length != 0 ? m_Coefficients.length/m_Coefficients.length: 0);
                if (m_Coefficients.length*n != m_Coefficients.length){
                    console.log("Array length must be a multiple of m")
                }
                solution = (ss.length == ss[0].length ? (gazer.mat.LUDecomposition(ss,bb)) : (gazer.mat.QRDecomposition(ss,bb)));

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


    onmessage = function(data) {
        var screenPos = data['screenPos'];
        var eyes = data['eyes'];
        var type = data['type'];
        if (type === 'click') {
            screenXClicksArray.push([screenPos[0]]);
            screenYClicksArray.push([screenPos[1]]);

            eyeFeaturesClicks.push(getEyeFeats(eyes));
            dataClicks.push();
        } else if (type === 'move') {
            screenXTrailArray.push([screenPos[0]]);
            screenYTrailArray.push([screenPos[1]]);

            eyeFeaturesTrail.push(getEyeFeats(eyes));
            dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        }
       
        eyes.left.patch = Array.from(eyes.left.patch.data);
        eyes.right.patch = Array.from(eyes.right.patch.data);
    }

    function retrain() {
        var screenXArray = screenXClicksArray.data.concat(screenXTrailArray.data);
        var screenYArray = screenYClicksArray.data.concat(screenYTrailArray.data);
        var eyeFeatures = eyeFeaturesClicks.data.concat(eyeFeaturesTrail.data);

        var coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
        var coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter); 	
    }

    setInterval(retrain, trainInterval);

}(window));
