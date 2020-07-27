import {isInside,getMousePos,get_distance,onload,initial_dimensions,destination_dimensions,beep,checkTime} from './helpers.js';

window.applyKalmanFilter = true;

window.saveDataAcrossSessions = true;

const collisionSVG = "collisionSVG";

let blinks = 0;
var blink_detector = new webgazer.BlinkDetector();
var color_sum_open = 0;
var color_sum_closed = 0;
var color_sum_open = 0;
var calibrate_blink_open = true;
var calibrate_blink_closed = true;
var blinking = false;
var time_initial = 0;
var last_position = null;


var open_left_eye_dist, closed_left_eye_dist;
var EyeListener = async function(data, clock) {
  if(!data)
    return;
  if (!webgazerCanvas) {
    webgazerCanvas = webgazer.getVideoElementCanvas();
  }
  var patches = await webgazer.getTracker().getEyePatches(webgazerCanvas, webgazerCanvas.width, webgazerCanvas.height);
  //this is obviously biased by lighting
  var eye_color_sum = patches.right.patch.data.reduce((a, b) => a + b, 0);
  //other potential way of getting blink - compare distance between top and bottom of eye
  var fmPositions = await webgazer.getTracker().getPositions();
  //var 
  //user has two seconds to close eyes, then at beep they should open them.
  if (!calibrate_blink_closed){
  	calibrate_blink_closed = true;
    await new Promise(r => setTimeout(r, 2000));
    
    document.getElementById('closed_downloadphoto').href = document.getElementById('webgazerVideoCanvas').toDataURL('image/png');
    closed_left_eye_dist = fmPositions[23][1] - fmPositions[145][1]
    color_sum_closed = eye_color_sum;
    document.getElementById('eye_tracking_data').innerHTML += " color_sum_closed " + String(color_sum_closed);
    
    //console.log('closed',color_sum_closed)
    beep();
    await new Promise(r => setTimeout(r, 3000))
    calibrate_blink_open = false;
    
    return
  }
  else if (!calibrate_blink_open){
    //TO-DO add error detection if color_sums aren't significantly different - figure out how to
    //prevent this from being called multiple times
    color_sum_open = eye_color_sum
    document.getElementById('open_downloadphoto').href = document.getElementById('webgazerVideoCanvas').toDataURL('image/png');
    open_left_eye_dist = fmPositions[23][1] - fmPositions[145][1]
    
    //console.log('open',color_sum_open)
    document.getElementById('eye_tracking_data').innerHTML += "color_eye_open " + String(color_sum_open) + '<br>';
    await new Promise(r => setTimeout(r, 3000));
    calibrate_blink_open = true;
  }
  if (eye_color_sum - color_sum_open < color_sum_closed - eye_color_sum){
    if (!blinking){
      blinking = true;
      blinks++;
      console.log("eye distance =" + String(fmPositions[23][1] - fmPositions[145][1]));
    }
  }
  else{
    blinking = false;
  }
  // if ((fmPositions[23][1] - fmPositions[145][1]) - base_left_eye_dist < (fmPositions[23][1] - fmPositions[145][1]) 
  // 	- closed_left_eye_dist  ) {
  // 	if (!blinking){
	 //      blinking = true;
	 //      blinks++;
	 //      console.log("blinked " + String(blinks) + " times")
	 //    }
	 //  }
  // else{
  //   blinking = false;
  // }
  
  if (time_initial == 0){
  	time_initial = clock;
  }
  if (!last_position){
  	last_position = (({ x, y }) => ({ x, y }))(data)
  	return
	}  

  var distance_traveled = get_distance(last_position.x,data.x,last_position.y,data.y)
  total_distance += distance_traveled
  last_position = (({ x, y }) => ({ x, y }))(data)
  if(clock - time_initial > 60000){
  	var today = new Date();
  	document.getElementById('eye_tracking_data').innerHTML += checkTime(today.getHours()) + ":" + checkTime(today.getMinutes())
  	document.getElementById('eye_tracking_data').innerHTML += " minute blinks is "+ String(blinks) + 
  		" distance is " + String(Math.round(total_distance)) + "<br>";
  	blinks = 0;
  	total_distance = 0;
  	time_initial = 0;
  	console.log('minute passed')
  }
}

function setup(){
  var width = window.innerWidth;
  var height = window.innerHeight;

  var svg = d3.select("body").append("svg")
  .attr("id", collisionSVG)
  .attr("width", width)
  .attr("height", height)
  .style("top", "0px")
  .style("left","0px")
  .style("margin","0px")
  .style("position","absolute")
  .style("z-index", 100000);
}

var textFile = null;

function makeTextFile(text) {
    var data = new Blob([text], {type: 'text/plain'});
    if (textFile !== null) {
      window.URL.revokeObjectURL(textFile);
    }

    textFile = window.URL.createObjectURL(data);

    return textFile;
  };

window.onload = onload(setup(),EyeListener)

window.onbeforeunload = function() {
  if (window.saveDataAcrossSessions) {
      webgazer.end();
  } else {
      localforage.clear();
  }
}

var webgazerCanvas = null;
var total_distance = 0;

var canvas = document.getElementById('collisionSVG');
var calibrate_blink_button = document.getElementById('calibrate_blink_button');
var create = document.getElementById('create');
var button_blink_attrs = calibrate_blink_button.getBoundingClientRect()
var button_blink_rect = {
  x:button_blink_attrs.x,
  y:button_blink_attrs.y,
  width:button_blink_attrs.width,
  height:button_blink_attrs.height
}
var button_download_attrs = create.getBoundingClientRect()
var button_download_rect = {
  x:button_download_attrs.x,
  y:button_download_attrs.y,
  width:button_download_attrs.width,
  height:button_download_attrs.height
}

canvas.addEventListener('click',function(evt){
  var mousePos = getMousePos(canvas, evt);
  if (isInside(mousePos,button_blink_rect)){
    calibrate_blink_closed = false;
    
  }
  //can display message to user about how long to close eyes
  else if (isInside(mousePos,button_download_rect)){
  	var link = document.getElementById('downloadlink');
  	var eye_tracking_data_text = eye_tracking_data.innerHTML
  	eye_tracking_data_text = eye_tracking_data_text.replace(/<br>/g,"\n")
    link.href = makeTextFile(eye_tracking_data_text);
    document.getElementById('downloadlink').click()
  }
})

