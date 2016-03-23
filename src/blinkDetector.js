(function(window) {

    window.gazer = window.gazer || {};
    gazer.util = gazer.util || {};

self.gazer.BlinkDetector = function(blinkWindow) {
    this.blinkData = new gazer.util.DataWindow(blinkWindow || 8);
    this.debug = new gazer.util.DebugBox();
};

gazer.BlinkDetector.prototype.detectBlink = function(eyesObj) {
    if (!eyesObj) {
        return eyesObj;
    }

    this.blinkData.push(eyesObj);

    var leftAverage = [];
    var rightAverage = [];

    // for(var i=0; i<gazer.util.resizeWidth*gazer.util.resizeHeight; i++){
    //     leftAverage[i] = 0;
    //     rightAverage[i] = 0;
    //     for(var j=0; j<this.blinkData.data.length; j++)
    //     {
    //         if(typeof this.blinkData.data[j].left.gray!== "undefined"){
    //             leftAverage[i] += this.blinkData.data[j].left.gray[i];
    //         }            
    //         if(typeof this.blinkData.data[j].right.gray!== "undefined"){
    //             rightAverage[i] += this.blinkData.data[j].right.gray[i];
    //         }

    //     }
    //     leftAverage[i]/=this.blinkData.data.length;
    //     rightAverage[i]/=this.blinkData.data.length;
    // }
    var groundedI= gazer.util.resizeWidth*gazer.util.resizeHeight/2-1;
    for(var i=gazer.util.resizeWidth*gazer.util.resizeHeight/2-1; i<gazer.util.resizeWidth*gazer.util.resizeHeight; i++){
        leftAverage[i-groundedI] = 0;
        rightAverage[i-groundedI] = 0;
        for(var j=0; j<this.blinkData.data.length; j++)
        {
            if(typeof this.blinkData.data[j].left.gray!== "undefined"){
                leftAverage[i-groundedI] += this.blinkData.data[j].left.gray[i];
            }            
            if(typeof this.blinkData.data[j].right.gray!== "undefined"){
                rightAverage[i-groundedI] += this.blinkData.data[j].right.gray[i];
            }

        }
        leftAverage[i-groundedI]/=this.blinkData.data.length;
        rightAverage[i-groundedI]/=this.blinkData.data.length;
    }

    // if(typeof this.blinkData.data[this.blinkData.data.length-1].left.gray!== "undefined"){
    //     var leftBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].left.gray, leftAverage));
    //     if(leftBlink<0.6){
    //         console.log("left blink");
    //         this.debug.show('left blink', function(canvas) {
    //             canvas.getContext('2d').putImageData(eyesObj.left.patch,0,0);
    //         })
    //     }
    // }
    // if(typeof this.blinkData.data[this.blinkData.data.length-1].right.gray!== "undefined"){
    //     var rightBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].right.gray, rightAverage));
    //     if(rightBlink<0.6){
    //         console.log("right blink");
    //         this.debug.show('right blink', function(canvas) {
    //             canvas.getContext('2d').putImageData(eyesObj.right.patch,0,0);
    //         })
    //     }
    // }

    if(typeof this.blinkData.data[this.blinkData.data.length-1].left.gray!== "undefined"){
        var leftBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].left.gray.slice(gazer.util.resizeWidth*gazer.util.resizeHeight/2-1), leftAverage));
        var leftBlink = Math.abs(gazer.util.mean(this.blinkData.data[this.blinkData.data.length-1].left.gray.slice(gazer.util.resizeWidth*gazer.util.resizeHeight/2-1))- gazer.util.mean(leftAverage))/255;
        if(leftBlink<0.8){
            console.log("left blink");
            this.debug.show('left blink', function(canvas) {
                //canvas.getContext('2d').putImageData(eyesObj.left.patch,0,0);
            })
        }
    }
    if(typeof this.blinkData.data[this.blinkData.data.length-1].right.gray!== "undefined"){
        var rightBlink = (gazer.util.ZNCC(this.blinkData.data[this.blinkData.data.length-1].right.gray.slice(gazer.util.resizeWidth*gazer.util.resizeHeight/2-1),rightAverage));
        if(rightBlink<0.8){
            console.log("right blink");
            this.debug.show('right blink', function(canvas) {
              //  canvas.getContext('2d').putImageData(eyesObj.right.patch,0,0);
            })
        }
    }
    eyesObj.left.blink = false;
    eyesObj.right.blink = false;
    return eyesObj;
}


}(window));
