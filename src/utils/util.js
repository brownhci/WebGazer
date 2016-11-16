//Helper functions
/**
 * Grayscales an image patch. Can be used for the whole canvas, detected face, detected eye, etc.
 * @param  {ImageData} imageData - image data to be grayscaled
 * @param  {Number} imageWidth  - width of image data to be grayscaled
 * @param  {Number} imageHeight - height of image data to be grayscaled
 * @return {ImageData} grayscaledImage
 */
export function grayscale(imageData, imageWidth, imageHeight) {
    //TODO implement ourselves to remove dependency
    return tracking.Image.grayscale(imageData, imageWidth, imageHeight, false);
}

/**
 * Increase contrast of an image
 * @param {ImageData} grayscaleImageSrc - grayscale integer array
 * @param {Number} step - sampling rate, control performance
 * @param {Array} destinationImage - array to hold the resulting image
 */
export function equalizeHistogram(grayscaleImageSrc, step, destinationImage) {
    //TODO implement ourselves to remove dependency
    return objectdetect.equalizeHistogram(grayscaleImageSrc, step, destinationImage);
}

/**
 * Gets an Eye object and resizes it to the desired resolution
 * @param  {webgazer.util.Eye} eye - patch to be resized
 * @param  {Number} resizeWidth - desired width
 * @param  {Number} resizeHeight - desired height
 * @return {webgazer.util.Eye} resized eye patch
 */
export function resizeEye(eye, resizeWidth, resizeHeight) {

    var canvas    = document.createElement('canvas');
    canvas.width  = eye.width;
    canvas.height = eye.height;

    canvas.getContext('2d').putImageData(eye.patch, 0, 0);

    var tempCanvas = document.createElement('canvas');

    tempCanvas.width  = resizeWidth;
    tempCanvas.height = resizeHeight;

    // save the canvas into temp canvas
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight);

    return tempCanvas.getContext('2d').getImageData(0, 0, resizeWidth, resizeHeight);
}

/**
 * Checks if the prediction is within the boundaries of the viewport and constrains it
 * @param  {Array} prediction [x,y] - predicted gaze coordinates
 * @return {Array} constrained coordinates
 */
export function bound(prediction) {
    if (prediction.x < 0)
        prediction.x = 0;
    if (prediction.y < 0)
        prediction.y = 0;
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    if (prediction.x > w) {
        prediction.x = w;
    }

    if (prediction.y > h) {
        prediction.y = h;
    }
    return prediction;
}

export {BlinkDetector} from "./blinkDetector";
export {DataWindow} from "./DataWindow";
export {DebugBox} from "./DebugBox";
export {KalmanFilter} from "./KalmanFilter";
