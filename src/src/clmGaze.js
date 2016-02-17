(function(window) {
    "use strict"

    window.gazer = window.gazer || {};
    gazer.tracker = gazer.tracker || {};

    var ClmGaze = function() {
        this.clm = new clm.tracker({useWebGL : true});
        this.clm.init(pModel);
    }

    gazer.tracker.ClmGaze = ClmGaze;

    ClmGaze.prototype.getEyePatches = function(imageCanvas, width, height) {

        if (imageCanvas.width == 0) {
            return null;
        }

        var positions = this.clm.track(imageCanvas);
        var score = this.clm.getScore();

        if (!positions) {
            return false;
        }
        var leftOriginX = Math.floor(positions[23][0]);
        var leftOriginY = Math.floor(positions[24][1]);
        var leftWidth = Math.floor(positions[25][0] - positions[23][0]);
        var leftHeight = Math.floor(positions[26][1] - positions[24][1]);
        var rightOriginX = Math.floor(positions[30][0]);
        var rightOriginY = Math.floor(positions[29][1]);
        var rightWidth = Math.floor(positions[28][0] - positions[30][0]);
        var rightHeight = Math.floor(positions[31][1] - positions[29][1]);
      
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
