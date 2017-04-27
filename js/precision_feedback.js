function calculatePrecision() {
  window.webgazer = window.webgazer || {};

  //TODO this should come from when the user is looking
  //at the one point for 5 seconds after calibration
  var x10 = document.src.webgazer.average_x10;
  var y10 = document.src.webgazer.average_y10;

  //TODO should be position of staring point
  var staringPointX = ;
  var staringPointY = ;

  var windowHeight = $(window).height();
  var windowWidth = $(window).width();

  var xAverage = 0;
  var yAverage = 0;

  /*
   * find the average distances from the position of the staring point
   */
  //sum predictions
  for (x = 0; x < 10; x++) {
    xAverage += x10[x];
    yAverage += y10[x];
  }

  //divide predictions to get averages
  xAverage = xAverage / 10;
  yAverage = yAverage / 10;

  /*
   * calculate distance between average and staring point
   */
  var distance = sqrt((staringPointX - xAverage)^2 + (staringPointY - yAverage)^2);

  /*
   * calculate percentage accuracy based on difference (using thresholds)
   */
   //TODO recalculate using window height and width
   var precision = 0;
   if (distance < 101 && distance > -1) {
     precision = 100 - distance;
   } else if (distance > 100) {
     precision = 0;
   } else if (distance > -1) {
     precision = 100;
   }

   //return the precision measurement (percentage)
   return precision;
};
