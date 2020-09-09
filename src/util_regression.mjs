import util from './util';
import numeric from 'numeric';
import mat from './mat';
import params from './params';

const util_regression = {};


/**
 * Initialize new arrays and initialize Kalman filter for regressions.
 */
util_regression.InitRegression = function() {
  var dataWindow = 700;
  var trailDataWindow = 10;
  this.ridgeParameter = Math.pow(10,-5);
  this.errorXArray = new util.DataWindow(dataWindow);
  this.errorYArray = new util.DataWindow(dataWindow);


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
  this.dataTrail = new util.DataWindow(trailDataWindow);

  // Initialize Kalman filter [20200608 xk] what do we do about parameters?
  // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least
  //               by my own anecdotal observation a 4x1 x vector seems to work alright
  var F = [ [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 1, 0],
    [0, 0, 0, 1]];

  //Parameters Q and R may require some fine tuning
  var Q = [ [1/4, 0,    1/2, 0],
    [0,   1/4,  0,   1/2],
    [1/2, 0,    1,   0],
    [0,  1/2,  0,   1]];// * delta_t
  var delta_t = 1/10; // The amount of time between frames
  Q = numeric.mul(Q, delta_t);

  var H = [ [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0]];
  var H = [ [1, 0, 0, 0],
    [0, 1, 0, 0]];
  var pixel_error = 47; //We will need to fine tune this value [20200611 xk] I just put a random value here

  //This matrix represents the expected measurement error
  var R = numeric.mul(numeric.identity(2), pixel_error);

  var P_initial = numeric.mul(numeric.identity(4), 0.0001); //Initial covariance matrix
  var x_initial = [[500], [500], [0], [0]]; // Initial measurement matrix

  this.kalman = new util_regression.KalmanFilter(F, H, Q, R, P_initial, x_initial);
}

/**
 * Kalman Filter constructor
 * Kalman filters work by reducing the amount of noise in a models.
 * https://blog.cordiner.net/2011/05/03/object-tracking-using-a-kalman-filter-matlab/
 *
 * @param {Array.<Array.<Number>>} F - transition matrix
 * @param {Array.<Array.<Number>>} Q - process noise matrix
 * @param {Array.<Array.<Number>>} H - maps between measurement vector and noise matrix
 * @param {Array.<Array.<Number>>} R - defines measurement error of the device
 * @param {Array} P_initial - the initial state
 * @param {Array} X_initial - the initial state of the device
 */
util_regression.KalmanFilter = function(F, H, Q, R, P_initial, X_initial) {
    this.F = F; // State transition matrix
    this.Q = Q; // Process noise matrix
    this.H = H; // Transformation matrix
    this.R = R; // Measurement Noise
    this.P = P_initial; //Initial covariance matrix
    this.X = X_initial; //Initial guess of measurement
};

/**
 * Get Kalman next filtered value and update the internal state
 * @param {Array} z - the new measurement
 * @return {Array}
 */
util_regression.KalmanFilter.prototype.update = function(z) {
    // Here, we define all the different matrix operations we will need
    var add = numeric.add, sub = numeric.sub, inv = numeric.inv, identity = numeric.identity;
    var mult = mat.mult, transpose = mat.transpose;
    //TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    var X_p = mult(this.F, this.X); //Update state vector
    var P_p = add(mult(mult(this.F,this.P), transpose(this.F)), this.Q); //Predicted covaraince

    //Calculate the update values
    var y = sub(z, mult(this.H, X_p)); // This is the measurement error (between what we expect and the actual value)
    var S = add(mult(mult(this.H, P_p), transpose(this.H)), this.R); //This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    var K = mult(P_p, mult(transpose(this.H), inv(S))); //This is the Optimal Kalman Gain

    //We need to change Y into it's column vector form
    for(var i = 0; i < y.length; i++){
        y[i] = [y[i]];
    }

    //Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(X_p, mult(K, y));
    this.P = mult(sub(identity(K.length), mult(K,this.H)), P_p);
    return transpose(mult(this.H, this.X))[0]; //Transforms the predicted state back into it's measurement form
};

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Array} k - ridge parameter
 * @return{Array} regression coefficients
 */
util_regression.ridge = function(y, X, k){
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
            var n = (m_Coefficients.length !== 0 ? m_Coefficients.length/m_Coefficients.length: 0);
            if (m_Coefficients.length*n !== m_Coefficients.length){
                console.log('Array length must be a multiple of m')
            }
            solution = (ss.length === ss[0].length ? (numeric.LUsolve(numeric.LU(ss,true),bb)) : (webgazer.mat.QRDecomposition(ss,bb)));

            for (var i = 0; i < nc; i++){
                m_Coefficients[i] = solution[i];
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

/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
util_regression.setData = function(data) {
  for (var i = 0; i < data.length; i++) {
    // Clone data array
    var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
    var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
    // Duplicate ImageData object
    data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
    data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

    // Add those data objects to model
    this.addData(data[i].eyes, data[i].screenPos, data[i].type);
  }
};


//not used ?!
//TODO: still usefull ???
/**
 *
 * @returns {Number}
 */
util_regression.getCurrentFixationIndex = function() {
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

util_regression.addData = function(eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    if (type === 'click') {
        this.screenXClicksArray.push([screenPos[0]]);
        this.screenYClicksArray.push([screenPos[1]]);
        this.eyeFeaturesClicks.push(util.getEyeFeats(eyes));
        this.dataClicks.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
    } else if (type === 'move') {
        this.screenXTrailArray.push([screenPos[0]]);
        this.screenYTrailArray.push([screenPos[1]]);

        this.eyeFeaturesTrail.push(util.getEyeFeats(eyes));
        this.trailTimes.push(performance.now());
        this.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
    }

    // [20180730 JT] Why do we do this? It doesn't return anything...
    // But as JS is pass by reference, it still affects it.
    //
    // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
    //eyes.left.patch = Array.from(eyes.left.patch.data);
    //eyes.right.patch = Array.from(eyes.right.patch.data);
};

export default util_regression;