// @ts-check
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'

/**
 * @typedef {Object} TwoEyes
 * @property {import('./worker_scripts/util').Eye} left The left eye
 * @property {import('./worker_scripts/util').Eye} right The right eye
 */

export class TFFaceMesh {
  /** @type {Promise<import('@tensorflow-models/face-landmarks-detection').FaceLandmarksDetector>} */
  model
  /** @type {boolean} */
  predictionReady
  /**
   * The TFFaceMesh object name
   * @type {string}
   */
  name = 'TFFaceMesh'
  /**
   * Global variable for face landmark positions array
   * @type {import('@tensorflow-models/face-landmarks-detection').FaceLandmarksPrediction['scaledMesh'] | null}
   **/
  positionsArray = null
  /**
   * Constructor of TFFaceMesh object
   * @constructor
   * */
  constructor () {
    // Backend options are webgl, wasm, and CPU.
    // For recent laptops WASM is better than WebGL.
    this.model = faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    )
    this.predictionReady = false
  };

  /**
   * Isolates the two patches that correspond to the user's eyes
   * @param  {HTMLVideoElement} video - the video element itself
   * @param  {HTMLCanvasElement} imageCanvas - canvas corresponding to the webcam stream
   * @param  {number} width - of imageCanvas
   * @param  {number} height - of imageCanvas
   * @return {Promise<TwoEyes | undefined>} the two eye-patches, first left, then right eye
   */
  getEyePatches = async (video, imageCanvas, width, height) => {
    if (imageCanvas.width === 0) return

    const context2D = imageCanvas.getContext('2d')
    if (!context2D) return

    // Load the MediaPipe facemesh model.
    const model = await this.model

    // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
    // array of detected faces from the MediaPipe graph.
    const predictions = await model.estimateFaces({
      input: video,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: false
    })

    if (predictions.length === 0) return

    // Save positions to global variable
    this.positionsArray = predictions[0].scaledMesh
    const prediction = predictions[0]
    if (prediction.kind === 'MediaPipePredictionTensors' || !prediction.annotations) return
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
      }
    ].map(({ eyeTopArc, eyeBottomArc }) => {
      const topLeftOrigin = {
        x: Math.round(Math.min(...eyeTopArc.map(v => v[0]))),
        y: Math.round(Math.min(...eyeTopArc.map(v => v[1])))
      }
      const bottomRightOrigin = {
        x: Math.round(Math.max(...eyeBottomArc.map(v => v[0]))),
        y: Math.round(Math.max(...eyeBottomArc.map(v => v[1])))
      }

      return {
        origin: topLeftOrigin,
        width: bottomRightOrigin.x - topLeftOrigin.x,
        height: bottomRightOrigin.y - topLeftOrigin.y
      }
    })
    const leftOriginX = leftBBox.origin.x
    const leftOriginY = leftBBox.origin.y
    const leftWidth = leftBBox.width
    const leftHeight = leftBBox.height
    const rightOriginX = rightBBox.origin.x
    const rightOriginY = rightBBox.origin.y
    const rightWidth = rightBBox.width
    const rightHeight = rightBBox.height

    if (leftWidth === 0 || rightWidth === 0) {
      console.log('an eye patch had zero width')
      return
    }

    if (leftHeight === 0 || rightHeight === 0) {
      console.log('an eye patch had zero height')
      return
    }

    // Start building object to be returned
    /** @type {{ left: import('./worker_scripts/util').Eye; right: import('./worker_scripts/util').Eye }} */
    const eyeObjs = {}

    const leftImageData = context2D.getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight)
    eyeObjs.left = {
      patch: leftImageData,
      imagex: leftOriginX,
      imagey: leftOriginY,
      width: leftWidth,
      height: leftHeight
    }

    const rightImageData = context2D.getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight)
    eyeObjs.right = {
      patch: rightImageData,
      imagex: rightOriginX,
      imagey: rightOriginY,
      width: rightWidth,
      height: rightHeight
    }

    this.predictionReady = true

    return eyeObjs
  }

  /**
   * Returns the positions array corresponding to the last call to getEyePatches.
   * Requires that getEyePatches() was called previously, else returns null.
   */
  getPositions = () => {
    return this.positionsArray
  }

  /**
   * Reset the tracker to default values
   */
  reset = () => {
    console.log('Unimplemented; Tracking.js has no obvious reset function')
  }

  /**
   * Draw TF_FaceMesh_Overlay
   * @param {CanvasRenderingContext2D} ctx
   * @param {number[][]} keypoints
   */
  drawFaceOverlay = (ctx, keypoints) => {
  // If keypoints is falsy, don't do anything
    if (keypoints) {
      ctx.fillStyle = '#32EEDB'
      ctx.strokeStyle = '#32EEDB'
      ctx.lineWidth = 0.5

      for (let i = 0; i < keypoints.length; i++) {
        const x = keypoints[i][0]
        const y = keypoints[i][1]

        ctx.beginPath()
        ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
}
