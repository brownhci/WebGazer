import {ClmTrackr, pcaFilter} from "../../build/tmp/dependencies";
// import {WebGazer} from "../core/webgazer.js";
import {KalmanFilter} from "../utils/KalmanFilter";

// import "../../dependencies/numeric/numeric-1.2.6";

/**
 * Constructor for the ClmGaze Object which tracks
 * head and eye positions using the clmtracker.js library
 * @constructor
 */
var ClmGaze = function () {

    // TODO: Don't forget to recreate argument liaisons between clm and WebGAZER params !
    //
    //  this.clm = new ClmTrackr.tracker(WebGazer.getParams().camConstraints);

    var params = {video: true};
    this.clm = new ClmTrackr.tracker(params);
    this.clm.init(pcaFilter);
    var F = [
        [1, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1],
        [0, 0, 1, 0, 1, 0],
        [0, 0, 0, 1, 0, 1],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1]
    ];

    //Parameters Q and R may require some fine tuning
    var Q           = [
        [1 / 4, 0, 0, 0, 1 / 2, 0],
        [0, 1 / 4, 0, 0, 0, 1 / 2],
        [0, 0, 1 / 4, 0, 1 / 2, 0],
        [0, 0, 0, 1 / 4, 0, 1 / 2],
        [1 / 2, 0, 1 / 2, 0, 1, 0],
        [0, 1 / 2, 0, 1 / 2, 0, 1]
    ];// * delta_t
    var delta_t     = 1 / 10; // The amount of time between frames
    Q               = numeric.mul(Q, delta_t);
    var H           = [
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0]
    ];
    var pixel_error = 6.5; //We will need to fine tune this value
    //This matrix represents the expected measurement error
    var R = numeric.mul(numeric.identity(4), pixel_error);

    var P_initial = numeric.mul(numeric.identity(6), 0.0001); //Initial covariance matrix
    var x_initial = [[200], [150], [250], [180], [0], [0]]; // Initial measurement matrix

    this.leftKalman  = new KalmanFilter(F, H, Q, R, P_initial, x_initial);
    this.rightKalman = new KalmanFilter(F, H, Q, R, P_initial, x_initial);
};

/**
 * The ClmGaze object name
 * @type {String}
 */
ClmGaze.prototype.name = 'clmtrackr';

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {HTMLCanvasElement} imageCanvas - canvas corresponding to the webcam stream
 * @param  {Number} width - of imageCanvas
 * @param  {Number} height - of imageCanvas
 * @return {Object} the two eye-patches, first left, then right eye
 */
ClmGaze.prototype.getEyePatches = function (imageCanvas, width, height) {

    if (!imageCanvas) {
        return null;
    }
    
    if (imageCanvas.width === 0) {
        return null;
    }

    var positions = this.clm.track(imageCanvas);
    if (!positions) {
        return null;
    }

    //Fit the detected eye in a rectangle
    var canvasContext = imageCanvas.getContext('2d');

    var leftOriginX  = (positions[23][0]);
    var leftOriginY  = (positions[24][1]);
    var leftWidth    = (positions[25][0] - positions[23][0]);
    var leftHeight   = (positions[26][1] - positions[24][1]);
    var leftBox = [leftOriginX, leftOriginY, leftOriginX + leftWidth, leftOriginY + leftHeight];

    var rightOriginX = (positions[30][0]);
    var rightOriginY = (positions[29][1]);
    var rightWidth   = (positions[28][0] - positions[30][0]);
    var rightHeight  = (positions[31][1] - positions[29][1]);
    var rightBox = [rightOriginX, rightOriginY, rightOriginX + rightWidth, rightOriginY + rightHeight];

    //Apply Kalman Filtering
    leftBox     = this.leftKalman.update(leftBox);
    leftOriginX = Math.round(leftBox[0]);
    leftOriginY = Math.round(leftBox[1]);
    leftWidth   = Math.round(leftBox[2] - leftBox[0]);
    leftHeight  = Math.round(leftBox[3] - leftBox[1]);

    //Apply Kalman Filtering
    rightBox     = this.rightKalman.update(rightBox);
    rightOriginX = Math.round(rightBox[0]);
    rightOriginY = Math.round(rightBox[1]);
    rightWidth   = Math.round(rightBox[2] - rightBox[0]);
    rightHeight  = Math.round(rightBox[3] - rightBox[1]);

    if (leftWidth === 0 || rightWidth === 0) {
        console.log('An eye patch had zero width');
        return null;
    }

    if (leftHeight === 0 || rightHeight === 0) {
        console.log('An eye patch had zero height');
        return null;
    }

    return {
        positions: positions,
        left: {
            patch:  canvasContext.getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight),
            imageX: leftOriginX,
            imageY: leftOriginY,
            width:  leftWidth,
            height: leftHeight
        },
        right: {
            patch:  canvasContext.getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight),
            imageX: rightOriginX,
            imageY: rightOriginY,
            width:  rightWidth,
            height: rightHeight
        }
    };
};

export {ClmGaze}