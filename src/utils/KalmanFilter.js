import * as Mat from "../core/mat";

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
var KalmanFilter = function (F, H, Q, R, P_initial, X_initial) {
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
KalmanFilter.prototype.update = function (z) {

    // Here, we define all the different matrix operations we will need
    var add  = numeric.add, sub = numeric.sub, inv = numeric.inv, identity = numeric.identity;
    var mult = Mat.multiply, transpose = Mat.transpose;
    //TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    var X_p = mult(this.F, this.X); //Update state vector
    var P_p = add(mult(mult(this.F, this.P), transpose(this.F)), this.Q); //Predicted covariance

    //Calculate the update values
    var y = sub(z, mult(this.H, X_p)); // This is the measurement error (between what we expect and the actual value)
    var S = add(mult(mult(this.H, P_p), transpose(this.H)), this.R); //This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    var K = mult(P_p, mult(transpose(this.H), inv(S))); //This is the Optimal Kalman Gain

    //We need to change Y into it's column vector form
    for (var i = 0; i < y.length; i++) {
        y[i] = [y[i]];
    }

    //Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(X_p, mult(K, y));
    this.P = mult(sub(identity(K.length), mult(K, this.H)), P_p);
    return transpose(mult(this.H, this.X))[0]; //Transforms the predicted state back into it's measurement form
};

export {KalmanFilter};
