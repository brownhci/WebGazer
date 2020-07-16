window.applyKalmanFilter = true;

window.saveDataAcrossSessions = false;

const collisionSVG = "collisionSVG";

window.onload = async function() {

  if (!window.saveDataAcrossSessions) {
      var localstorageDataLabel = 'webgazerGlobalData';
      localforage.setItem(localstorageDataLabel, null);
      var localstorageSettingsLabel = 'webgazerGlobalSettings';
      localforage.setItem(localstorageSettingsLabel, null);
  }

  const webgazerInstance = await webgazer.setRegression('ridge') /* currently must set regression and tracker */
  .setTracker('TFFacemesh')
  .begin();
  webgazerInstance.showPredictionPoints(false); /* shows a square every 100 milliseconds where current prediction is */

  function checkIfReady() {
    var feedbackBox = document.getElementById( webgazer.params.faceFeedbackBoxId );
    
    if (!webgazer.isReady()) {
      setTimeout(checkIfReady, 100);
    }
    // This isn't strictly necessary, but it makes the DOM easier to read
    // to have the z draw order reflect the DOM order.
    else if( typeof(feedbackBox) == 'undefined' || feedbackBox == null ) {
      setTimeout(checkIfReady, 100);
    }
    else
    {
      // Add the SVG component on the top of everything.
      setupCollisionSystem();
      webgazer.setGazeListener( collisionEyeListener );
    }
  }

  setTimeout(checkIfReady,100);
};

window.onbeforeunload = function() {
  if (window.saveDataAcrossSessions) {
      webgazer.end();
  } else {
      localforage.clear();
  }
}
var canvas = ''
var initial_dimensions = {x:430,y:100,radius:100}
var destination_dimensions = {x:1730,y:500,radius:100}
function setupCollisionSystem() {
  var width = window.innerWidth;
  var height = window.innerHeight;

  var numberOfNodes = 2;
  var svg = d3.select("body").append("svg")
  .attr("id", collisionSVG)
  .attr("width", width)
  .attr("height", height)
  .style("top", "0px")
  .style("left","0px")
  .style("margin","0px")
  .style("position","absolute")
  .style("z-index", 100000);

  svg.append("circle")
  .attr("r", destination_dimensions.radius)
  .attr("cy",destination_dimensions.y)
  .attr("cx",destination_dimensions.x)
  .style("fill", "red")
  svg.append("circle")
  .attr("r", initial_dimensions.radius)
  .attr("cy",initial_dimensions.y)
  .attr("cx",initial_dimensions.x)
  .style("fill", "red")

  svg.append("line")
  .attr("id", "eyeline1" )
  .attr("stroke-width",2)
  .attr("stroke","red");

  svg.append("line")
  .attr("id", "eyeline2" )
  .attr("stroke-width",2)
  .attr("stroke","red");

  svg.append("rect")
  .attr("id","predictionSquare")
  .attr("width",5)
  .attr("height",5)
  .attr("fill","red");
  canvas = document.getElementById('collisionSVG');
  var calibrate_button = document.getElementById('calibrate_button');

var button_attrs = calibrate_button.getBoundingClientRect()
var button_rect = {
	x:button_attrs.x,
	y:button_attrs.y,
	width:button_attrs.width,
	height:button_attrs.height
}
  canvas.addEventListener('click',function(evt){
	var mousePos = getMousePos(canvas, evt);
    if (isInside(mousePos,button_rect)) {
		finished_calibration = true
	}
}) 
}

var last_time = 0;
var finished_calibration = false;


function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}

function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}



function get_distance(x1,x2,y1,y2){
	let x = x1-x2;
	let y = y1-y2
	return Math.sqrt(x*x+y*y)
}
var initial_position = false;
var time_initial_position = 0;
var webgazerCanvas = null;
var total_distance = 0;

var collisionEyeListener = async function(data, clock) {
  if(!data)
    return;
  if (!webgazerCanvas) {
    webgazerCanvas = webgazer.getVideoElementCanvas();
  }

  await webgazer.getTracker().getEyePatches(webgazerCanvas, webgazerCanvas.width, webgazerCanvas.height);
  var fmPositions = await webgazer.getTracker().getPositions();
  var whr = webgazer.getVideoPreviewToCameraResolutionRatio();
  var line = d3.select('#eyeline1')
          .attr("x1",data.x)
          .attr("y1",data.y)
          .attr("x2",fmPositions[145][0] * whr[0])
          .attr("y2",fmPositions[145][1] * whr[1]);

  var line = d3.select("#eyeline2")
          .attr("x1",data.x)
          .attr("y1",data.y)
          .attr("x2",fmPositions[374][0] * whr[0])
          .attr("y2",fmPositions[374][1] * whr[1]);

  var dot = d3.select("#predictionSquare")
            .attr("x",data.x)
            .attr("y",data.y);
  var x = fmPositions[145][0] - data.x;
  var y = fmPositions[145][1] - data.y  
  if (get_distance(initial_dimensions.x, data.x,initial_dimensions.y,data.y) < initial_dimensions.radius){
  	initial_position = true;
  	time_initial_position = clock;
  }
  else if ((get_distance(destination_dimensions.x, data.x,destination_dimensions.y,data.y) 
  	< destination_dimensions.radius) & initial_position) {
  	
  	var distance = get_distance(destination_dimensions.x, initial_dimensions.x,
  		destination_dimensions.y,initial_dimensions.y)
  	initial_position = false;
  	console.log('speed is', distance/(clock-time_initial_position));
  }
  // if (Math.sqrt(distance_to_destination_x*distance_to_destination_x 
  // 	+ distance_to_destination_y*distance_to_destination_y) < destination_dimensions.radius){
  // 	
  // 	console.log(get_distance(destination_dimensions.x,initial_position.x,destination_dimensions.y,initial_position.y))
  // }
}
