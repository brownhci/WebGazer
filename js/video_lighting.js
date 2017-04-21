var toAlert = true;

/**
* This changes the boolean for whether the user if notified with a popup about lighting
*/
function setAlert(){
  if (toAlert){
    toAlert = false;
  } else {
    toAlert = true;
  }
}

window.setTimeout(setAlert, 20000); // occurs every 20secs
