(function() {

    self.gazer = self.gazer || {};
    self.gazer.util = self.gazer.util || {};
    self.gazer.mat = self.gazer.mat || {};


    /**
     * Eye class, represents an eye patch detected in the video stream
     * @param {ImageData} patch - the image data corresponding to an eye
     * @param {number} imagex - x-axis offset from the top-left corner of the video canvas
     * @param {number} imagey - y-axis offset from the top-left corner of the video canvas
     * @param {number} width  - width of the eye patch
     * @param {number} height - height of the eye patch
     */
    self.gazer.util.Eye = function(patch, imagex, imagey, width, height) {
        this.patch = patch;
        this.imagex = imagex;
        this.imagey = imagey;
        this.width = width;
        this.height = height;
    }


    //Data Window class
    //operates like an array but 'wraps' data around to keep the array at a fixed windowSize
    /**
     * DataWindow class - Operates like an array, but 'wraps' data around to keep the array at a fixed windowSize
     * @param {number} windowSize - defines the maximum size of the window
     * @param {data} [data] - optional data to seed the DataWindow with
     **/
    self.gazer.util.DataWindow = function(windowSize, data) {
        this.data = [];
        this.windowSize = windowSize;
        this.index = 0;
        this.length = 0;
        if(data){
            this.data = data.slice(data.length-windowSize,data.length);
            this.length = this.data.length;
        }
    }

    /**
     * [push description]
     * @param  {Any} entry - item to be inserted. It either grows the DataWindow or replaces the oldest item
     * @return {DataWindow} this
     */
    self.gazer.util.DataWindow.prototype.push = function(entry) {
        if (this.data.length < this.windowSize) {
            this.data.push(entry);
            this.length = this.data.length;
            return this;
        }

        //replace oldest entry by wrapping around the DataWindow
        this.data[this.index] = entry;
        this.index = (this.index + 1) % this.windowSize;
        return this;
    }

    /**
     * Get the element at the ind position by wrapping around the DataWindow
     * @param  {number} ind index of desired entry
     * @return {Any} 
     */
    self.gazer.util.DataWindow.prototype.get = function(ind) {
        if (this.data.length < this.windowSize) {
            return this.data[ind];
        } else {
            //wrap around ind so that we can traverse from oldest to newest
            return this.data[(ind + this.index) % this.windowSize];
        }
    }

    /**
     * Append all the contents of data
     * @param {array} data - to be inserted 
     */
    self.gazer.util.DataWindow.prototype.addAll = function(data) {
        for (var i = 0; i < data.length; i++) {
            this.push(data[i]);
        }
    }


    //Helper functions
    /**
     * Grayscales an image patch. Can be used for the whole canvas, detected face, detected eye, etc.
     * @param  {ImageData} imageData - image data to be grayscaled
     * @param  {number} imageWidth  - width of image data to be grayscaled
     * @param  {number} imageHeight - height of image data to be grayscaled
     * @return {ImageData} grayscaledImage 
     */
    self.gazer.util.grayscale = function(imageData, imageWidth, imageHeight){
        //TODO either move tracking into gazer namespace or re-implement function
        return tracking.Image.grayscale(imageData, imageWidth, imageHeight, false);
    }

    /**
     * Gets an Eye object and resizes it to the desired resolution
     * @param  {gazer.util.Eye} eye - patch to be resized
     * @param  {number} resizeWidth - desired width
     * @param  {number} resizeHeight - desired height
     * @return {gazer.util.Eye} resized eye patch
     */
    self.gazer.util.resizeEye = function(eye, resizeWidth, resizeHeight) {

        //TODO this seems like it could be done in just one painting to a canvas

        var canvas = document.createElement('canvas');
        canvas.width = eye.width;
        canvas.height = eye.height;

        canvas.getContext('2d').putImageData(eye.patch,0,0);

        var tempCanvas = document.createElement('canvas');

        tempCanvas.width = resizeWidth;
        tempCanvas.height = resizeHeight;

        // save the canvas into temp canvas
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight);

        return tempCanvas.getContext('2d').getImageData(0, 0, resizeWidth, resizeHeight);
    }




    /**
     * Checks if the prediction is within the boundaries of the viewport and constrains it
     * @param  {array} prediction [x,y] predicted gaze coordinates
     * @return {array} constrained coordinates
     */
    self.gazer.util.bound = function(prediction){
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

}());