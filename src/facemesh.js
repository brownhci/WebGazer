(function(window) {
    'use strict';

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};

    /**
     * Constructor of TFFaceMesh object
     * @constructor
     */
    var TFFaceMesh = function() {
        //Backend options are webgl, wasm, and CPU.
        //For recent laptops WASM is better than WebGL.
        //TODO: This hack makes loading the model block the UI. We should fix that
        this.model = (async () => { return await facemesh.load({"maxFaces":1}) })();
    };
 
    webgazer.tracker.TFFaceMesh = TFFaceMesh;

    // Global variable for face landmark positions array
    TFFaceMesh.prototype.positionsArray = null;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {Number} width - of imageCanvas
     * @param  {Number} height - of imageCanvas
     * @return {Object} the two eye-patches, first left, then right eye
     */
    TFFaceMesh.prototype.getEyePatches = async function(imageCanvas, width, height) {
 
        if (imageCanvas.width === 0) {
            return null;
        }

        // Load the MediaPipe facemesh model.
        const model = await this.model;

        // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
        // array of detected faces from the MediaPipe graph.
        const predictions = await model.estimateFaces(imageCanvas);
        
        if (predictions.length == 0){
            return false;
        }

        // Save positions to global variable
        this.positionsArray = predictions[0].scaledMesh;
        const positions = this.positionsArray;

        // Fit the detected eye in a rectangle
        // https://raw.githubusercontent.com/tensorflow/tfjs-models/master/facemesh/mesh_map.jpg
        var leftOriginX = Math.round(positions[35][0]);
        var leftOriginY = Math.round(positions[159][1]);
        var leftWidth = Math.round(positions[133][0] - leftOriginX);
        var leftHeight = Math.round(positions[145][1] - leftOriginY);
        var rightOriginX = Math.round(positions[362][0]);
        var rightOriginY = Math.round(positions[386][1]);
        var rightWidth = Math.round(positions[263][0] - rightOriginX);
        var rightHeight = Math.round(positions[274][1] - rightOriginY);

        if (leftWidth === 0 || rightWidth === 0){
          console.log('an eye patch had zero width');
          return null;
        }

        if (leftHeight === 0 || rightHeight === 0){
          console.log('an eye patch had zero height');
          return null;
        }

        // Start building object to be returned
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

        return eyeObjs;
    };

    /**
     * Returns the positions array corresponding to the last call to getEyePatches.
     * Requires that getEyePatches() was called previously, else returns null.
     */
    TFFaceMesh.prototype.getPositions = async function () {
        return this.positionsArray;
    }
    

    /**
     * Reset the tracker to default values
     */
    TFFaceMesh.prototype.reset = function(){
        console.log( "Unimplemented; Tracking.js has no obvious reset function" );
    }

    /**
     * Draw TF_FaceMesh_Overlay
     */
    TFFaceMesh.prototype.drawFaceOverlay= function(ctx, keypoints){
        ctx.fillStyle = '#32EEDB';
        ctx.strokeStyle = '#32EEDB';
        ctx.lineWidth = 0.5;
      
        for (let i = 0; i < keypoints.length; i++) {
            const x = keypoints[i][0];
            const y = keypoints[i][1];

            ctx.beginPath();
            ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }

    }

    /**
     * The TFFaceMesh object name
     * @type {string}
     */
    TFFaceMesh.prototype.name = 'TFFaceMesh';
    
}(window));
