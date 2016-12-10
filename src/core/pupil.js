//TODO: pupil should be inside an eye object, uh uh (it's not a joke !)
//TODO: no pupil ctor !?

import * as Utils from "../utils/util"

/**
 * Contains methods which detect the center of an eye's pupil
 * @alias module:pupil
 * @exports pupil
 */
/**
 * Returns intensity value at x,y position of a pixels image
 * @param {Array} pixels - array of size width*height
 * @param {Number} x -  input x value
 * @param {Number} y - input y value
 * @param {Number} width - width of pixels image
 * @returns {Number} - intensity value in [0,255]
 */
export function getValue(pixels, x, y, width) {
    return pixels[y * width + x];
}

/**
 * Computes summation area table/integral image of a pixel matrix
 * @param {Array} pixels value of eye area
 * @param {Number} width - of image in 'pixels'
 * @param {Number} height - of image in 'pixels'
 * @returns {Array} - integral image
 */
export function getSumTable(pixels, width, height) {

    var integralImage = new Array( width );
    var sumX          = 0, sumY = 0;
    var i, j, x, y;

    for (i = 0 ; i < width; i++) {
        integralImage[i]    = new Array(height);
        sumX += getValue(pixels, i, 0, width);
        integralImage[i][0] = sumX;
    }

    for (j = 0 ; j < height; j++) {
        sumY += getValue(pixels, 0, j, width);
        integralImage[0][j] = sumY;
    }

    for (x = 1 ; x < width; x++) {
        for (y = 1 ; y < height; y++) {
            integralImage[x][y] = getValue(pixels, x, y, width) + integralImage[x - 1][y] + integralImage[x][y - 1] - integralImage[x - 1][y - 1];
        }
    }
    
    return integralImage;
    
}

//evaluate area by the formula found on wikipedia about the summed area table: I(D)+I(A)-I(B)-I(C)
function getIrisArea(summedAreaTable, offset, currentWidth, x, y) {

    return summedAreaTable[x + offset][y + offset]
        + summedAreaTable[x + offset - currentWidth][y + offset - currentWidth]
        - summedAreaTable[x + offset][y + offset - currentWidth]
        - summedAreaTable[x + offset - currentWidth][y + offset]

}

/**
 * Detects a pupil in a set of pixels
 * @param  {Array} pixels - patch of pixels to look for pupil into
 * @param  {Number} width  - of pixel patch
 * @param  {Number} height - of pixel patch
 * @return {Array} coordinate of the bottom right corner and width of the best fitted pupil
 */
export function getSinglePupil(pixels, width, height) {

    var summedAreaTable  = getSumTable( pixels, width, height );
    var bestAverageScore = Number.MAX_VALUE; //want to minimize this score
    var bestPoint        = [ 0, 0 ]; //bottom right corner of best fitted pupil
    var bestHalfWidth    = 0; //corresponding half width of the best fitted pupil
    var offset           = Math.floor( width / 10.0 ); //padding
    var currentWidth     = Math.floor( height / 10.0 );
    var halfWidth        = width / 2;
    var irisArea         = 0;
    var averageScore     = 0;
    var scleraIrisArea   = 0;
    var x, y;

    //halfWidth could also start at 1, but this makes it faster
    for ( ; currentWidth < halfWidth; ++currentWidth) {
        //think of a sliding rectangular window of width currentWidth*2 that goes through the whole eye pixel matrix and does the following:
        //1) computes the irisArea, which is the total intensity of the iris
        //2) computes the scleraIrisArea, which is multiple rows of pixels including the sclera and iris.
        //3) computes avg, which is the intensity of the area divided by the number of pixels.
        //start at the bottom right of the rectangle ! not top left
        for (x = currentWidth; x < width - offset; ++x) {
            for (y = currentWidth; y < height - offset; ++y) {

                irisArea     = getIrisArea(summedAreaTable, offset, currentWidth, x, y);
                averageScore = 1.0 * irisArea / ((currentWidth + 1) * (currentWidth + 1)) + 1;
                
                ///TODO: equation in bracket can be factorize => Speed
                scleraIrisArea = (
                    (1.0 * summedAreaTable[width - 1 - offset][y + offset]
                    + summedAreaTable[0 + offset][y + offset - currentWidth]
                    - summedAreaTable[0 + offset][y + offset]
                    - summedAreaTable[width - 1 - offset][y + offset - currentWidth])
                    - irisArea
                );

                //minimize avgScore/scleraIrisArea. 150 is too high, might have to change since it's closer to white
                if ((averageScore / scleraIrisArea) < bestAverageScore && averageScore < 150) {
                    bestAverageScore = (averageScore) / scleraIrisArea;
                    bestPoint        = [x + offset, y + offset];
                    bestHalfWidth    = currentWidth;
                }
            }
        }
    }

    return [bestPoint, bestHalfWidth];

}

function updatePupilForEye(eye) {

    var eyeWidth  = eye.width;
    var eyeHeight = eye.height;

    if (!eye.blink) {
        eye.pupil = getSinglePupil(Array.prototype.slice.call(Utils.grayscale(eye.patch, eyeWidth, eyeHeight)), eyeWidth, eyeHeight);
        eye.pupil[0][0] -= eye.pupil[1];
        eye.pupil[0][1] -= eye.pupil[1];
    }
    
}

/**
 * Given an object with two eye patches it finds the location of the detected pupils
 * @param  {Object} eyes - left and right detected eye patches
 * @return {Object} eyesObj - updated eye patches with information about pupils' locations
 */
export function getPupils(eyes) {
    
    if (!eyes) {
        return null;
    }

    updatePupilForEye(eyes.left)
    updatePupilForEye(eyes.right)

    return eyes;
    
}
