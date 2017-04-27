var PointCalibrate = 0;
var CalibrationPoints={};

$(document).ready(function() {
    $(".Calibration").click(function(){
      
      var id = $(this).attr('id');
      console.log(id);
      if (!CalibrationPoints[id]){
        CalibrationPoints[id]=0;
      }
      
      CalibrationPoints[id]++;
      console.log(CalibrationPoints[id]);
      if (CalibrationPoints[id]>=5){
        $(this).css('background-color','red');
        PointCalibrate++;
        if (PointCalibrate == 9){
          swal("Successfully calibrate all points");
        }
        $(this).prop('disabled', true);
      }
      

    });
    swal("Please start the calibration process by clicking on the points");
});
function ClearCalibration(){
  $(".Calibration").css('background-color','yellow');
  $(".Calibration").prop('disabled',false);
  CalibrationPoints = {};
  PointCalibrate = 0;
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
