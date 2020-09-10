var vid = document.getElementById('videoel');
var overlay = document.getElementById('overlay');
var overlayCC = overlay.getContext('2d');


window.onload = async function() {
	webgazer.params.showVideoPreview = true;
	const webgazerInstance = await webgazer.setRegression('ridge')
	.setTracker('TFFacemesh')
	.begin();
	webgazer.showFaceFeedbackBox(false)
	webgazer.showFaceOverlay(false)
	webgazer.showPredictionPoints(false)
	//must exist to make prediction but shouldn't be visible to user
	document.getElementById('webgazerVideoFeed').style.visibility = 'hidden'
};

var ctrack = webgazer.setRegression('ridge').setTracker('TFFacemesh')
					
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

// check for camerasupport
if (navigator.getUserMedia) {
	// set up stream
	
	var videoSelector = {video : true};
	if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
		var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
		if (chromeVersion < 20) {
			videoSelector = "video";
		}
	};

	navigator.getUserMedia(videoSelector, function( stream ) {
		if (vid.mozCaptureStream) {
			vid.mozSrcObject = stream;
		} else {
			//vid.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
			try {
			  vid.srcObject = stream;
			} catch (error) {
			  vid.src = window.URL.createObjectURL(stream);
			}

		}
		vid.play();
	}, function() {
		alert("There was some problem trying to fetch video from your webcam, using a fallback video instead.");
	});
} else {
	alert("Your browser does not seem to support getUserMedia, using a fallback video instead.");
}

vid.addEventListener('canplay', startVideo, false);

function startVideo() {
	// start video
	vid.play();
	// start tracking
	//ctrack.start(vid);
	// start loop to draw face
	//drawLoop();
}

function drawLoop() {
	requestAnimFrame(drawLoop);
	overlayCC.clearRect(0, 0, 400, 300);
	//psrElement.innerHTML = "score :" + ctrack.getScore().toFixed(4);
	if (ctrack.getCurrentPosition()) {
		ctrack.draw(overlay);
	}
}

var data = [];
var paintCanvas = document.createElement('canvas');
paintCanvas.width = vid.width;
paintCanvas.height = vid.height;
paintCanvas.style.display = 'none';
var paintCanvasCC = paintCanvas.getContext('2d');

async function listener(e, type) {
    var positions = await ctrack.getCurrentPrediction();
    if (positions) {
        paintCanvasCC.drawImage(vid, 0, 0, vid.width, vid.height);
        var pixelData = paintCanvasCC.getImageData(0,0,vid.width,vid.height);
        var x = e.clientX;
        var y = e.clientY;
        var data = {
            'positions' : [positions.x,positions.y],
            'width': pixelData.width,
            'x' : x,
            'y' : y,
            'type' : type,
            'timestamp' : (new Date()).getTime()
        };
        sendToServer(paintCanvas, data);
    }
}

function sendToServer(canvas, data) {
    var xhttp = new XMLHttpRequest();
    var formdata = new FormData();
    formdata.append('img', canvas.toDataURL());
    formdata.append('data', JSON.stringify(data));
    xhttp.open('POST', 'http://localhost:8000', true);
    xhttp.onload = function(e) {
	if (this.status == 200) {
		console.log(e.target.response);
		}
	else{
		console.log(e)
		}
	};
    xhttp.send(formdata);
}

//not used
function saveFile() {
    var file = new Blob([JSON.stringify(data)], {type: 'text/json'});
    var url = URL.createObjectURL(file);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'collectedData' + (new Date()).toJSON();
    link.innerText = 'download here';
    document.body.appendChild(link);
}

document.body.addEventListener('click', function(event) {
    console.log('click');
    listener(event, 'click');
});

//not used
document.body.addEventListener('mousemove', function(event) {
    //listener(event, 'move');
});

