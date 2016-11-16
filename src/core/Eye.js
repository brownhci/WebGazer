/**
 * Eye class, represents an eye patch detected in the video stream
 * @param {ImageData} patch - the image data corresponding to an eye
 * @param {Number} imagex - x-axis offset from the top-left corner of the video canvas
 * @param {Number} imagey - y-axis offset from the top-left corner of the video canvas
 * @param {Number} width  - width of the eye patch
 * @param {Number} height - height of the eye patch
 */
var Eye = function (patch, imagex, imagey, width, height) {
    this.patch  = patch;
    this.imagex = imagex;
    this.imagey = imagey;
    this.width  = width;
    this.height = height;
};

export {Eye};
