var PointCalibrate = 0;
var CalibrationPoints={};

/**
* This function listens for button clicks on the html page
* checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
*/
$(document).ready(function() {

  $("#Pt5").hide(); // initially hides the middle button

    $(".Calibration").click(function(){ // click event on the calibration buttons

      var id = $(this).attr('id');

      if (!CalibrationPoints[id]){ // initialises if not done
        CalibrationPoints[id]=0;
      }

      CalibrationPoints[id]++; // increments values

      if (CalibrationPoints[id]==5){ //only turnns red after 5 clicks

        $(this).css('background-color','yellow');
        $(this).prop('disabled', true); //disables the button
        PointCalibrate++;


      }else if (CalibrationPoints[id]<5){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.2*CalibrationPoints[id]+0.2;
        $(this).css('opacity',opacity);
      }
      //Show the middle calibration point after all other points have been clicked.
      if (PointCalibrate == 8){
        $("#Pt5").show();
      }
      if (PointCalibrate >= 9){ // last point is calibrated
            //using jquery to grab every element in Calibration class and hide them except the middle point.
            $(".Calibration").hide();
            $("#Pt5").show();

            // clears the canvas
            var canvas = document.getElementById("plotting_canvas");
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // notification for the measurement process
            swal({
              title: "Calculating measurement",
              text: "Please stare at the middle dot for the next 5 seconds as we calculate the precision",
              allowEscapeKey: false,
              allowOutsideClick: false,
              closeOnConfirm: true,
              timer: 4000
            }, function(isConfirm){

              if (isConfirm){
                // makes the variables true for 5 seconds & plots the points
                $(document).ready(function(){

                  draw_points_variable(); //  starts drawing prediction points on the canvas
                  store_points_variable(); //start storing the prediction points

                  sleep(5000).then(() => { //waits 5 seconds
                      stop_drawing_points_variable(); //  stops drawing prediction points on the canvas
                      stop_storing_points_variable(); //stop storing the prediction points
                      var past50 = return_points() //retrieve the stored points
                      var precision_measurement = calculatePrecision(past50);
                      var accuracyLabel = "<a>Accuracy | "+precision_measurement+"%</a>";
                      document.getElementById("Accuracy").innerHTML = accuracyLabel;//Show the accuracy in the nav bar.
                      swal({
                        title: "Your accuracy measure is " + precision_measurement + "%",
                        showCancelButton: true,
                        allowOutsideClick: false,
                        showConfirmButton: true,
                        cancelButtonText: "recalibrate"
                      }, function(isConfirm){
                        if (isConfirm){
                          //idk what we do if they confirm this
                          ClearCalibration();
                          $("#Pt5").hide();
                        } else {
                          //use restart function to restart the calibration
                          Restart();
                        }
                      });
                  });
                });
              }
            });
          }
    });
    swal({
      title: "Calibration",
      text: "Please click on the each of the 9 points on the screen. You must click each point 5 times till it goes yellow. This will calibrate your eye movements.",
      allowOutsideClick: false,
      showConfirmButton: true
    });
});

/**
* This function clears the calibration buttons memory
*/
function ClearCalibration(){
  $(".Calibration").css('background-color','red');
  $(".Calibration").css('opacity',0.2);
  $(".Calibration").prop('disabled',false);

  CalibrationPoints = {};

  PointCalibrate = 0;
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
