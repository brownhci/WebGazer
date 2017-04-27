var PointCalibrate = 0;

$(document).ready(function() {
   $("input[type='button']").click(function(){
      $(this).css('background-color','red');
      PointCalibrate++;
      if (PointCalibrate == 9){
        for(count = 1; count < 10; count++){ // loops through all buttons & hides them
          if (count != 5){
            var name = 'Pt' + count;
            document.getElementById(name).style.visibility = 'hidden';
          }
        }
        var canvas = document.getElementById("plotting_canvas"); // clears canvas of points clicked
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        swal({
          title: "Calculating measurement",
          text: "Please stare at the middle dot for the next 5 seconds as we calculate the precision"
        }, function(isConfirm){
          if (isConfirm){
            $(document).ready(function(){
              draw_points_variable(true);
              sleep(5000).then(() => {
                  draw_points_variable(false);
              });
            });
          }
        });
      }
      $(this).prop('disabled', true);
    });
    swal({
      title: "Calibration",
      text: "Please click on the each of the 9 points on the screen. This will calibrate your eye movements."
    });
});
function ClearCalibration(){
  $(".Calibration").css('background-color','yellow');
  $(".Calibration").prop('disabled',false);
  PointCalibrate = 0;
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
