(function(window) {
    "use strict"

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};
    webgazer.util = webgazer.util || {};

    /**
     * Initialize clmtrackr object
     */
    var ClmGaze = function() {
        this.clm = new clm.tracker({useWebGL : true});
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
                  [1/2, 0, 1/2, 0, 1,     0],
                  [0, 1/2,  0,  1/2,  0,  1]];// * delta_t
        var delta_t = 1/10; // The amount of time between frames
        Q = numeric.mul(Q, delta_t);
        var H = [ [1, 0, 0, 0, 0, 0],
                  [0, 1, 0, 0, 0, 0],
                  [0, 0, 1, 0, 0, 0],
                  [0, 0, 0, 1, 0, 0]];
        var pixel_error = 6.5; //We will need to fine tune this value
        var R = numeric.mul(numeric.identity(4), pixel_error);

        var P_initial = numeric.mul(numeric.identity(6), 0.0001); //Initial covariance matrix
        var x_initial = [[0], [0], [0], [0], [0], [0]]; // Initial measurement matrix

        this.leftKalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);
        this.rightKalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);
    }

    webgazer.tracker.ClmGaze = ClmGaze;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {number} width - of imageCanvas
     * @param  {number} height - of imageCanvas
     * @return {Object} the two eye-patches, first left, then right eye
     */
    ClmGaze.prototype.getEyePatches = function(imageCanvas, width, height) {

        if (imageCanvas.width == 0) {
            return null;
        }

        var positions = this.clm.track(imageCanvas);
        var score = this.clm.getScore();

        if (!positions) {
            return false;
        }

        //Fit the detected eye in a rectangle
        var leftOriginX = Math.floor(positions[23][0]);
        var leftOriginY = Math.floor(positions[24][1]);
        var leftWidth = Math.floor(positions[25][0] - positions[23][0]);
        var leftHeight = Math.floor(positions[26][1] - positions[24][1]);
        var rightOriginX = Math.floor(positions[30][0]);
        var rightOriginY = Math.floor(positions[29][1]);
        var rightWidth = Math.floor(positions[28][0] - positions[30][0]);
        var rightHeight = Math.floor(positions[31][1] - positions[29][1]);

        //Apply Kalman Filtering
        var leftBox = [leftOriginX, leftOriginY, leftOriginX + leftWidth, leftOriginY + leftHeight];
        leftBox = this.leftKalman.update(leftBox);
        leftOriginX = leftBox[0];
        leftOriginY = leftBox[1];
        leftWidth = leftBox[2] - leftBox[0];
        leftHeight = leftBox[3] - leftBox[1];

        //Apply Kalman Filtering
        var rightBox = [rightOriginX, rightOriginY, rightOriginX + rightWidth, rightOriginY + rightHeight];
        rightBox = this.rightKalman.update(rightBox);
        rightOriginX = rightBox[0];
        rightOriginY = rightBox[1];
        rightWidth = rightBox[2] - rightBox[0];
        rightHeight = rightBox[3] - rightBox[1];

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

        if (leftImageData.width == 0 || rightImageData.width == 0) {
            console.log('an eye patch had zero width');
            return null;
        }

        eyeObjs.positions = positions;

        return eyeObjs;
    }

    ClmGaze.prototype.name = 'clmtrackr';
}(window));
