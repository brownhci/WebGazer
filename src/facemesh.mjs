import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

/**
 * Constructor of TFFaceMesh object
 * @constructor
 * */
const TFFaceMesh = function() {
  //Backend options are webgl, wasm, and CPU.
  //For recent laptops WASM is better than WebGL.
  this.model = faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
    { maxFaces: 1 }
  );
  this.predictionReady = false;
};

// Global variable for face landmark positions array
TFFaceMesh.prototype.positionsArray = null;

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {Object} video - the video element itself
 * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
 * @param  {Number} width - of imageCanvas
 * @param  {Number} height - of imageCanvas
 * @return {Object} the two eye-patches, first left, then right eye
 */
TFFaceMesh.prototype.getEyePatches = async function(video, imageCanvas, width, height) {

  if (imageCanvas.width === 0) {
    return null;
  }

  // Load the MediaPipe facemesh model.
  const model = await this.model;

  // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
  // array of detected faces from the MediaPipe graph.
  const predictions = await model.estimateFaces({
    input: video,
    returnTensors: false,
    flipHorizontal: false,
    predictIrises: false,
  });

  if (predictions.length == 0){
    return false;
  }

  // Save positions to global variable
  this.positionsArray = predictions[0].scaledMesh;
  const prediction = predictions[0]
  const positions = this.positionsArray;

  const { scaledMesh } = predictions[0];
  // Keypoints indexes are documented at
  // https://github.com/tensorflow/tfjs-models/blob/118d4727197d4a21e2d4691e134a7bc30d90deee/face-landmarks-detection/mesh_map.jpg
  // https://stackoverflow.com/questions/66649492/how-to-get-specific-landmark-of-face-like-lips-or-eyes-using-tensorflow-js-face
  const [leftBBox, rightBBox] = [
    // left
    {
      eyeTopArc: prediction.annotations.leftEyeUpper0,
      eyeBottomArc: prediction.annotations.leftEyeLower0
    },
    // right
    {
      eyeTopArc: prediction.annotations.rightEyeUpper0,
      eyeBottomArc: prediction.annotations.rightEyeLower0
    },
  ].map(({ eyeTopArc, eyeBottomArc }) => {
    const topLeftOrigin = {
      x: Math.round(Math.min(...eyeTopArc.map(v => v[0]))),
      y: Math.round(Math.min(...eyeTopArc.map(v => v[1]))),
    };
    const bottomRightOrigin = {
      x: Math.round(Math.max(...eyeBottomArc.map(v => v[0]))),
      y: Math.round(Math.max(...eyeBottomArc.map(v => v[1]))),
    };

    return {
      origin: topLeftOrigin,
      width: bottomRightOrigin.x - topLeftOrigin.x,
      height: bottomRightOrigin.y - topLeftOrigin.y,
    }
  });
  var leftOriginX = leftBBox.origin.x;
  var leftOriginY = leftBBox.origin.y;
  var leftWidth = leftBBox.width;
  var leftHeight = leftBBox.height;
  var rightOriginX = rightBBox.origin.x;
  var rightOriginY = rightBBox.origin.y;
  var rightWidth = rightBBox.width;
  var rightHeight = rightBBox.height;

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

  var leftImageData = imageCanvas.getContext('2d', { willReadFrequently: true }).getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight);
  eyeObjs.left = {
    patch: leftImageData,
    imagex: leftOriginX,
    imagey: leftOriginY,
    width: leftWidth,
    height: leftHeight
  };

  var rightImageData = imageCanvas.getContext('2d', { willReadFrequently: true }).getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight);
  eyeObjs.right = {
    patch: rightImageData,
    imagex: rightOriginX,
    imagey: rightOriginY,
    width: rightWidth,
    height: rightHeight
  };

  this.predictionReady = true;

  return eyeObjs;
};

/**
 * Returns the positions array corresponding to the last call to getEyePatches.
 * Requires that getEyePatches() was called previously, else returns null.
 */
TFFaceMesh.prototype.getPositions = function () {
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
TFFaceMesh.prototype.drawFaceOverlay = function(ctx, keypoints){
  // If keypoints is falsy, don't do anything
  if (keypoints) {
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
}

/**
 * The TFFaceMesh object name
 * @type {string}
 */
TFFaceMesh.prototype.name = 'TFFaceMesh';

export default TFFaceMesh;
