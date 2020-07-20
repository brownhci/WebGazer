export function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}



export function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}



export function get_distance(x1,x2,y1,y2){
  let x = x1-x2;
  let y = y1-y2
  return Math.sqrt(x*x+y*y)
}

export var initial_dimensions = {x:430,y:100,radius:100}
export var destination_dimensions = {x:1730,y:500,radius:100}

export async function onload(setup,listener) {

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
      setup;
      webgazer.setGazeListener( listener );
    }
  }
  setTimeout(checkIfReady,100);
};
