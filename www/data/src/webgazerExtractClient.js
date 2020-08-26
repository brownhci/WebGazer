// Initialize variables
var overlay;
var width = 640;
var height = 480;
var topDist = '0px';
var leftDist = '0px';

var logs = "";
var logsCount = 0;

var videoFilename = "";
var frameNum = -1;
var frameTimeEpoch = -1;
var frameTimeIntoVideoMS = -1;
var tobiiX, tobiiY;

// Screen space size (received from server)
var screenWidthPixels, screenHeightPixels;
// Where the document starts in screen space (e.g., where clientX,clientY 0,0 is in screen space)
var docStartX, docStartY;
// Whether the participant is a touch typist or not
var touchTypist;

var processTimePrev = 0;

// WebSocket for sending image data
var ws;
// CLM tracker
var fm;
// TODO magic numbers
var fmPosFeaturesSize = 468;
var eyeFeaturesSize = 120;
// Screencap video
var screencapVideo;
var showScreenCap = false;
var screencapStartTime = 0;
var screencapTimeOffsetMS = 0;

var participant_id = "";
var total_participants = 64;
var video_number = 1;
var total_videos = 6;

function toggleScreenCap()
{
    showScreenCap = !showScreenCap;
    if( !showScreenCap )
        screencapVideo.style.visibility="hidden"
    else
        screencapVideo.style.visibility="visible"
}

function setScreenCapTimeOffset()
{
    screencapTimeOffsetMS = parseInt( parseFloat(document.getElementById('scTimeOffset').value) * 1000 )
    console.log( screencapTimeOffsetMS )
}

function onLoad() 
{
    // Init webgazer and set parameters
    webgazer.setRegression('ridge').setTracker('TFFacemesh');

    // Drawing overlay
    var c = document.getElementById('wsCanvas')
    c.style.position = 'absolute';
    c.width = width;
    c.height = height;
    c.style.top = topDist;
    c.style.left = leftDist;
    c.style.margin = '0px';
    // Set our canvas to be the one that webgazer uses
    webgazer.setVideoElementCanvas(c);
    webgazer.params.videoElementCanvasId = 'wsCanvas';
    webgazer.getVideoElementCanvas().id = webgazer.params.videoElementCanvasId;
    
    screencapVideo = document.getElementById('screencap')
    screencapVideo.style.position = 'absolute';
    screencapVideo.style.top = topDist;
    screencapVideo.style.left = '640px';
    screencapVideo.style.margin = '0px'
    screencapVideo.style.visibility="hidden"

    // Overlay for fm tracker
    overlay = document.createElement('canvas');
    overlay.id = 'overlay';
    overlay.style.position = 'absolute';
    overlay.width = width;
    overlay.height = height;
    overlay.style.top = topDist;
    overlay.style.left = leftDist;
    overlay.style.margin = '0px';

    document.body.appendChild(overlay);

    fm = webgazer.getTracker();
    // Start WebSocket
    ws = new WebSocket("ws://localhost:8000/websocket");
    ws.binaryType = "blob"
    ws.onopen = function(e) 
    {};

    ws.onmessage = async function(e) 
    {
        // Received image data
        if( e.data instanceof Blob )
        {
            var c = document.getElementById('wsCanvas')
            ctx = c.getContext('2d')

            var fr = new FileReader();
            fr.onload = async function (e) {
                var buffer = new Uint8ClampedArray(e.target.result);
                var imageData = new ImageData(buffer, width, height);
                ctx.putImageData( imageData, 0, 0 )

                runWebGazerSendResult();
            };
            fr.readAsArrayBuffer(e.data);
        }
        else
        {
            try
            {
                obj = JSON.parse( e.data );
            }
            catch( err )
            {
                console.log( err );
                return;
            }

            // Receiving participant info
            if( obj.msgID == "0" )
            {
                screencapStartTime = parseInt( obj.screencapStartTime );
                screenWidthPixels = parseInt( obj.screenWidthPixels );    
                screenHeightPixels = parseInt( obj.screenHeightPixels );
                docStartX = parseInt( obj.docStartX );
                docStartY = parseInt( obj.docStartY );
                touchTypist = obj.touchTypist;
                screencapVideo.src = obj.participantScreenCapFile;
                participant_id = obj.participantScreenCapFile.substring(2,4)
                video_number = 1;

                // Server has told us we are switching participants.
                // Let's load the input log for this participant from the server
                // TODO do this with websockets?!?!
                fetch(obj.participantInputLogFile)
                .then(function (response) {
                    return response.json();
                })
                .then(function (body) {
                    logs = body;
                });


                // Reset logs count as new participant
                logsCount = 0
                
                // Reset fm tracker as it's a new participant with new interactions/appearance
                fm.reset();

                var send = { msgID: "1" };
                sendMsg( JSON.stringify(send) );
            }
            // Receiving frame info
            else if( obj.msgID == "2" )
            {
                videoFilename = obj.videoFilename;
                frameNum = parseInt( obj.frameNum );
                frameNumTotal = parseInt( obj.frameNumTotal );

                tobiiX = parseFloat( obj.tobiiX );
                tobiiY = parseFloat( obj.tobiiY );

                frameTimeEpoch = parseInt( obj.frameTimeEpoch )
                frameTimeIntoVideoMS = parseInt( obj.frameTimeIntoVideoMS );
                // Update screen cap video
                seekTimeMS = frameTimeEpoch - screencapStartTime + screencapTimeOffsetMS;
                if( showScreenCap )
                    screencapVideo.currentTime = seekTimeMS / 1000.0
            }
            else if( obj.msgID == "4" )
            {
                // Video has ended; ask for a new video.
                var send = { msgID: "1" };
                sendMsg( JSON.stringify(send) );
                video_number++;
            }
        }
    };
}

async function sendMsg(msg) {
    ws.send(msg);
}

// Thanks to http://jsfiddle.net/d4rcuxw9/1/
// https://stackoverflow.com/questions/29573700/finding-the-difference-between-two-string-in-javascript-with-regex
function getStringDifference(a, b)
{
    var i = 0;
    var j = 0;
    var result = "";
    
    while (j < b.length)
    {
        if (a[i] != b[j] || i == a.length)
            result += b[j];
        else
            i++;
        j++;
    }
    return result;
}

async function runWebGazerSendResult()
{
    // Object to collect all the results
    var s = {};

    /////////////////////////////////////////////////////////
    // Interaction inputs (default values)
    s.mouseMoveX = [];
    s.mouseMoveY = [];
    s.mouseClickX = [];
    s.mouseClickY = [];
    s.keyPressed = [];
    s.keyPressedX = [];
    s.keyPressedY = [];

    //////////////////////////////////////////////////////////
    // Push mouse clicks and keyboard input from logs to WebGazer
    //
    var mouseImg = document.getElementById("myMouse");
    while (logsCount < logs.length && (logs[logsCount].epoch) < frameTimeEpoch) 
    {
        switch (logs[logsCount].type) 
        {
            case "mouseclick":
                // Ignore all interactions for the 'dot_test_final.' video
                if( !videoFilename.includes("dot_test_final.") )
                    webgazer.recordScreenPosition(logs[logsCount].clientX, logs[logsCount].clientY, "click");
                
                s.mouseClickX.push( (logs[logsCount].clientX + docStartX) / screenWidthPixels );
                s.mouseClickY.push( (logs[logsCount].clientY + docStartY) / screenHeightPixels );
                
                mouseImg.style.height = '20px';
                mouseImg.style.width = '20px';
                mouseImg.style.top = (s.mouseClickY * screencapVideo.height) -10 + 'px';
                mouseImg.style.left = width + (s.mouseClickX * screencapVideo.width) -10 + 'px';
                break;
            case "mousemove":
                // Ignore all interactions for the 'dot_test_final.' video
                if( !videoFilename.includes("dot_test_final.") )
                    webgazer.recordScreenPosition(logs[logsCount].clientX, logs[logsCount].clientY, "move");

                s.mouseMoveX.push( (logs[logsCount].clientX + docStartX) / screenWidthPixels );
                s.mouseMoveY.push( (logs[logsCount].clientY + docStartY) / screenHeightPixels );

                mouseImg.style.height = '10px';
                mouseImg.style.width = '10px';
                mouseImg.style.top = (s.mouseMoveY * screencapVideo.height) -5 + 'px';
                mouseImg.style.left = width + (s.mouseMoveX * screencapVideo.width) -5 + 'px';
                break;
            case "textInput":
                //IMPORTANT: CHANGE WEBGAZER.js CODE IF YOU WANT TO INCLUDE TYPING

                //if( !videoFilename.includes("dot_test_final.") && touchTypist === "Yes" )
                //    webgazer.recordScreenPosition( logs[logsCount].pos.left, logs[logsCount].pos.top, "click" );
                
                // There is a bug in the data collection here, where the value of .text is 'one event behind'
                // textTyped = logs[count].text;  <- BAD!
                // So, let's go get the next textTyped event.
                var localCount = logsCount+1;
                while( logs[localCount] && logs[localCount].type !== "textInput" )
                    localCount++;

                if( !logs[localCount] )
                {
                    // We've run out of events and not found a next textInput event.
                    keyPressed = "Unknown";
                }
                else if( logs[localCount.text] === "" )
                {
                    // We've started a new text field with this event, or some other weird thing happened, which means the last character has been lost forever : (
                    keyPressed = "Unknown";
                }
                else
                {   
                    // We've found a textInput event and it's not empty.
                    // Now let's check for the difference between these two strings
                    // Note that we can't just look at the last character in logs[localCount].text, because the user could have inserted text anywhere.
                    if( logs[localCount].text.length > logs[logsCount].text.length )
                        keyPressed = getStringDifference( logs[logsCount].text, logs[localCount].text );
                    else
                        // The new text is _shorter_ than the old text, which means the user must have pressed backspace at some point _after_ this.
                        // However, 'Backspace' as a key isn't logged.
                        // A key was pressed at this time instance, but it wasn't 'Backspace' yet, because those events aren't logged.
                        // So, it is 'Unknown'
                        keyPressed = "Unknown";
                        //
                        // After this event there is some unknown event where backspace is pressed, but it isn't logged.
                }

                // Escape an escape key so that we transmit it whole
                // keyPressed will not send correctly if the keystroke is ", because
                // the " is considered to be part of the url.
                // So, let's wrap it up.
                // if( keyPressed === ';' )
                //     keyPressed = 'semicolon';
                // if( keyPressed === '&' )
                //     keyPressed = 'ampersand';
                // if( keyPressed === '=' )
                //     keyPressed = 'equals';

                console.log( "Key pressed: " + keyPressed );
                s.keyPressed.push( keyPressed );
                s.keyPressedX.push( (logs[logsCount].pos.left + docStartX) / screenWidthPixels );
                s.keyPressedY.push( (logs[logsCount].pos.top  + docStartY) / screenHeightPixels );

                mouseImg.style.height = '10px';
                mouseImg.style.width = '3px';
                mouseImg.style.top = (s.keyPressedY * screencapVideo.height) + 'px';
                mouseImg.style.left = width + (s.keyPressedX * screencapVideo.width) + 'px';
                
                break;
        }
        logsCount++;
    }

    // Update tobii visualization
    var wgv = document.getElementById('tobiiGP');
    wgv.style.height = '10px';
    wgv.style.width = '10px';
    wgv.style.top = (tobiiY * screencapVideo.height - 5) + 'px'; // half height
    wgv.style.left = width + (tobiiX * screencapVideo.width - 5) + 'px';

    //////////////////////////////////////////////////////////
    // Run WebGazer
    //
    var webGazerX = "-1"
    var webGazerY = "-1"
    // TODO magic numbers
    var eyeFeatures = Array(eyeFeaturesSize).fill(-1)
    var gazeData = await webgazer.getCurrentPrediction();
    if ( gazeData )
    {
        // Gaze in [0,1] coordinates
        webGazerX = ( gazeData.x + docStartX ) / screenWidthPixels
        webGazerY = ( gazeData.y + docStartY ) / screenHeightPixels

        // Grab eye features
        
        eyeFeatures = webgazer.util.getEyeFeats(gazeData.eyeFeatures)

        // Update position of output visualizer
        //
        var wgv = document.getElementById('wgGP');
        wgv.style.height = '10px';
        wgv.style.width = '10px';
        wgv.style.top = (webGazerY * screencapVideo.height - 5) + 'px'; // half height
        wgv.style.left = width + (webGazerX * screencapVideo.width - 5) + 'px';
    }
    
    // Also collect the CLMTracker positions
    // 
    //var clmPos = cl.getCurrentPosition();
    var fmPos = fm.getPositions();
    if ( fmPos ) 
    {
        overlay.getContext('2d').clearRect(0, 0, width, height);
        fm.drawFaceOverlay(overlay.getContext('2d'),fmPos);
    }
    else
    {   // Reproduce necessary structure
        fmPos = Array(fmPosFeaturesSize/2).fill(Array(-1,-1))
    }

    // Update display
    var pDiag = document.getElementById("partvidframe")
    pDiag.innerHTML  = "Video: " + videoFilename + "<br> Frame num: " + frameNum + "/" + frameNumTotal + " Video current time (MS): " + frameTimeIntoVideoMS;
    //console.log( "Frame num: " + frameNum + "    Video current time: " + frameTimeIntoVideoMS );

    var eDiag = document.getElementById("wgError")
    var xdiff = tobiiX - webGazerX;
    var ydiff = tobiiY - webGazerY;
    var xdiffPix = xdiff * screenWidthPixels;
    var ydiffPix = ydiff * screenHeightPixels;
    var error = Math.sqrt( xdiff*xdiff + ydiff*ydiff )
    var errorPix = Math.sqrt( xdiffPix*xdiffPix + ydiffPix*ydiffPix )
    eDiag.innerHTML  = "Error: " + error.toFixed(4) + " (pixels: " + errorPix.toFixed(4) + ")";

    var fpsDiag = document.getElementById("procFPS")
    var tdiff = performance.now() - processTimePrev;
    processTimePrev = performance.now();
    fpsDiag.innerHTML  = "Processing FPS: " + (1000 / tdiff).toFixed(2)

    var parcipants_status = document.getElementById("parcipants_status");
    parcipants_status.innerHTML = "Participant " + participant_id + "/" + String(total_participants);
    var videos_status = document.getElementById("videos_status");
    videos_status.innerHTML = "Video " + String(video_number) + "/" + String(total_videos);

    // Send a msg to the server, which can write out the file + metadata
    s.msgID = "3"
    s.frameNum = frameNum; // Sanity
    s.frameTimeEpoch = frameTimeEpoch;
    s.webGazerX = webGazerX;
    s.webGazerY = webGazerY;
    s.fmPos = fmPos;
    s.eyeFeatures = eyeFeatures;
    s.error = error;
    s.errorPix = errorPix;

    sendMsg( JSON.stringify(s) )            
}
