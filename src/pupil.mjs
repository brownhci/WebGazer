// @ts-check
import { grayscale } from './worker_scripts/util'

/**
 * Returns intensity value at x,y position of a pixels image
 * @param {number[]} pixels - array of size width*height
 * @param {number} x -  input x value
 * @param {number} y - input y value
 * @param {number} width - width of pixels image
 * @returns {number} - intensity value in [0,255]
 */
const getValue = function (pixels, x, y, width) {
  return pixels[y * width + x]
}

/**
 * Computes summation area table/integral image of a pixel matrix
 * @param {number[]} pixels value of eye area
 * @param {number} width - of image in 'pixels'
 * @param {number} height - of image in 'pixels'
 * @returns {number[][]} - integral image
 */
const getSumTable = function (pixels, width, height) {
  const integralImage = /** @type {number[][]} */(new Array(width))
  let sumx = 0
  let sumy = 0

  for (let i = 0; i < width; i++) {
    integralImage[i] = new Array(height)
    sumx += getValue(pixels, i, 0, width)
    integralImage[i][0] = sumx
  }

  for (let i = 0; i < height; i++) {
    sumy += getValue(pixels, 0, i, width)
    integralImage[0][i] = sumy
  }

  for (let x = 1; x < width; x++) {
    for (let y = 1; y < height; y++) {
      integralImage[x][y] = getValue(pixels, x, y, width) + integralImage[x - 1][y] + integralImage[x][y - 1] - integralImage[x - 1][y - 1]
    }
  }
  return integralImage
}

/**
 * Detects a pupil in a set of pixels
 * @param  {number[]} pixels - patch of pixels to look for pupil into
 * @param  {number} width  - of pixel patch
 * @param  {number} height - of pixel patch
 * @return {import('./worker_scripts/util').Pupil} coordinate of the bottom right corner and width of the best fitted pupil
 */
const getSinglePupil = function (pixels, width, height) {
  const summedAreaTable = getSumTable(pixels, width, height)
  let bestAvgScore = 999999 // want to minimize this score
  /** @type {[number, number]} */
  let bestPoint = [0, 0] // bottom right corner of best fitted pupil
  let bestHalfWidth = 0 // corresponding half width of the best fitted pupil
  const offset = Math.floor(width / 10.0) // padding
  // halfWidth could also start at 1, but this makes it faster
  for (let halfWidth = Math.floor(height / 10.0); halfWidth < width / 2; halfWidth++) {
    // think of a sliding rectangular window of width halfWidth*2 that goes through the whole eye pixel matrix and does the following:
    // 1) computes the irisArea, which is the total intensity of the iris
    // 2) computes the scleraIrisArea, which is multiple rows of pixels including the sclera and iris.
    // 3) computes avg, which is the intensity of the area divided by the number of pixels.
    // start at the bottom right of the rectangle!not top left
    for (let x = halfWidth; x < width - offset; x++) {
      for (let y = halfWidth; y < height - offset; y++) {
        // evaluate area by the formula found on wikipedia about the summed area table: I(D)+I(A)-I(B)-I(C)
        const irisArea = summedAreaTable[x + offset][y + offset] + summedAreaTable[x + offset - halfWidth][y + offset - halfWidth] - summedAreaTable[x + offset][y + offset - halfWidth] - summedAreaTable[x + offset - halfWidth][y + offset]
        const avgScore = 1.0 * irisArea / ((halfWidth + 1) * (halfWidth + 1)) + 1
        // summation area table again
        const scleraIrisArea = ((1.0 * summedAreaTable[width - 1 - offset][y + offset] + summedAreaTable[0 + offset][y + offset - halfWidth] - summedAreaTable[0 + offset][y + offset] - summedAreaTable[width - 1 - offset][y + offset - halfWidth]) - irisArea)
        // minimize avgScore/scleraIrisArea. 150 is too high, might have to change since it's closer to white
        if ((avgScore) / scleraIrisArea < bestAvgScore && avgScore < 150) {
          bestAvgScore = (avgScore) / scleraIrisArea
          bestPoint = [x + offset, y + offset]
          bestHalfWidth = halfWidth
        }
      }
    }
  }
  return [bestPoint, bestHalfWidth]
}

/**
 * Given an object with two eye patches it finds the location of the detected pupils
 * @param  {import("./facemesh.mjs").TwoEyes} eyesObj - left and right detected eye patches
 * @return {import("./facemesh.mjs").TwoEyes} eyesObj - updated eye patches with information about pupils' locations
 */
export const getPupils = function (eyesObj) {
  if (!eyesObj) {
    return eyesObj
  }
  if (!eyesObj.left.blink) {
    eyesObj.left.pupil = getSinglePupil([...grayscale(eyesObj.left.patch.data, eyesObj.left.width, eyesObj.left.height)], eyesObj.left.width, eyesObj.left.height)
    eyesObj.left.pupil[0][0] -= eyesObj.left.pupil[1]
    eyesObj.left.pupil[0][1] -= eyesObj.left.pupil[1]
  }
  if (!eyesObj.right.blink) {
    eyesObj.right.pupil = getSinglePupil([...grayscale(eyesObj.right.patch.data, eyesObj.right.width, eyesObj.right.height)], eyesObj.right.width, eyesObj.right.height)
    eyesObj.right.pupil[0][0] -= eyesObj.right.pupil[1]
    eyesObj.right.pupil[0][1] -= eyesObj.right.pupil[1]
  }
  return eyesObj
}
