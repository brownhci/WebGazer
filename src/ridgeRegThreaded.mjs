import util from './util';
import numeric from 'numeric';
import util_regression from './util_regression';
import params from './params';

const reg = {};

var ridgeParameter = Math.pow(10,-5);
var dataWindow = 700;
var weights = {'X':[0],'Y':[0]};
var trailDataWindow = 10;


/**
 * Constructor of RidgeRegThreaded object,
 * it retrieve data window, and prepare a worker,
 * this object allow to perform threaded ridge regression
 * @constructor
 */
reg.RidgeRegThreaded = function() {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
reg.RidgeRegThreaded.prototype.init = function() { 
    this.screenXClicksArray = new util.DataWindow(dataWindow);  
    this.screenYClicksArray = new util.DataWindow(dataWindow);  
    this.eyeFeaturesClicks = new util.DataWindow(dataWindow);   

    this.screenXTrailArray = new util.DataWindow(trailDataWindow);  
    this.screenYTrailArray = new util.DataWindow(trailDataWindow);  
    this.eyeFeaturesTrail = new util.DataWindow(trailDataWindow);   

    this.dataClicks = new util.DataWindow(dataWindow);  
    this.dataTrail = new util.DataWindow(dataWindow);   

    // Place the src/ridgeworker.js file into the same directory as your html file. 
    if (!this.worker) { 
        this.worker = new Worker('ridgeWorker.mjs'); // [20200708] TODO: Figure out how to make this inline 
        this.worker.onerror = function(err) { console.log(err.message); };  
        this.worker.onmessage = function(evt) { 
            weights.X = evt.data.X; 
            weights.Y = evt.data.Y; 
        };  
        console.log('initialized worker');  
    }   

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
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
reg.RidgeRegThreaded.prototype.addData = function(eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    this.worker.postMessage({'eyes':util.getEyeFeats(eyes), 'screenPos':screenPos, 'type':type});
};

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.RidgeRegThreaded.prototype.predict = function(eyesObj) {
    // console.log('LOGGING..');
    if (!eyesObj) {
        return null;
    }
    var coefficientsX = weights.X;
    var coefficientsY = weights.Y;

    var eyeFeats = util.getEyeFeats(eyesObj);
    var predictedX = 0, predictedY = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedX += eyeFeats[i] * coefficientsX[i];
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};

/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
reg.RidgeRegThreaded.prototype.setData = util_regression.setData

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
reg.RidgeRegThreaded.prototype.getData = function() {
    return this.dataClicks.data;
};

/**
 * The RidgeRegThreaded object name
 * @type {string}
 */
reg.RidgeRegThreaded.prototype.name = 'ridge';

export default reg;
