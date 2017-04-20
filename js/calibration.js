var PointCalibrate = 0;
$(document).ready(function() {
   $("input[type='button']").click(function(){
      $(this).css('background-color','red');
      PointCalibrate++;
      if (PointCalibrate == 9){
        swal("Successfully calibrate all points");
      }
      $(this).prop('disabled', true);

    });
    swal("Please start the calibration process by clicking on the points");
});









