(function(window) {

    window.gazer = window.gazer || {};

self.gazer.BlinkDetector = function(blinkWindow) {
    this.blinkData = new gazer.util.DataWindow(blinkWindow || 8);
};

gazer.BlinkDetector.prototype.detectBlink = function(eyesObj) {
    if (!eyesObj) {
        return eyesObj;
    }

    this.blinkData.push(eyesObj);

    var leftAverage = [];
    var rightAverage = [];

    for(var i=0; i<gazer.util.resizeWidth*gazer.util.resizeHeight; i++){
        leftAverage[i] = 0;
        rightAverage[i] = 0;
        for(var j=0; j<this.blinkData.data.length; j++)
        {
            if(typeof this.blinkData.data[j].left.gray!== "undefined"){
                leftAverage[i] += this.blinkData.data[j].left.gray[i];
            }            
            if(typeof this.blinkData.data[j].right.gray!== "undefined"){
                rightAverage[i] += this.blinkData.data[j].right.gray[i];
            }

        }
        leftAverage[i]/=this.blinkData.data.length;
        rightAverage[i]/=this.blinkData.data.length;
    }

    if(typeof this.blinkData.data[this.blinkData.data.length-1].left.gray!== "undefined"){
        var leftBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].left.gray, leftAverage));
        if(leftBlink<0.8){
            console.log("left blink");
        }
    }
    if(typeof this.blinkData.data[this.blinkData.data.length-1].right.gray!== "undefined"){
        var rightBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].right.gray, rightAverage));
        if(rightBlink<0.8){
            console.log("right blink");
        }
    }

    eyesObj.left.blink = false;
    eyesObj.right.blink = false;
    return eyesObj;
}


}(window));
