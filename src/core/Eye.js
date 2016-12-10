/**
 * Eye class, represents an eye patch detected in the video stream
 * @param {ImageData} patch - the image data corresponding to an eye
 * @param {Number} imageX - x-axis offset from the top-left corner of the video canvas
 * @param {Number} imageY - y-axis offset from the top-left corner of the video canvas
 * @param {Number} width  - width of the eye patch
 * @param {Number} height - height of the eye patch
 */
var Eye = function (patch, imageX, imageY, width, height) {
    
    this.patch  = patch;
    this.imageX = imageX;
    this.imageY = imageY;
    this.width  = width;
    this.height = height;
    
    this.pupil = undefined;
    
};

export {Eye};
