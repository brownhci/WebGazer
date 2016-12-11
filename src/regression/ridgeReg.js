import * as Mat from "../core/mat";
import * as Util from "../utils/util";

var ridgeParameter  = Math.pow( 10, -5 );
var resizeWidth     = 10;
var resizeHeight    = 6;
var dataWindow      = 700;
var trailDataWindow = 10;

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} screenCoordinates - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Number} ridgeParameter - ridge parameter
 * @returns {Array} regression coefficients
 */
function ridge ( screenCoordinates, X, ridgeParameter ) {

    var numberOfClick          = X[ 0 ].length;
    var matrixTranspose        = Mat.transpose( X );
    var ss                     = Mat.mult( matrixTranspose, X );
    var bb                     = Mat.mult( matrixTranspose, screenCoordinates );
    var regressionCoefficients = new Array( numberOfClick );
    //var   numberOfCoefficients   = 0;
    var solution               = [];
    var success                = true;
    var i;
    var j;

    do {

        for ( i = 0 ; i < numberOfClick ; i++ ) {
            ss[ i ][ i ]                = ss[ i ][ i ] + ridgeParameter; // Set ridge regression adjustment
            regressionCoefficients[ i ] = bb[ i ][ 0 ]; // Carry out the regression
        }

        try {

            // TODO: this is always true... where is the subtlety ?
            // numberOfCoefficients = regressionCoefficients.length;
            // if (numberOfCoefficients * numberOfCoefficients / numberOfCoefficients !== numberOfCoefficients) {
            //     console.log("Array length must be a multiple of m");
            // }

            solution = (ss.length === ss[ 0 ].length) ? (numeric.LUsolve( numeric.LU( ss, true ), bb )) : (Mat.QRDecomposition( ss, bb ));

            for ( j = 0 ; j < numberOfClick ; j++ ) {
                regressionCoefficients[ j ] = solution[ j ];
            }
            success = true;

        } catch ( error ) {

            //TODO: logger instead ?
            console.error( error );

            ridgeParameter *= 10;
            success = false;

        }

    } while ( !success );

    return regressionCoefficients;

}

/**
 * Compute eyes size as gray histogram
 * @param {Object} eyes - The eyes where looking for gray histogram
 * @returns {Array.<T>} The eyes gray level histogram
 */
function getEyeFeats ( eyes ) {

    var leftFeat  = getEyeFeat( eyes.left );
    var rightFeat = getEyeFeat( eyes.right );

    return leftFeat.concat( rightFeat );

}

function getEyeFeat ( eye ) {

    var resizeEye = Util.resizeEye( eye, resizeWidth, resizeHeight );
    var greyscale = Util.grayscale( resizeEye.data, resizeEye.width, resizeEye.height );
    var histogram = [];

    Util.equalizeHistogram( greyscale, 5, histogram );

    return Array.prototype.slice.call( histogram );

}

/**
 * Constructor for the RidgeReg Object which uses unweighted ridge regression to correlate click and mouse movement to eye patch features
 * @alias module:RidgeReg
 * @exports RidgeReg
 * @constructor
 */
var RidgeReg = function () {

    this.screenXClicksArray = new Util.DataWindow( dataWindow );
    this.screenYClicksArray = new Util.DataWindow( dataWindow );
    this.eyeFeaturesClicks  = new Util.DataWindow( dataWindow );

    //sets to one second worth of cursor trail
    this.trailTime = 1000;

    //TODO: Uuumm seems to not be okay, maybe a self.parameter
    //TODO: This is an "strong coupling" !!! Need to break it properly !
    var moveTickSize       = 50;
    this.trailDataWindow   = this.trailTime / moveTickSize;
    // this.trailDataWindow   = this.trailTime / WebGazer.getParams().moveTickSize;
    this.screenXTrailArray = new Util.DataWindow( trailDataWindow );
    this.screenYTrailArray = new Util.DataWindow( trailDataWindow );
    this.eyeFeaturesTrail  = new Util.DataWindow( trailDataWindow );
    this.trailTimes        = new Util.DataWindow( trailDataWindow );

    this.dataClicks = new Util.DataWindow( dataWindow );
    this.dataTrail  = new Util.DataWindow( dataWindow );

    function _getNewImageDataForEye ( eye ) {

        return new ImageData( new Uint8ClampedArray( eye.patch ), eye.width, eye.height );

    }

};

/**
 * The RidgeReg object name
 * @type {string}
 */
RidgeReg.prototype.name = 'ridge';

/**
 * Add given data from eyes to the regression model
 * @param {Object} eyes - util.eyes Object containing left and right data to add
 * @param {Object} screenPos - The current screen [x,y] position when a training event happens
 * @param {Object} type - The type of performed action
 */
RidgeReg.prototype.addData = function ( eyes, screenPos, type ) {
    if ( !eyes ) {
        return;
    }
    if ( eyes.left.blink || eyes.right.blink ) {
        return;
    }
    if ( type === 'click' ) {
        this.screenXClicksArray.push( [ screenPos[ 0 ] ] );
        this.screenYClicksArray.push( [ screenPos[ 1 ] ] );

        this.eyeFeaturesClicks.push( getEyeFeats( eyes ) );
        this.dataClicks.push( { 'eyes': eyes, 'screenPos': screenPos, 'type': type } );
    } else if ( type === 'move' ) {
        this.screenXTrailArray.push( [ screenPos[ 0 ] ] );
        this.screenYTrailArray.push( [ screenPos[ 1 ] ] );

        this.eyeFeaturesTrail.push( getEyeFeats( eyes ) );
        this.trailTimes.push( performance.now() );
        this.dataTrail.push( { 'eyes': eyes, 'screenPos': screenPos, 'type': type } );
    }

    eyes.left.patch  = Array.from( eyes.left.patch.data );
    eyes.right.patch = Array.from( eyes.right.patch.data );
};

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set of training data
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object} prediction - Object containing the prediction data
 */
// *  @return {integer} prediction.x - the x screen coordinate predicted
// *  @return {integer} prediction.y - the y screen coordinate predicted
RidgeReg.prototype.predict = function ( eyesObj ) {

    if ( !eyesObj || this.eyeFeaturesClicks.length == 0 ) {
        return null;
    }

    var acceptTime        = performance.now() - this.trailTime;
    var eyesFeats         = getEyeFeats( eyesObj );
    var numberOfEyesFeats = eyesFeats.length;
    var trailX            = [];
    var trailY            = [];
    var trailFeat         = [];
    var predictedX        = 0;
    var predictedY        = 0;
    var screenXArray;
    var screenYArray;
    var eyeFeatures;
    var coefficientsX;
    var coefficientsY;
    var i;
    var j;

    for ( i = 0 ; i < this.trailDataWindow ; i++ ) {
        if ( this.trailTimes.get( i ) > acceptTime ) {
            trailX.push( this.screenXTrailArray.get( i ) );
            trailY.push( this.screenYTrailArray.get( i ) );
            trailFeat.push( this.eyeFeaturesTrail.get( i ) );
        }
    }

    screenXArray = this.screenXClicksArray.data.concat( trailX );
    screenYArray = this.screenYClicksArray.data.concat( trailY );
    eyeFeatures  = this.eyeFeaturesClicks.data.concat( trailFeat );

    coefficientsX = ridge( screenXArray, eyeFeatures, ridgeParameter );
    coefficientsY = ridge( screenYArray, eyeFeatures, ridgeParameter );

    for ( j = 0 ; j < numberOfEyesFeats ; j++ ) {
        predictedX += eyesFeats[ j ] * coefficientsX[ j ];
        predictedY += eyesFeats[ j ] * coefficientsY[ j ];
    }

    predictedX = Math.floor( predictedX );
    predictedY = Math.floor( predictedY );

    return {
        x: predictedX,
        y: predictedY
    };
};

/**
 * Seeds the model with initial training data
 * in case data is stored in a separate location
 * @param {Array.<Object>} data - The array data of util.eyes objects to set
 */
RidgeReg.prototype.setData = function ( data ) {

    //TODO this is a kludge, needs to be fixed
    //[TV:23-11-2016] Still a kludge ?

    if(!data) {
        return;
    }

    var dataLength  = data.length;
    var currentData = undefined;
    var eyes        = {};
    var leftEye     = {};
    var rightEye    = {};
    var i;

    for ( i = 0 ; i < dataLength ; ++i ) {

        currentData = data[ i ];
        eyes        = currentData.eyes;
        leftEye     = eyes.left;
        rightEye    = eyes.right;

        leftEye.patch  = _getNewImageDataForEye( leftEye );
        rightEye.patch = _getNewImageDataForEye( rightEye );

        this.addData( eyes, currentData.screenPos, currentData.type );

    }

};

/**
 * Gets the training data stored in this regression model,
 * this is not the model itself, but merely its training data
 * @returns {Array.<Object>|*} The set of training data stored in this regression class
 */
RidgeReg.prototype.getData = function () {
    return this.dataClicks.data.concat( this.dataTrail.data );
};

export { RidgeReg };
