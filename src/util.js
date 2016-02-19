(function(window) {

window.gazer = window.gazer || {};
gazer.util = gazer.util || {};
gazer.mat = gazer.mat || {};

//Type test functions
gazer.util.isInt;

gazer.util.isNaN;

gazer.util.isString;

//Eye class

gazer.util.Eye = function(patch, imagex, imagey, width, height) {
    this.patch = patch;
    this.imagex = imagex;
    this.imagey = imagey;
    this.width = width;
    this.height = height;
}


//Data Window class
//operates like an array but 'wraps' data around to keep the array at a fixed windowSize
gazer.util.DataWindow = function(windowSize) {
    this.data = [];
    this.windowSize = windowSize;
    this.index = 0;
    this.length = 0;
}

gazer.util.DataWindow.prototype.push = function(entry) {
    if (this.data.length < this.windowSize) {
        this.data.push(entry);
        this.length = this.data.length;
        return entry;
    }

    //replace oldest entry
    this.data[this.index] = entry;
    this.index = (this.index + 1) % this.windowSize;
}

gazer.util.DataWindow.prototype.get = function(ind) {
    if (this.data.length < this.windowSize) {
        return this.data[ind];
    } else {
        //wrap around ind so that we can traverse from oldest to newest
        return this.data[(ind + this.index) % this.windowSize];
    }
}

gazer.util.DataWindow.prototype.addAll = function(data) {
    //TODO use slice instead?
    for (var i = 0; i < data.length; i++) {
        this.push(data[i]);
    }
}


//Helper functions
gazer.util.grayscale = function(imageData, imageWidth, imageHeight){
    //TODO either move tracking into gazer namespace or re-implement function
    return tracking.Image.grayscale(imageData, imageWidth, imageHeight, false);
}

gazer.util.resizeEye = function(eye) {

    //TODO this seems like it could be done in just one painting to a canvas

    var canvas = document.createElement('canvas');
    canvas.width = eye.width;
    canvas.height = eye.height;

    canvas.getContext('2d').putImageData(eye.patch,0,0);

    var tempCanvas = document.createElement('canvas');

    tempCanvas.width = resizeWidth;
    tempCanvas.height = resizeWidth;

    // save your canvas into temp canvas
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight);

    return tempCanvas.getContext('2d').getImageData(0, 0, resizeWidth, resizeHeight);
}



/**
 * Checks if the prediction is within the boundaries of the viewport and constrains it
 * @param  {array} prediction [x,y] predicted gaze coordinates
 * @return {array} constrained coordinates
 */
gazer.util.bound = function(prediction){
    if(prediction.x < 0)
        prediction.x = 0;
    if(prediction.y < 0)
        prediction.y = 0;
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    if(prediction.x > w){
        prediction.x = w;
    }

    if(prediction.y > h)
    {
        prediction.y = h;
    }
    return prediction;
}

}(window));
