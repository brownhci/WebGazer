/*
 * This function calculates a measurement for how precise the eye tracker is
 * currently to let the user know how accurate it is
 */
function calculatePrecision(past50Array) {
  var windowHeight = $(window).height();
  var windowWidth = $(window).width();

  // the last 50 precision points
  var x50 = past50Array[0];
  var y50 = past50Array[1];

  // the position of the point user is staring at
  var staringPointX = windowWidth / 2;
  var staringPointY = windowHeight / 2;

  var xAverage = 0;
  var yAverage = 0;

  /*
   * find the average distances from the position of the staring point
   */
  //sum predictions
  for (x = 0; x < 50; x++) {
    xAverage += x50[x];
    yAverage += y50[x];
  }

  //divide predictions to get averages
  xAverage = xAverage / 50;
  yAverage = yAverage / 50;

  /*
   * calculate distance between average and staring point
   */
  var xDiff = staringPointX - xAverage;
  var yDiff = staringPointY - yAverage;
  var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

  /*
   * calculate percentage accuracy based on distance of the average prediction
   * point from the centre point (uses the window height as lower threshold 0%)
   */
   var halfWindowHeight = windowHeight / 2;
   var precision = 0;
   if (distance <= halfWindowHeight && distance > -1) {
     precision = 100 - (distance / halfWindowHeight * 100);
     precision = Math.round(precision);
   } else if (distance > halfWindowHeight) {
     precision = 0;
   } else if (distance > -1) {
     precision = 100;
   }

   //return the precision measurement (percentage)
   return precision;
};
