(function() {

    self.gazer = self.gazer || {};
    self.gazer.util = self.gazer.util || {};
    self.gazer.mat = self.gazer.mat || {};


    self.gazer.util.resizeWidth = 10;
    self.gazer.util.resizeHeight = 6;


    /**
     * Eye class, represents an eye patch detected in the video stream
     * @param {ImageData} patch - the image data corresponding to an eye
     * @param {number} imagex - x-axis offset from the top-left corner of the video canvas
     * @param {number} imagey - y-axis offset from the top-left corner of the video canvas
     * @param {number} width  - width of the eye patch
     * @param {number} height - height of the eye patch
     * @param {array} gray - grayscaled and normalized pixels
     */
    self.gazer.util.Eye = function(patch, imagex, imagey, width, height, gray) {
        this.patch = patch;
        this.imagex = imagex;
        this.imagey = imagey;
        this.width = width;
        this.height = height;
        this.gray = gray;
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
     * @todo  Rename
     * Resizes 
     * @param  {[type]} eyesObj [description]
     * @return {[type]}         [description]
     */
    self.gazer.util.getEyeFeats = function(eyesObj) {
        var resizedLeft = this.resizeEye(eyesObj.left, this.resizeWidth, this.resizeHeight);
        var resizedright = this.resizeEye(eyesObj.right, this.resizeWidth, this.resizeHeight);

        var leftGray = this.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = this.grayscale(resizedright.data, resizedright.width, resizedright.height);

        //TODO either move objectdetect into gazer namespace or re-implement
        var histLeft = [];
        objectdetect.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        objectdetect.equalizeHistogram(rightGray, 5, histRight);

        leftGrayArray = Array.prototype.slice.call(histLeft);
        rightGrayArray = Array.prototype.slice.call(histRight);

        eyesObj.left.gray = leftGrayArray;
        eyesObj.right.gray = rightGrayArray;
        //leftGrayArray.concat(rightGrayArray);

        return eyesObj;
    }


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



    /**From https://github.com/timsuchanek/matrix-correlation
    *
    * TODO: Properly attribute and license
    * 
    * /
    

    // /**
    //   Zero Mean Normalized Cross-Correlation (ZNCC) of two matrices.
    // */
    // self.gazer.util.ZNCC = function(A, B) {
    //   var mean_A = this.mean(A);
    //   var mean_B = this.mean(B);

    //   var numerator = 0;
    //   var denumerator = 0;
    //   var denumerator = 0;
    //   var denumerator_2 = 0;
      
    //   this.overall(A, B, function(a, b) {
    //     numerator += (a - mean_A) * (b - mean_B);
    //     denumerator += (a - mean_A) * (a - mean_A);
    //     denumerator_2 += (b - mean_B) * (b - mean_B);
    //   });

    //   denumerator = Math.sqrt(denumerator * denumerator_2);

    //   return numerator / denumerator;
    // }

    // self.gazer.util.mean = function(A) {
    //   var sum = 0;
    //   var m = A[0].length;
    //   var n = A.length;

    //   for (var i = 0; i < m; i++) {
    //     for (var j = 0; j < n; j++) {
    //       sum += A[i][j];
    //     }
    //   }
      
    //   return sum / (m * n);
    // }

    // self.gazer.util.overall = function(A, B, cb) {
    //   var m = A[0].length == B[0].length ? A[0].length : null;
    //   var n = A.length == B.length ? A.length : null;
      
    //   if (m === null || n === null) {
    //     throw new Error("Matrices don't have the same size.");
    //   }

    //   for (var i = 0; i < m; i++) {
    //     for (var j = 0; j < n; j++) {
    //       cb(A[i][j], B[i][j]);
    //     }
    //   }
    // }
    // 
        self.gazer.util.ZNCC = function(A, B) {
      var mean_A = this.mean(A);
      var mean_B = this.mean(B);

      var numerator = 0;
      var denumerator = 0;
      var denumerator = 0;
      var denumerator_2 = 0;
      
      this.overall(A, B, function(a, b) {
        numerator += (a - mean_A) * (b - mean_B);
        denumerator += (a - mean_A) * (a - mean_A);
        denumerator_2 += (b - mean_B) * (b - mean_B);
      });

      denumerator = Math.sqrt(denumerator * denumerator_2);

      return numerator / denumerator;
    }

    self.gazer.util.mean = function(A) {
        if(A.length>0)
        {
            var total = 0;
            A.forEach(function(val) {
                total += val;
            });
          return total/A.length;
        }
        return null;
    }

    self.gazer.util.overall = function(A, B, cb) {      
      if (A.length!=B.length) {
        throw new Error("Matrices don't have the same size.");
      }

      for (var i = 0; i < A.length; i++) {
          cb(A[i], B[i]);
        }
    }

    function debugBoxWrite(para, stats) {
        var str = '';
        for (var key in stats) {
            str += key + ': ' + stats[key] + '\n';
        }
        para.innerText = str;
    }

    self.gazer.util.DebugBox = function(interval) {
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
    }

    self.gazer.util.DebugBox.prototype.set = function(key, value) {
        this.stats[key] = value;
    }

    self.gazer.util.DebugBox.prototype.inc = function(key, incBy, init) {
        if (!this.stats[key]) {
            this.stats[key] = init || 0;
        }
        this.stats[key] += incBy || 1;
    }

    self.gazer.util.DebugBox.prototype.addButton = function(name, func) {
        if (!this.buttons[name]) {
            this.buttons[name] = document.createElement('button');
            this.div.appendChild(this.buttons[name]);
        }
        var button = this.buttons[name];
        this.buttons[name] = button;
        button.addEventListener('click', func);
        button.innerText = name;
    }

    self.gazer.util.DebugBox.prototype.show = function(name, func) {
        if (!this.canvas[name]) {
            this.canvas[name] = document.createElement('canvas');
            this.div.appendChild(this.canvas[name]);
        }
        var canvas = this.canvas[name];
        canvas.getContext('2d').clearRect(0,0, canvas.width, canvas.height);
        func(canvas);
    }
}());
