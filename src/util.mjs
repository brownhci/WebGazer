import mat from './mat';
import params from './params';
import numeric from 'numeric';

const util = {};


var resizeWidth = 10;
var resizeHeight = 6;

//not used !?
/**
 * Eye class, represents an eye patch detected in the video stream
 * @param {ImageData} patch - the image data corresponding to an eye
 * @param {Number} imagex - x-axis offset from the top-left corner of the video canvas
 * @param {Number} imagey - y-axis offset from the top-left corner of the video canvas
 * @param {Number} width  - width of the eye patch
 * @param {Number} height - height of the eye patch
 */
util.Eye = function(patch, imagex, imagey, width, height) {
    this.patch = patch;
    this.imagex = imagex;
    this.imagey = imagey;
    this.width = width;
    this.height = height;
};

/**
 * Compute eyes size as gray histogram
 * @param {Object} eyes - The eyes where looking for gray histogram
 * @returns {Array.<T>} The eyes gray level histogram
 */
util.getEyeFeats = function(eyes) {
    var resizedLeft = this.resizeEye(eyes.left, resizeWidth, resizeHeight);
    var resizedRight = this.resizeEye(eyes.right, resizeWidth, resizeHeight);
    
    var leftGray = this.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
    var rightGray = this.grayscale(resizedRight.data, resizedRight.width, resizedRight.height);

    var histLeft = [];
    this.equalizeHistogram(leftGray, 5, histLeft);
    var histRight = [];
    this.equalizeHistogram(rightGray, 5, histRight);

    var leftGrayArray = Array.prototype.slice.call(histLeft);
    var rightGrayArray = Array.prototype.slice.call(histRight);

    return histLeft.concat(histRight);
}
//Data Window class
//operates like an array but 'wraps' data around to keep the array at a fixed windowSize
/**
 * DataWindow class - Operates like an array, but 'wraps' data around to keep the array at a fixed windowSize
 * @param {Number} windowSize - defines the maximum size of the window
 * @param {Array} data - optional data to seed the DataWindow with
 **/
util.DataWindow = function(windowSize, data) {
    this.data = [];
    this.windowSize = windowSize;
    this.index = 0;
    this.length = 0;
    if(data){
        this.data = data.slice(data.length-windowSize,data.length);
        this.length = this.data.length;
    }
};

/**
 * [push description]
 * @param  {*} entry - item to be inserted. It either grows the DataWindow or replaces the oldest item
 * @return {DataWindow} this
 */
util.DataWindow.prototype.push = function(entry) {
    if (this.data.length < this.windowSize) {
        this.data.push(entry);
        this.length = this.data.length;
        return this;
    }

    //replace oldest entry by wrapping around the DataWindow
    this.data[this.index] = entry;
    this.index = (this.index + 1) % this.windowSize;
    return this;
};

/**
 * Get the element at the ind position by wrapping around the DataWindow
 * @param  {Number} ind index of desired entry
 * @return {*}
 */
util.DataWindow.prototype.get = function(ind) {
    return this.data[this.getTrueIndex(ind)];
};

/**
 * Gets the true this.data array index given an index for a desired element
 * @param {Number} ind - index of desired entry
 * @return {Number} index of desired entry in this.data
 */
util.DataWindow.prototype.getTrueIndex = function(ind) {
    if (this.data.length < this.windowSize) {
        return ind;
    } else {
        //wrap around ind so that we can traverse from oldest to newest
        return (ind + this.index) % this.windowSize;
    }
};

/**
 * Append all the contents of data
 * @param {Array} data - to be inserted
 */
util.DataWindow.prototype.addAll = function(data) {
    for (var i = 0; i < data.length; i++) {
        this.push(data[i]);
    }
};


//Helper functions
/**
 * Grayscales an image patch. Can be used for the whole canvas, detected face, detected eye, etc.
 *
 * Code from tracking.js by Eduardo Lundgren, et al.
 * https://github.com/eduardolundgren/tracking.js/blob/master/src/tracking.js
 *
 * Software License Agreement (BSD License) Copyright (c) 2014, Eduardo A. Lundgren Melo. All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * The name of Eduardo A. Lundgren Melo may not be used to endorse or promote products derived from this software without specific prior written permission of Eduardo A. Lundgren Melo.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @param  {Array} pixels - image data to be grayscaled
 * @param  {Number} width  - width of image data to be grayscaled
 * @param  {Number} height - height of image data to be grayscaled
 * @return {Array} grayscaledImage
 */
util.grayscale = function(pixels, width, height){
    var gray = new Uint8ClampedArray(pixels.length >> 2);
    var p = 0;
    var w = 0;
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            var value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
            gray[p++] = value;

            w += 4;
        }
    }
    return gray;
};

/**
 * Increase contrast of an image.
 *
 * Code from Martin Tschirsich, Copyright (c) 2012.
 * https://github.com/mtschirs/js-objectdetect/blob/gh-pages/js/objectdetect.js
 *
 * @param {Array} src - grayscale integer array
 * @param {Number} step - sampling rate, control performance
 * @param {Array} dst - array to hold the resulting image
 */
util.equalizeHistogram = function(src, step, dst) {
    var srcLength = src.length;
    if (!dst) dst = src;
    if (!step) step = 5;

    // Compute histogram and histogram sum:
    var hist = Array(256).fill(0);

    for (var i = 0; i < srcLength; i += step) {
        ++hist[src[i]];
    }

    // Compute integral histogram:
    var norm = 255 * step / srcLength,
        prev = 0;
    for (var i = 0; i < 256; ++i) {
        var h = hist[i];
        prev = h += prev;
        hist[i] = h * norm; // For non-integer src: ~~(h * norm + 0.5);
    }

    // Equalize image:
    for (var i = 0; i < srcLength; ++i) {
        dst[i] = hist[src[i]];
    }
    return dst;
};

//not used !?
util.threshold = function(data, threshold) {
    for (let i = 0; i < data.length; i++) {
        data[i] = (data[i] > threshold) ? 255 : 0;
    }
    return data;
};

//not used !?
util.correlation = function(data1, data2) {
    const length = Math.min(data1.length, data2.length);
    let count = 0;
    for (let i = 0; i < length; i++) {
        if (data1[i] === data2[i]) {
            count++;
        }
    }
    return count / Math.max(data1.length, data2.length);
};

/**
 * Gets an Eye object and resizes it to the desired resolution
 * @param  {webgazer.util.Eye} eye - patch to be resized
 * @param  {Number} resizeWidth - desired width
 * @param  {Number} resizeHeight - desired height
 * @return {webgazer.util.Eye} resized eye patch
 */
util.resizeEye = function(eye, resizeWidth, resizeHeight) {

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
};

/**
 * Checks if the prediction is within the boundaries of the viewport and constrains it
 * @param  {Array} prediction [x,y] - predicted gaze coordinates
 * @return {Array} constrained coordinates
 */
util.bound = function(prediction){
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
};

//not used !?
/**
 * Write statistics in debug paragraph panel
 * @param {HTMLElement} para - The <p> tag where write data
 * @param {Object} stats - The stats data to output
 */
function debugBoxWrite(para, stats) {
    var str = '';
    for (var key in stats) {
        str += key + ': ' + stats[key] + '\n';
    }
    para.innerText = str;
}

//not used !?
/**
 * Constructor of DebugBox object,
 * it insert an paragraph inside a div to the body, in view to display debug data
 * @param {Number} interval - The log interval
 * @constructor
 */
util.DebugBox = function(interval) {
    this.para = document.createElement('p');
    this.div = document.createElement('div');
    this.div.appendChild(this.para);
    document.body.appendChild(this.div);

    this.buttons = {};
    this.canvas = {};
    this.stats = {};
    var updateInterval = interval || 300;
    (function(localThis) {
        setInterval(function() {
            debugBoxWrite(localThis.para, localThis.stats);
        }, updateInterval);
    }(this));
};

//not used !?
/**
 * Add stat data for log
 * @param {String} key - The data key
 * @param {*} value - The value
 */
util.DebugBox.prototype.set = function(key, value) {
    this.stats[key] = value;
};

//not used !?
/**
 * Initialize stats in case where key does not exist, else
 * increment value for key
 * @param {String} key - The key to process
 * @param {Number} incBy - Value to increment for given key (default: 1)
 * @param {Number} init - Initial value in case where key does not exist (default: 0)
 */
util.DebugBox.prototype.inc = function(key, incBy, init) {
    if (!this.stats[key]) {
        this.stats[key] = init || 0;
    }
    this.stats[key] += incBy || 1;
};

//not used !?
/**
 * Create a button and register the given function to the button click event
 * @param {String} name - The button name to link
 * @param {Function} func - The onClick callback
 */
util.DebugBox.prototype.addButton = function(name, func) {
    if (!this.buttons[name]) {
        this.buttons[name] = document.createElement('button');
        this.div.appendChild(this.buttons[name]);
    }
    var button = this.buttons[name];
    this.buttons[name] = button;
    button.addEventListener('click', func);
    button.innerText = name;
};

//not used !?
/**
 * Search for a canvas elemenet with name, or create on if not exist.
 * Then send the canvas element as callback parameter.
 * @param {String} name - The canvas name to send/create
 * @param {Function} func - The callback function where send canvas
 */
util.DebugBox.prototype.show = function(name, func) {
    if (!this.canvas[name]) {
        this.canvas[name] = document.createElement('canvas');
        this.div.appendChild(this.canvas[name]);
    }
    var canvas = this.canvas[name];
    canvas.getContext('2d').clearRect(0,0, canvas.width, canvas.height);
    func(canvas);
};

export default util;
