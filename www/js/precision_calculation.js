/*
 * This function calculates a measurement for how precise 
 * the eye tracker currently is which is displayed to the user
 */
function calculatePrecision(past50Array) {
  if (!past50Array || !past50Array[0] || !past50Array[1]) {
    return 0;
  }

  var windowHeight = window.innerHeight;
  var windowWidth = window.innerWidth;

  // Retrieve the stored gaze prediction points
  var x50 = past50Array[0];
  var y50 = past50Array[1];
  var totalPoints = Math.min(x50.length, y50.length);

  if (totalPoints === 0) {
    return 0;
  }

  // Calculate the position of the point the user is staring at (screen center)
  var staringPointX = windowWidth / 2;
  var staringPointY = windowHeight / 2;

  var precisionPercentages = new Array(totalPoints);
  calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
  var precision = calculateAverage(precisionPercentages);

  // Return the precision measurement as a rounded percentage
  return Math.round(precision);
}

/*
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
function calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY) {
  var halfWindowHeight = windowHeight / 2;
  var totalPoints = precisionPercentages.length;

  for (var i = 0; i < totalPoints; i++) {
    // Calculate distance between each prediction and staring point
    var xDiff = staringPointX - x50[i];
    var yDiff = staringPointY - y50[i];
    var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

    // Calculate precision percentage
    var precision = 0;
    if (distance <= halfWindowHeight) {
      precision = 100 - (distance / halfWindowHeight * 100);
    } else {
      precision = 0;
    }

    // Store the precision
    precisionPercentages[i] = precision;
  }
}

/*
 * Calculates the average of all precision percentages calculated
 */
function calculateAverage(precisionPercentages) {
  if (!precisionPercentages || precisionPercentages.length === 0) {
    return 0;
  }

  var precision = 0;
  var count = precisionPercentages.length;
  for (var i = 0; i < count; i++) {
    precision += precisionPercentages[i];
  }
  return precision / count;
}

