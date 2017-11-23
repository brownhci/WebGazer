
console.log('thread starting');
//importScripts('../src/util.js', '../src/mat.js');
@import "src/mat.js"
var ridgeParameter = Math.pow(10,-5);
var resizeWidth = 10;
var resizeHeight = 6;
var dataWindow = 700;
var trailDataWindow = 10;
var trainInterval = 500;

var screenXClicksArray = new self.webgazer.util.DataWindow(dataWindow);
var screenYClicksArray = new self.webgazer.util.DataWindow(dataWindow);
var eyeFeaturesClicks = new self.webgazer.util.DataWindow(dataWindow);

var screenXTrailArray = new self.webgazer.util.DataWindow(trailDataWindow);
var screenYTrailArray = new self.webgazer.util.DataWindow(trailDataWindow);
var eyeFeaturesTrail = new self.webgazer.util.DataWindow(trailDataWindow);

var dataClicks = new self.webgazer.util.DataWindow(dataWindow);
var dataTrail = new self.webgazer.util.DataWindow(dataWindow);


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
    var xt = self.webgazer.mat.transpose(X);
    var solution = new Array();
    var success = true;
    do{
        var ss = self.webgazer.mat.mult(xt,X);
        // Set ridge regression adjustment
        for (var i = 0; i < nc; i++) {
            ss[i][i] = ss[i][i] + k;
        }

        // Carry out the regression
        var bb = self.webgazer.mat.mult(xt,y);
        for(var i = 0; i < nc; i++) {
            m_Coefficients[i] = bb[i][0];
        }
        try{
            var n = (m_Coefficients.length != 0 ? m_Coefficients.length/m_Coefficients.length: 0);
            if (m_Coefficients.length*n != m_Coefficients.length){
                console.log("Array length must be a multiple of m")
            }
            solution = (ss.length == ss[0].length ? (self.webgazer.mat.LUDecomposition(ss,bb)) : (self.webgazer.mat.QRDecomposition(ss,bb)));

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


self.onmessage = function(event) {
    var data = event.data;
    var screenPos = data['screenPos'];
    var eyes = data['eyes'];
    var type = data['type'];
    if (type === 'click') {
        self.screenXClicksArray.push([screenPos[0]]);
        self.screenYClicksArray.push([screenPos[1]]);

        self.eyeFeaturesClicks.push(eyes);
    } else if (type === 'move') {
        self.screenXTrailArray.push([screenPos[0]]);
        self.screenYTrailArray.push([screenPos[1]]);

        self.eyeFeaturesTrail.push(eyes);
        self.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
    }
    self.needsTraining = true;
}

function retrain() {
    if (self.screenXClicksArray.length == 0) {
        return;
    }
    if (!self.needsTraining) {
        return;
    }
    var screenXArray = self.screenXClicksArray.data.concat(self.screenXTrailArray.data);
    var screenYArray = self.screenYClicksArray.data.concat(self.screenYTrailArray.data);
    var eyeFeatures = self.eyeFeaturesClicks.data.concat(self.eyeFeaturesTrail.data);

    var coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
    var coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter);
    console.log(coefficientsX);
    self.postMessage({'X':coefficientsX, 'Y': coefficientsY});
    self.needsTraining = false;
}

setInterval(retrain, trainInterval);
