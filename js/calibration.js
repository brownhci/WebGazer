var PointCalibrate = 0;
$(document).ready(function() {
   $("input[type='button']").click(function(){
      $(this).css('background-color','red');
      PointCalibrate++;
      if (PointCalibrate == 9){
        swal("Successfully calibrate all points");
        for(count = 1; count < 10; count++){ // loops through all buttons & hides them
          if (count != 5){
            var name = 'Pt' + count;
            document.getElementById(name).style.visibility = 'hidden';
          }
        }
        var canvas = document.getElementById("plotting_canvas"); // clears canvas of points clicked
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        swal("Pleas stare at the middle dot for the next 5 seconds as we calculate the precision");
      }
      $(this).prop('disabled', true);
    });
    swal("Please start the calibration process by clicking on the points");
});
function ClearCalibration(){
  $(".Calibration").css('background-color','yellow');
  $(".Calibration").prop('disabled',false);
  PointCalibrate = 0;
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
