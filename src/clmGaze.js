(function(window) {
    "use strict";

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};
    webgazer.util = webgazer.util || {};
    webgazer.params = webgazer.params || {};

    /**
     * Constructor of ClmGaze,
     * initialize ClmTrackr object
     * @constructor
     */
    var ClmGaze = function() {
        this.clm = new clm.tracker(webgazer.params.camConstraints);
        this.clm.init(pModel);
        var F = [ [1, 0, 0, 0, 1, 0],
                  [0, 1, 0, 0, 0, 1],
                  [0, 0, 1, 0, 1, 0],
                  [0, 0, 0, 1, 0, 1],
                  [0, 0, 0, 0, 1, 0],
                  [0, 0, 0, 0, 0, 1]];
        //Parameters Q and R may require some fine tuning
        var Q = [ [1/4,  0, 0, 0,  1/2,   0],
                  [0, 1/4,  0, 0,    0, 1/2],
                  [0, 0,   1/4, 0, 1/2,   0],
                  [0, 0,   0,  1/4,  0, 1/2],
                  [1/2, 0, 1/2, 0,    1,  0],
                  [0, 1/2,  0,  1/2,  0,  1]];// * delta_t
        var delta_t = 1/10; // The amount of time between frames
        Q = numeric.mul(Q, delta_t);
        var H = [ [1, 0, 0, 0, 0, 0],
                  [0, 1, 0, 0, 0, 0],
                  [0, 0, 1, 0, 0, 0],
                  [0, 0, 0, 1, 0, 0]];
        var pixel_error = 6.5; //We will need to fine tune this value
        //This matrix represents the expected measurement error
        var R = numeric.mul(numeric.identity(4), pixel_error);

        var P_initial = numeric.mul(numeric.identity(6), 0.0001); //Initial covariance matrix
        var x_initial = [[200], [150], [250], [180], [0], [0]]; // Initial measurement matrix

        this.leftKalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);
        this.rightKalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);
    };

    webgazer.tracker.ClmGaze = ClmGaze;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {Number} width - of imageCanvas
     * @param  {Number} height - of imageCanvas
     * @return {Object} the two eye-patches, first left, then right eye
     */
    ClmGaze.prototype.getEyePatches = function(imageCanvas, width, height) {

        if (imageCanvas.width === 0) {
            return null;
        }

        var positions = this.clm.track(imageCanvas);
        var score = this.clm.getScore();

        if (!positions) {
            return false;
        }

        //Fit the detected eye in a rectangle
        var leftOriginX = (positions[23][0]);
        var leftOriginY = (positions[24][1]);
        var leftWidth = (positions[25][0] - positions[23][0]);
        var leftHeight = (positions[26][1] - positions[24][1]);
        var rightOriginX = (positions[30][0]);
        var rightOriginY = (positions[29][1]);
        var rightWidth = (positions[28][0] - positions[30][0]);
        var rightHeight = (positions[31][1] - positions[29][1]);

        //Apply Kalman Filtering
        var leftBox = [leftOriginX, leftOriginY, leftOriginX + leftWidth, leftOriginY + leftHeight];
        leftBox = this.leftKalman.update(leftBox);
        leftOriginX = Math.round(leftBox[0]);
        leftOriginY = Math.round(leftBox[1]);
        leftWidth = Math.round(leftBox[2] - leftBox[0]);
        leftHeight = Math.round(leftBox[3] - leftBox[1]);

        //Apply Kalman Filtering
        var rightBox = [rightOriginX, rightOriginY, rightOriginX + rightWidth, rightOriginY + rightHeight];
        rightBox = this.rightKalman.update(rightBox);
        rightOriginX = Math.round(rightBox[0]);
        rightOriginY = Math.round(rightBox[1]);
        rightWidth = Math.round(rightBox[2] - rightBox[0]);
        rightHeight = Math.round(rightBox[3] - rightBox[1]);

        if (leftWidth === 0 || rightWidth === 0){
          console.log('an eye patch had zero width');
          return null;
        }

        if (leftHeight === 0 || rightHeight === 0){
          console.log("an eye patch had zero height");
          return null;
        }

        var eyeObjs = {};
        var leftImageData = imageCanvas.getContext('2d').getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight);
        eyeObjs.left = {
            patch: leftImageData,
            imagex: leftOriginX,
            imagey: leftOriginY,
            width: leftWidth,
            height: leftHeight
        };

        var rightImageData = imageCanvas.getContext('2d').getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight);
        eyeObjs.right = {
            patch: rightImageData,
            imagex: rightOriginX,
            imagey: rightOriginY,
            width: rightWidth,
            height: rightHeight
        };

        eyeObjs.positions = positions;

        return eyeObjs;
    };

    /**
     * The Js_objectdetectGaze object name
     * @type {string}
     */
    ClmGaze.prototype.name = 'clmtrackr';
    
}(window));
