import {isInside,getMousePos,get_distance,onload,initial_dimensions,destination_dimensions} from './helpers.js';

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


function checkTime(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function beep() {
    var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
}


var base_left_eye_dist, closed_left_eye_dist;
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
  //var base_left_eye_dist = fmPositions[23][1] - fmPositions[145][1]
  //user has a second to close eyes, then at beep they should open them.
  if (!calibrate_blink_closed){
    await new Promise(r => setTimeout(r, 1000));
    color_sum_closed = eye_color_sum;
    document.getElementById('eye_tracking_data').innerHTML += " color_sum_closed " + String(color_sum_closed);
    base_left_eye_dist = fmPositions[23][1] - fmPositions[145][1]
    calibrate_blink_open = false;
    calibrate_blink_closed = true;
    console.log('closed',color_sum_closed)
    beep();
    await new Promise(r => setTimeout(r, 3000));
    return
  }
  if (!calibrate_blink_open){
    //TO-DO add error detection if color_sums aren't significantly different - figure out how to
    //prevent this from being called multiple times
    color_sum_open = eye_color_sum
    closed_left_eye_dist = fmPositions[23][1] - fmPositions[145][1]
    calibrate_blink_open = true;
    console.log('open',color_sum_open)
    document.getElementById('eye_tracking_data').innerHTML += "color_eye_open " + String(color_sum_open);
  }
  if (eye_color_sum - color_sum_open < color_sum_closed - eye_color_sum){
    if (!blinking){
      blinking = true;
      blinks++;
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
  	document.getElementById('eye_tracking_data').innerHTML += " minute blinks is ", blinks," distance is ", total_distance +"\n";
  	blinks = 0;
  	total_distance = 0;
  	time_initial = 0;
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
    //can display message to user about how long to close eyes
  }
  else if (isInside(mousePos,button_download_rect)){
  	var link = document.getElementById('downloadlink');
    link.href = makeTextFile(eye_tracking_data.innerHTML);
    document.getElementById('downloadlink').click()
  }
})

