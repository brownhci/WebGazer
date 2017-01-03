import * as Mat from "../core/mat";

// Here, we define all the different matrix operations we will need
var add       = numeric.add;
var sub       = numeric.sub;
var inv       = numeric.inv;
var identity  = numeric.identity;
var multiply  = Mat.multiply;
var transpose = Mat.transpose;

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
var KalmanFilter = function ( F, H, Q, R, P_initial, X_initial ) {

    this.stateTransitionMatrix     = F; // State transition matrix
    this.processNoiseMatrix        = Q; // Process noise matrix
    this.transformationMatrix      = H; // Transformation matrix
    this.measurementNoiseMatrix    = R; // Measurement Noise
    this.covarianceMatrix          = P_initial; //Initial covariance matrix
    this.expectedMeasurementMatrix = X_initial; //Initial guess of measurement

    this.transposedStateTransitionMatrix = transpose( this.stateTransitionMatrix );
    this.transposedTransformationMatrix  = transpose( this.transformationMatrix );
};

/**
 * Get Kalman next filtered value and update the internal state
 * @param {Array} newMeasure - the new measurement
 * @return {Array}
 */
KalmanFilter.prototype.update = function ( newMeasure ) {

    // prediction: X = F * X  |  P = F * P * F' + Q
    var predictedMeasurement = multiply( this.stateTransitionMatrix, this.expectedMeasurementMatrix ); //Update state vector
    var predictedCovariance  = add( multiply( multiply( this.stateTransitionMatrix, this.covarianceMatrix ), this.transposedStateTransitionMatrix ), this.processNoiseMatrix ); //Predicted covariance

    //Calculate the update values
    var measureError       = sub( newMeasure, multiply( this.transformationMatrix, predictedMeasurement ) ); // This is the measurement error (between what we expect and the actual value)
    var residualCovariance = add( multiply( multiply( this.transformationMatrix, predictedCovariance ), this.transposedTransformationMatrix ), this.measurementNoiseMatrix ); //This is the residual
                                                                                                                                                                              // covariance (the error
                                                                                                                                                                              // in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    var kalmanOptimalGain = multiply( predictedCovariance, multiply( this.transposedTransformationMatrix, inv( residualCovariance ) ) ); //This is the Optimal Kalman Gain

    //We need to change Y into it's column vector form
    for ( var i = 0, yLength = measureError.length ; i < yLength ; i++ ) {
        measureError[ i ] = [ measureError[ i ] ];
    }

    //Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.expectedMeasurementMatrix = add( predictedMeasurement, multiply( kalmanOptimalGain, measureError ) );
    this.covarianceMatrix          = multiply( sub( identity( kalmanOptimalGain.length ), multiply( kalmanOptimalGain, this.transformationMatrix ) ), predictedCovariance );

    return transpose( multiply( this.transformationMatrix, this.expectedMeasurementMatrix ) )[ 0 ]; //Transforms the predicted state back into it's measurement form

};

export { KalmanFilter };
