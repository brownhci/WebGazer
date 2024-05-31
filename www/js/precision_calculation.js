// @ts-check
/**
 * This function calculates a measurement for how precise
 * the eye tracker currently is which is displayed to the user
 * @param {[number[], number[]]} past50Array
 */
export function calculatePrecision (past50Array) {
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth

  // Retrieve the last 50 gaze prediction points
  const x50 = past50Array[0]
  const y50 = past50Array[1]

  // Calculate the position of the point the user is staring at
  const staringPointX = windowWidth / 2
  const staringPointY = windowHeight / 2

  const precisionPercentages = calculatePrecisionPercentages(windowHeight, x50, y50, staringPointX, staringPointY)
  const precision = calculateAverage(precisionPercentages)

  // Return the precision measurement as a rounded percentage
  return Math.round(precision)
};

/**
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 * @param {number} windowHeight
 * @param {number[]} x50
 * @param {number[]} y50
 * @param {number} staringPointX
 * @param {number} staringPointY
 */
function calculatePrecisionPercentages (windowHeight, x50, y50, staringPointX, staringPointY) {
  return new Array(50).fill(0).map((_, i) => {
    // Calculate distance between each prediction and staring point
    const xDiff = staringPointX - x50[i]
    const yDiff = staringPointY - y50[i]
    const distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff))

    // Calculate precision percentage
    const halfWindowHeight = windowHeight / 2
    if (distance <= halfWindowHeight && distance > -1) {
      return 100 - (distance / halfWindowHeight * 100)
    } else if (distance > halfWindowHeight) {
      return 0
    } else if (distance > -1) {
      return 100
    } else return 0
  })
}

/**
 * Calculates the average of all precision percentages calculated
 * @param {number[]} precisionPercentages
 */
function calculateAverage (precisionPercentages) {
  return precisionPercentages.reduce((sum, val) => sum + val, 0) / precisionPercentages.length
}
