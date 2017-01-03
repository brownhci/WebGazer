import * as Util from "../utils/util";

/**
 * Constructor for BlinkDetector
 * @param blinkWindow
 * @constructor
 */
var BlinkDetector = function ( blinkWindow ) {
    //TODO use DataWindow instead
    this.blinkData   = [];
    //determines number of previous eyeObj to hold onto
    this.blinkWindow = blinkWindow || 8;

    //cycles through to replace oldest entry
    this.blinkWindowIndex = 0;
};

BlinkDetector.prototype.detectBlink = function ( eyes ) {

    if ( !eyes ) {
        return null;
    }

    if ( this.blinkData.length < this.blinkWindow ) {
        this.blinkData.push( eyes );
        eyes.left.blink  = false;
        eyes.right.blink = false;
        return eyes;
    }

    //replace oldest entry
    this.blinkData[ this.blinkWindowIndex ] = eyes;
    this.blinkWindowIndex                   = (this.blinkWindowIndex + 1) % this.blinkWindow;

    //TODO detect if current eyeObj is different from eyeObj in blinkData;

    eyes.left.blink  = false;
    eyes.right.blink = false;
    return eyes;
    
};

BlinkDetector.prototype.setBlinkWindow = function ( value ) {

    //TODO MISSING METHOD
    if ( value > 0 ) {
        //    if (Util.isInt(value) && value > 0) {
        this.blinkWindow = value;
    }
    return this;

};

export { BlinkDetector };
