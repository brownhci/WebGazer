//Data Window class
//operates like an array but 'wraps' data around to keep the array at a fixed windowSize
/**
 * DataWindow class - Operates like an array, but 'wraps' data around to keep the array at a fixed windowSize
 * @param {Number} windowSize - defines the maximum size of the window
 * @param {Array} data - optional data to seed the DataWindow with
 **/
var DataWindow = function (windowSize, data) {
    this.data       = [];
    this.windowSize = windowSize;
    this.index      = 0;
    this.length     = 0;
    if (data) {
        this.data   = data.slice(data.length - windowSize, data.length);
        this.length = this.data.length;
    }
};

/**
 * [push description]
 * @param  {*} entry - item to be inserted. It either grows the DataWindow or replaces the oldest item
 * @return {DataWindow} this
 */
DataWindow.prototype.push = function (entry) {
    if (this.data.length < this.windowSize) {
        this.data.push(entry);
        this.length = this.data.length;
        return this;
    }

    //replace oldest entry by wrapping around the DataWindow
    this.data[this.index] = entry;
    this.index            = (this.index + 1) % this.windowSize;
    return this;
};

/**
 * Get the element at the ind position by wrapping around the DataWindow
 * @param  {Number} ind index of desired entry
 * @return {*}
 */
DataWindow.prototype.get = function (ind) {
    return this.data[this.getTrueIndex(ind)];
};

/**
 * Gets the true this.data array index given an index for a desired element
 * @param {Number} ind - index of desired entry
 * @return {Number} index of desired entry in this.data
 */
DataWindow.prototype.getTrueIndex = function (ind) {
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
DataWindow.prototype.addAll = function (data) {
    for (var i = 0; i < data.length; i++) {
        this.push(data[i]);
    }
};

export {DataWindow};
