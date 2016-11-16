
/**
 * Constructor for BlinkDetector
 * @param blinkWindow
 * @constructor
 */
function BlinkDetector(blinkWindow) {
    //TODO use DataWindow instead
    this.blinkData = [];
    //determines number of previous eyeObj to hold onto
    this.blinkWindow = blinkWindow || 8;

    //cycles through to replace oldest entry
    this.blinkWindowIndex = 0;
}

BlinkDetector.prototype.constructor = BlinkDetector;

BlinkDetector.prototype.detectBlink = function(eyesObj) {
        if (!eyesObj) {
            return eyesObj;
        }
        if (this.blinkData.length < this.blinkWindow) {
            this.blinkData.push(eyesObj);
            eyesObj.left.blink = false;
            eyesObj.right.blink = false;
            return eyesObj;
        }

        //replace oldest entry
        this.blinkData[this.blinkWindowIndex] = eyesObj;
        this.blinkWindowIndex = (this.blinkWindowIndex + 1) % this.blinkWindow;

        //TODO detect if current eyeObj is different from eyeObj in blinkData;

        eyesObj.left.blink = false;
        eyesObj.right.blink = false;
        return eyesObj;
    };

BlinkDetector.prototype.setBlinkWindow = function(value) {
    if (webgazer.utils.isInt(value) && value > 0) {
        this.blinkWindow = value;
    }
    return this;
};

export { BlinkDetector };
