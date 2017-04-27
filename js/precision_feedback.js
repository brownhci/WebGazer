function calculatePrecision() {
  window.webgazer = window.webgazer || {};

  var x10 = document.src.webgazer.average_x10;
  var y10 = document.src.webgazer.average_y10;
  var currentX = document.src.webgazer.currentXPrediction;
  var currentY = document.src.webgazer.currentYPrediction;
  xAverage = 0;
  yAverage = 0;

  /*
   * find the average distances from the position of the last click
   */
  //sum predictions
  for (x = 0; x < 10; x++) {
    if (!x10[x] == currentX) {
      xAverage += x10[x];
    }
    if (!y10[x] == currentY) {
      yAverage += y10[x];
    }
  }

  //divide predictions to get averages
  xAverage = xAverage / 10;
  yAverage = yAverage / 10;

  /*
   * calculate difference between average and last prediction point
   */
  var xDiff = currentX - xAverage;
  var yDiff = currentY - yAverage;

  /*
   * calculate percentage accuracy based on difference (using thresholds)
   */
   //TODO 
};
