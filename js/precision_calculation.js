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

  var precisionPercentages = new Array(50);

  /*
   * calculate percentage accuracy for each prediction based on distance of
   * the prediction point from the centre point (uses the window height as
   * lower threshold 0%)
   */
  for (x = 0; x < 50; x++) {
    //calculate distance between each prediction and staring point
    var xDiff = staringPointX - x50[x];
    var yDiff = staringPointY - y50[x];
    var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

    //calculate precision percentage
     var halfWindowHeight = windowHeight / 2;
     var precision = 0;
     if (distance <= halfWindowHeight && distance > -1) {
       precision = 100 - (distance / halfWindowHeight * 100);
     } else if (distance > halfWindowHeight) {
       precision = 0;
     } else if (distance > -1) {
       precision = 100;
     }

     //store the precision
     precisionPercentages[x] = precision;
  }

  //find the average of all precision percentages calculated
  var precision = 0;
  for (x = 0; x < 50; x++) {
    precision += precisionPercentages[x];
  }
  precision = precision / 50;

   //return the precision measurement (percentage)
   return Math.round(precision);
};
