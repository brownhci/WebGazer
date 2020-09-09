/*!
 * 
 *  WebGazer.js: Scalable Webcam EyeTracking Using User Interactions
 *  Copyright (c) 2016-2020, Brown HCI Group 
 *  Licensed under GPLv3. Companies with a valuation of less than $1M can use WebGazer.js under LGPLv3.
 *  
 */
module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		0: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	var jsonpArray = window["webpackJsonpwebgazer"] = window["webpackJsonpwebgazer"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([90,1]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 63:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 64:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 75:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 78:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 79:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 90:
/***/ (function(__webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/@tensorflow/tfjs/dist/tf.node.js
var tf_node = __webpack_require__(60);

// EXTERNAL MODULE: ./node_modules/regression/dist/regression.js
var regression = __webpack_require__(80);

// CONCATENATED MODULE: ./src/params.mjs
const params = {
  moveTickSize: 50,
  videoElementId: 'webgazerVideoFeed',
  videoElementCanvasId: 'webgazerVideoCanvas',
  faceOverlayId: 'webgazerFaceOverlay',
  faceFeedbackBoxId: 'webgazerFaceFeedbackBox',
  gazeDotId: 'webgazerGazeDot',
  videoViewerWidth: 320,
  videoViewerHeight: 240,
  faceFeedbackBoxRatio: 0.66,
  // View options
  showVideo: true,
  mirrorVideo: true,
  showFaceOverlay: true,
  showFaceFeedbackBox: true,
  showGazeDot: true,
  camConstraints: { video: { width: { min: 320, ideal: 640, max: 1920 }, height: { min: 240, ideal: 480, max: 1080 }, facingMode: "user" } },
  dataTimestep: 50,
  showVideoPreview: false,
  // Whether or not to store accuracy eigenValues, used by the calibration example file
  storingPoints: false,
};

/* harmony default export */ var src_params = (params);

// CONCATENATED MODULE: ./src/dom_util.mjs
// helper functions

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
      return window.setTimeout(callback, 1000/60);
    };
})();

/**
 * Provides cancelRequestAnimationFrame in a cross browser way.
 */
window.cancelRequestAnimFrame = (function() {
  return window.cancelCancelRequestAnimationFrame ||
    window.webkitCancelRequestAnimationFrame ||
    window.mozCancelRequestAnimationFrame ||
    window.oCancelRequestAnimationFrame ||
    window.msCancelRequestAnimationFrame ||
    window.clearTimeout;
})();

// EXTERNAL MODULE: ./node_modules/localforage/dist/localforage.js
var localforage = __webpack_require__(32);

// EXTERNAL MODULE: ./node_modules/@tensorflow-models/facemesh/dist/index.js
var dist = __webpack_require__(59);

// CONCATENATED MODULE: ./src/facemesh.mjs

/**
 * Constructor of TFFaceMesh object
 * @constructor
 * */
const TFFaceMesh = function() {
  //Backend options are webgl, wasm, and CPU.
  //For recent laptops WASM is better than WebGL.
  //TODO: This hack makes loading the model block the UI. We should fix that
  // this.model = (async () => { return await facemesh.load({"maxFaces":1}) })();
  this.model = dist.load({"maxFaces":1});
  this.predictionReady = false;
};

// Global variable for face landmark positions array
TFFaceMesh.prototype.positionsArray = null;

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
 * @param  {Number} width - of imageCanvas
 * @param  {Number} height - of imageCanvas
 * @return {Object} the two eye-patches, first left, then right eye
 */
TFFaceMesh.prototype.getEyePatches = async function(imageCanvas, width, height) {

  if (imageCanvas.width === 0) {
    return null;
  }

  // Load the MediaPipe facemesh model.
  const model = await this.model;

  // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
  // array of detected faces from the MediaPipe graph.
  const predictions = await model.estimateFaces(imageCanvas);

  if (predictions.length == 0){
    return false;
  }

  // Save positions to global variable
  this.positionsArray = predictions[0].scaledMesh;
  const positions = this.positionsArray;

  // Fit the detected eye in a rectangle. [20200626 xk] not clear which approach is better
  // https://raw.githubusercontent.com/tensorflow/tfjs-models/master/facemesh/mesh_map.jpg

  // // Maintains a relatively stable shape of the bounding box at the cost of cutting off parts of
  // // the eye when the eye is tilted.
  // var leftOriginX = Math.round(positions[130][0]);
  // var leftOriginY = Math.round(positions[27][1]);
  // var leftWidth = Math.round(positions[243][0] - leftOriginX);
  // var leftHeight = Math.round(positions[23][1] - leftOriginY);
  // var rightOriginX = Math.round(positions[463][0]);
  // var rightOriginY = Math.round(positions[257][1]);
  // var rightWidth = Math.round(positions[359][0] - rightOriginX);
  // var rightHeight = Math.round(positions[253][1] - rightOriginY);

  // Won't really cut off any parts of the eye, at the cost of warping the shape (i.e. height/
  // width ratio) of the bounding box.
  var leftOriginX = Math.round(Math.min(positions[247][0], positions[130][0], positions[25][0]));
  var leftOriginY = Math.round(Math.min(positions[247][1], positions[27][1], positions[190][1]));
  var leftWidth = Math.round(Math.max(positions[190][0], positions[243][0], positions[233][0]) - leftOriginX);
  var leftHeight = Math.round(Math.max(positions[25][1], positions[23][1], positions[112][1]) - leftOriginY);
  var rightOriginX = Math.round(Math.min(positions[414][0], positions[463][0], positions[453][0]));
  var rightOriginY = Math.round(Math.min(positions[414][1], positions[257][1], positions[467][1]));
  var rightWidth = Math.round(Math.max(positions[467][0], positions[359][0], positions[255][0]) - rightOriginX);
  var rightHeight = Math.round(Math.max(positions[341][1], positions[253][1], positions[255][1]) - rightOriginY);

  if (leftWidth === 0 || rightWidth === 0){
    console.log('an eye patch had zero width');
    return null;
  }

  if (leftHeight === 0 || rightHeight === 0){
    console.log('an eye patch had zero height');
    return null;
  }

  // Start building object to be returned
  var eyeObjs = {};

  var leftImageData = imageCanvas.getContext('2d').getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight);
  eyeObjs.left = {
    patch: leftImageData,
    imagex: leftOriginX,
    imagey: leftOriginY,
    width: leftWidth,
    height: leftHeight
  };

  var rightImageData = imageCanvas.getContext('2d').getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight);
  eyeObjs.right = {
    patch: rightImageData,
    imagex: rightOriginX,
    imagey: rightOriginY,
    width: rightWidth,
    height: rightHeight
  };

  this.predictionReady = true;

  return eyeObjs;
};

/**
 * Returns the positions array corresponding to the last call to getEyePatches.
 * Requires that getEyePatches() was called previously, else returns null.
 */
TFFaceMesh.prototype.getPositions = function () {
  return this.positionsArray;
}

/**
 * Reset the tracker to default values
 */
TFFaceMesh.prototype.reset = function(){
  console.log( "Unimplemented; Tracking.js has no obvious reset function" );
}

/**
 * Draw TF_FaceMesh_Overlay
 */
TFFaceMesh.prototype.drawFaceOverlay= function(ctx, keypoints){
  // If keypoints is falsy, don't do anything
  if (keypoints) {
    ctx.fillStyle = '#32EEDB';
    ctx.strokeStyle = '#32EEDB';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < keypoints.length; i++) {
      const x = keypoints[i][0];
      const y = keypoints[i][1];

      ctx.beginPath();
      ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/**
 * The TFFaceMesh object name
 * @type {string}
 */
TFFaceMesh.prototype.name = 'TFFaceMesh';

/* harmony default export */ var facemesh = (TFFaceMesh);

// CONCATENATED MODULE: ./src/mat.mjs
const mat = {};
/**
 * Transposes an mxn array
 * @param {Array.<Array.<Number>>} matrix - of 'M x N' dimensionality
 * @return {Array.<Array.<Number>>} transposed matrix
 */
mat.transpose = function(matrix){
    var m = matrix.length;
    var n = matrix[0].length;
    var transposedMatrix = new Array(n);

    for (var i = 0; i < m; i++){
        for (var j = 0; j < n; j++){
            if (i === 0) transposedMatrix[j] = new Array(m);
            transposedMatrix[j][i] = matrix[i][j];
        }
    }

    return transposedMatrix;
};

/**
 * Get a sub-matrix of matrix
 * @param {Array.<Array.<Number>>} matrix - original matrix
 * @param {Array.<Number>} r - Array of row indices
 * @param {Number} j0 - Initial column index
 * @param {Number} j1 - Final column index
 * @returns {Array} The sub-matrix matrix(r(:),j0:j1)
 */
mat.getMatrix = function(matrix, r, j0, j1){
    var X = new Array(r.length),
        m = j1-j0+1;

    for (var i = 0; i < r.length; i++){
        X[i] = new Array(m);
        for (var j = j0; j <= j1; j++){
            X[i][j-j0] = matrix[r[i]][j];
        }
    }
    return X;
};

/**
 * Get a submatrix of matrix
 * @param {Array.<Array.<Number>>} matrix - original matrix
 * @param {Number} i0 - Initial row index
 * @param {Number} i1 - Final row index
 * @param {Number} j0 - Initial column index
 * @param {Number} j1 - Final column index
 * @return {Array} The sub-matrix matrix(i0:i1,j0:j1)
 */
mat.getSubMatrix = function(matrix, i0, i1, j0, j1){
    var size = j1 - j0 + 1,
        X = new Array(i1-i0+1);

    for (var i = i0; i <= i1; i++){
        var subI = i-i0;

        X[subI] = new Array(size);

        for (var j = j0; j <= j1; j++){
            X[subI][j-j0] = matrix[i][j];
        }
    }
    return X;
};

/**
 * Linear algebraic matrix multiplication, matrix1 * matrix2
 * @param {Array.<Array.<Number>>} matrix1
 * @param {Array.<Array.<Number>>} matrix2
 * @return {Array.<Array.<Number>>} Matrix product, matrix1 * matrix2
 */
mat.mult = function(matrix1, matrix2){

    if (matrix2.length != matrix1[0].length){
        console.log('Matrix inner dimensions must agree:');

    }

    var X = new Array(matrix1.length),
        Bcolj = new Array(matrix1[0].length);

    for (var j = 0; j < matrix2[0].length; j++){
        for (var k = 0; k < matrix1[0].length; k++){
            Bcolj[k] = matrix2[k][j];
        }
        for (var i = 0; i < matrix1.length; i++){

            if (j === 0)
                X[i] = new Array(matrix2[0].length);

            var Arowi = matrix1[i];
            var s = 0;
            for (var k = 0; k < matrix1[0].length; k++){
                s += Arowi[k]*Bcolj[k];
            }
            X[i][j] = s;
        }
    }
    return X;
};


/**
 * LUDecomposition to solve A*X = B, based on WEKA code
 * @param {Array.<Array.<Number>>} A - left matrix of equation to be solved
 * @param {Array.<Array.<Number>>} B - right matrix of equation to be solved
 * @return {Array.<Array.<Number>>} X so that L*U*X = B(piv,:)
 */
mat.LUDecomposition = function(A,B){
    var LU = new Array(A.length);

    for (var i = 0; i < A.length; i++){
        LU[i] = new Array(A[0].length);
        for (var j = 0; j < A[0].length; j++){
            LU[i][j] = A[i][j];
        }
    }

    var m = A.length;
    var n = A[0].length;
    var piv = new Array(m);
    for (var i = 0; i < m; i++){
        piv[i] = i;
    }
    var pivsign = 1;
    var LUrowi = new Array();
    var LUcolj = new Array(m);
    // Outer loop.
    for (var j = 0; j < n; j++){
        // Make a copy of the j-th column to localize references.
        for (var i = 0; i < m; i++){
            LUcolj[i] = LU[i][j];
        }
        // Apply previous transformations.
        for (var i = 0; i < m; i++){
            LUrowi = LU[i];
            // Most of the time is spent in the following dot product.
            var kmax = Math.min(i,j);
            var s = 0;
            for (var k = 0; k < kmax; k++){
                s += LUrowi[k]*LUcolj[k];
            }
            LUrowi[j] = LUcolj[i] -= s;
        }
        // Find pivot and exchange if necessary.
        var p = j;
        for (var i = j+1; i < m; i++){
            if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])){
                p = i;
            }
        }
        if (p != j){
            for (var k = 0; k < n; k++){
                var t = LU[p][k];
                LU[p][k] = LU[j][k];
                LU[j][k] = t;
            }
            var k = piv[p];
            piv[p] = piv[j];
            piv[j] = k;
            pivsign = -pivsign;
        }
        // Compute multipliers.
        if (j < m & LU[j][j] != 0){
            for (var i = j+1; i < m; i++){
                LU[i][j] /= LU[j][j];
            }
        }
    }
    if (B.length != m){
        console.log('Matrix row dimensions must agree.');
    }
    for (var j = 0; j < n; j++){
        if (LU[j][j] === 0){
            console.log('Matrix is singular.')
        }
    }
    var nx = B[0].length;
    var X = self.webgazer.mat.getMatrix(B,piv,0,nx-1);
    // Solve L*Y = B(piv,:)
    for (var k = 0; k < n; k++){
        for (var i = k+1; i < n; i++){
            for (var j = 0; j < nx; j++){
                X[i][j] -= X[k][j]*LU[i][k];
            }
        }
    }
    // Solve U*X = Y;
    for (var k = n-1; k >= 0; k--){
        for (var j = 0; j < nx; j++){
            X[k][j] /= LU[k][k];
        }
        for (var i = 0; i < k; i++){
            for (var j = 0; j < nx; j++){
                X[i][j] -= X[k][j]*LU[i][k];
            }
        }
    }
    return X;
};

/**
 * Least squares solution of A*X = B, based on WEKA code
 * @param {Array.<Array.<Number>>} A - left side matrix to be solved
 * @param {Array.<Array.<Number>>} B - a matrix with as many rows as A and any number of columns.
 * @return {Array.<Array.<Number>>} X - that minimizes the two norms of QR*X-B.
 */
mat.QRDecomposition = function(A, B){
    // Initialize.
    var QR = new Array(A.length);

    for (var i = 0; i < A.length; i++){
        QR[i] = new Array(A[0].length);
        for (var j = 0; j < A[0].length; j++){
            QR[i][j] = A[i][j];
        }
    }
    var m = A.length;
    var n = A[0].length;
    var Rdiag = new Array(n);
    var nrm;

    // Main loop.
    for (var k = 0; k < n; k++){
        // Compute 2-norm of k-th column without under/overflow.
        nrm = 0;
        for (var i = k; i < m; i++){
            nrm = Math.hypot(nrm,QR[i][k]);
        }
        if (nrm != 0){
            // Form k-th Householder vector.
            if (QR[k][k] < 0){
                nrm = -nrm;
            }
            for (var i = k; i < m; i++){
                QR[i][k] /= nrm;
            }
            QR[k][k] += 1;

            // Apply transformation to remaining columns.
            for (var j = k+1; j < n; j++){
                var s = 0;
                for (var i = k; i < m; i++){
                    s += QR[i][k]*QR[i][j];
                }
                s = -s/QR[k][k];
                for (var i = k; i < m; i++){
                    QR[i][j] += s*QR[i][k];
                }
            }
        }
        Rdiag[k] = -nrm;
    }
    if (B.length != m){
        console.log('Matrix row dimensions must agree.');
    }
    for (var j = 0; j < n; j++){
        if (Rdiag[j] === 0)
            console.log('Matrix is rank deficient');
    }
    // Copy right hand side
    var nx = B[0].length;
    var X = new Array(B.length);
    for(var i=0; i<B.length; i++){
        X[i] = new Array(B[0].length);
    }
    for (var i = 0; i < B.length; i++){
        for (var j = 0; j < B[0].length; j++){
            X[i][j] = B[i][j];
        }
    }
    // Compute Y = transpose(Q)*B
    for (var k = 0; k < n; k++){
        for (var j = 0; j < nx; j++){
            var s = 0.0;
            for (var i = k; i < m; i++){
                s += QR[i][k]*X[i][j];
            }
            s = -s/QR[k][k];
            for (var i = k; i < m; i++){
                X[i][j] += s*QR[i][k];
            }
        }
    }
    // Solve R*X = Y;
    for (var k = n-1; k >= 0; k--){
        for (var j = 0; j < nx; j++){
            X[k][j] /= Rdiag[k];
        }
        for (var i = 0; i < k; i++){
            for (var j = 0; j < nx; j++){
                X[i][j] -= X[k][j]*QR[i][k];
            }
        }
    }
    return mat.getSubMatrix(X,0,n-1,0,nx-1);
}

/* harmony default export */ var src_mat = (mat);

// EXTERNAL MODULE: ./node_modules/numeric/numeric-1.2.6.js
var numeric_1_2_6 = __webpack_require__(14);

// CONCATENATED MODULE: ./src/util.mjs




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
util.getEyeFeats = function(eyes,custom_resizeWidth,custom_resizeHeight) {
    var resizedLeft,resizedRight;
    if (custom_resizeHeight !== undefined && custom_resizeHeight !== undefined){
        resizedLeft = this.resizeEye(eyes.left, custom_resizeWidth, custom_resizeHeight);
        resizedRight = this.resizeEye(eyes.right, custom_resizeWidth, custom_resizeHeight);
    }
    else{
        resizedLeft = this.resizeEye(eyes.left, resizeWidth, resizeHeight);
        resizedRight = this.resizeEye(eyes.right, resizeWidth, resizeHeight);
    } 
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

//not used !? until the end of the file
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

/**
 * Add stat data for log
 * @param {String} key - The data key
 * @param {*} value - The value
 */
util.DebugBox.prototype.set = function(key, value) {
    this.stats[key] = value;
};

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

/* harmony default export */ var src_util = (util);

// CONCATENATED MODULE: ./src/util_regression.mjs





const util_regression = {};


/**
 * Initialize new arrays and initialize Kalman filter for regressions.
 */
util_regression.InitRegression = function() {
  var dataWindow = 700;
  var trailDataWindow = 10;
  this.ridgeParameter = Math.pow(10,-5);
  this.errorXArray = new src_util.DataWindow(dataWindow);
  this.errorYArray = new src_util.DataWindow(dataWindow);


  this.screenXClicksArray = new src_util.DataWindow(dataWindow);
  this.screenYClicksArray = new src_util.DataWindow(dataWindow);
  this.eyeFeaturesClicks = new src_util.DataWindow(dataWindow);

  //sets to one second worth of cursor trail
  this.trailTime = 1000;
  this.trailDataWindow = this.trailTime / src_params.moveTickSize;
  this.screenXTrailArray = new src_util.DataWindow(trailDataWindow);
  this.screenYTrailArray = new src_util.DataWindow(trailDataWindow);
  this.eyeFeaturesTrail = new src_util.DataWindow(trailDataWindow);
  this.trailTimes = new src_util.DataWindow(trailDataWindow);

  this.dataClicks = new src_util.DataWindow(dataWindow);
  this.dataTrail = new src_util.DataWindow(trailDataWindow);

  // Initialize Kalman filter [20200608 xk] what do we do about parameters?
  // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least
  //               by my own anecdotal observation a 4x1 x vector seems to work alright
  var F = [ [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 1, 0],
    [0, 0, 0, 1]];

  //Parameters Q and R may require some fine tuning
  var Q = [ [1/4, 0,    1/2, 0],
    [0,   1/4,  0,   1/2],
    [1/2, 0,    1,   0],
    [0,  1/2,  0,   1]];// * delta_t
  var delta_t = 1/10; // The amount of time between frames
  Q = numeric_1_2_6.mul(Q, delta_t);

  var H = [ [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0]];
  var H = [ [1, 0, 0, 0],
    [0, 1, 0, 0]];
  var pixel_error = 47; //We will need to fine tune this value [20200611 xk] I just put a random value here

  //This matrix represents the expected measurement error
  var R = numeric_1_2_6.mul(numeric_1_2_6.identity(2), pixel_error);

  var P_initial = numeric_1_2_6.mul(numeric_1_2_6.identity(4), 0.0001); //Initial covariance matrix
  var x_initial = [[500], [500], [0], [0]]; // Initial measurement matrix

  this.kalman = new util_regression.KalmanFilter(F, H, Q, R, P_initial, x_initial);
}

/**
 * Kalman Filter constructor
 * Kalman filters work by reducing the amount of noise in a models.
 * https://blog.cordiner.net/2011/05/03/object-tracking-using-a-kalman-filter-matlab/
 *
 * @param {Array.<Array.<Number>>} F - transition matrix
 * @param {Array.<Array.<Number>>} Q - process noise matrix
 * @param {Array.<Array.<Number>>} H - maps between measurement vector and noise matrix
 * @param {Array.<Array.<Number>>} R - defines measurement error of the device
 * @param {Array} P_initial - the initial state
 * @param {Array} X_initial - the initial state of the device
 */
util_regression.KalmanFilter = function(F, H, Q, R, P_initial, X_initial) {
    this.F = F; // State transition matrix
    this.Q = Q; // Process noise matrix
    this.H = H; // Transformation matrix
    this.R = R; // Measurement Noise
    this.P = P_initial; //Initial covariance matrix
    this.X = X_initial; //Initial guess of measurement
};

/**
 * Get Kalman next filtered value and update the internal state
 * @param {Array} z - the new measurement
 * @return {Array}
 */
util_regression.KalmanFilter.prototype.update = function(z) {
    // Here, we define all the different matrix operations we will need
    var add = numeric_1_2_6.add, sub = numeric_1_2_6.sub, inv = numeric_1_2_6.inv, identity = numeric_1_2_6.identity;
    var mult = src_mat.mult, transpose = src_mat.transpose;
    //TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    var X_p = mult(this.F, this.X); //Update state vector
    var P_p = add(mult(mult(this.F,this.P), transpose(this.F)), this.Q); //Predicted covaraince

    //Calculate the update values
    var y = sub(z, mult(this.H, X_p)); // This is the measurement error (between what we expect and the actual value)
    var S = add(mult(mult(this.H, P_p), transpose(this.H)), this.R); //This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    var K = mult(P_p, mult(transpose(this.H), inv(S))); //This is the Optimal Kalman Gain

    //We need to change Y into it's column vector form
    for(var i = 0; i < y.length; i++){
        y[i] = [y[i]];
    }

    //Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(X_p, mult(K, y));
    this.P = mult(sub(identity(K.length), mult(K,this.H)), P_p);
    return transpose(mult(this.H, this.X))[0]; //Transforms the predicted state back into it's measurement form
};

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Array} k - ridge parameter
 * @return{Array} regression coefficients
 */
util_regression.ridge = function(y, X, k){
    var nc = X[0].length;
    var m_Coefficients = new Array(nc);
    var xt = src_mat.transpose(X);
    var solution = new Array();
    var success = true;
    do{
        var ss = src_mat.mult(xt,X);
        // Set ridge regression adjustment
        for (var i = 0; i < nc; i++) {
            ss[i][i] = ss[i][i] + k;
        }

        // Carry out the regression
        var bb = src_mat.mult(xt,y);
        for(var i = 0; i < nc; i++) {
            m_Coefficients[i] = bb[i][0];
        }
        try{
            var n = (m_Coefficients.length !== 0 ? m_Coefficients.length/m_Coefficients.length: 0);
            if (m_Coefficients.length*n !== m_Coefficients.length){
                console.log('Array length must be a multiple of m')
            }
            solution = (ss.length === ss[0].length ? (numeric_1_2_6.LUsolve(numeric_1_2_6.LU(ss,true),bb)) : (webgazer.mat.QRDecomposition(ss,bb)));

            for (var i = 0; i < nc; i++){
                m_Coefficients[i] = solution[i];
            }
            success = true;
        }
        catch (ex){
            k *= 10;
            console.log(ex);
            success = false;
        }
    } while (!success);
    return m_Coefficients;
}

/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
util_regression.setData = function(data) {
  for (var i = 0; i < data.length; i++) {
    // Clone data array
    var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
    var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
    // Duplicate ImageData object
    data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
    data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

    // Add those data objects to model
    this.addData(data[i].eyes, data[i].screenPos, data[i].type);
  }
};


//not used ?!
//TODO: still usefull ???
/**
 *
 * @returns {Number}
 */
util_regression.getCurrentFixationIndex = function() {
  var index = 0;
  var recentX = this.screenXTrailArray.get(0);
  var recentY = this.screenYTrailArray.get(0);
  for (var i = this.screenXTrailArray.length - 1; i >= 0; i--) {
    var currX = this.screenXTrailArray.get(i);
    var currY = this.screenYTrailArray.get(i);
    var euclideanDistance = Math.sqrt(Math.pow((currX-recentX),2)+Math.pow((currY-recentY),2));
    if (euclideanDistance > 72){
      return i+1;
    }
  }
  return i;
}

util_regression.addData = function(eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    if (type === 'click') {
        this.screenXClicksArray.push([screenPos[0]]);
        this.screenYClicksArray.push([screenPos[1]]);
        this.eyeFeaturesClicks.push(src_util.getEyeFeats(eyes));
        this.dataClicks.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
    } else if (type === 'move') {
        this.screenXTrailArray.push([screenPos[0]]);
        this.screenYTrailArray.push([screenPos[1]]);

        this.eyeFeaturesTrail.push(src_util.getEyeFeats(eyes));
        this.trailTimes.push(performance.now());
        this.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
    }

    // [20180730 JT] Why do we do this? It doesn't return anything...
    // But as JS is pass by reference, it still affects it.
    //
    // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
    //eyes.left.patch = Array.from(eyes.left.patch.data);
    //eyes.right.patch = Array.from(eyes.right.patch.data);
};

/* harmony default export */ var src_util_regression = (util_regression);
// CONCATENATED MODULE: ./src/ridgeReg.mjs



const ridgeReg_reg = {};

/**
 * Constructor of RidgeReg object,
 * this object allow to perform ridge regression
 * @constructor
 */
ridgeReg_reg.RidgeReg = function() {
  this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
ridgeReg_reg.RidgeReg.prototype.init = src_util_regression.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
ridgeReg_reg.RidgeReg.prototype.addData = src_util_regression.addData

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
ridgeReg_reg.RidgeReg.prototype.predict = function(eyesObj) {
  if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
    return null;
  }
  var acceptTime = performance.now() - this.trailTime;
  var trailX = [];
  var trailY = [];
  var trailFeat = [];
  for (var i = 0; i < this.trailDataWindow; i++) {
    if (this.trailTimes.get(i) > acceptTime) {
      trailX.push(this.screenXTrailArray.get(i));
      trailY.push(this.screenYTrailArray.get(i));
      trailFeat.push(this.eyeFeaturesTrail.get(i));
    }
  }

  var screenXArray = this.screenXClicksArray.data.concat(trailX);
  var screenYArray = this.screenYClicksArray.data.concat(trailY);
  var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);

  var coefficientsX = src_util_regression.ridge(screenXArray, eyeFeatures, this.ridgeParameter);
  var coefficientsY = src_util_regression.ridge(screenYArray, eyeFeatures, this.ridgeParameter);

  var eyeFeats = src_util.getEyeFeats(eyesObj);
  var predictedX = 0;
  for(var i=0; i< eyeFeats.length; i++){
    predictedX += eyeFeats[i] * coefficientsX[i];
  }
  var predictedY = 0;
  for(var i=0; i< eyeFeats.length; i++){
    predictedY += eyeFeats[i] * coefficientsY[i];
  }

  predictedX = Math.floor(predictedX);
  predictedY = Math.floor(predictedY);

  if (window.applyKalmanFilter) {
    // Update Kalman model, and get prediction
    var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
    newGaze = this.kalman.update(newGaze);

    return {
      x: newGaze[0],
      y: newGaze[1]
    };
  } else {
    return {
      x: predictedX,
      y: predictedY
    };
  }
};

ridgeReg_reg.RidgeReg.prototype.setData = src_util_regression.setData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
ridgeReg_reg.RidgeReg.prototype.getData = function() {
  return this.dataClicks.data;
}

/**
 * The RidgeReg object name
 * @type {string}
 */
ridgeReg_reg.RidgeReg.prototype.name = 'ridge';

/* harmony default export */ var ridgeReg = (ridgeReg_reg);

// CONCATENATED MODULE: ./src/ridgeWeightedReg.mjs



const ridgeWeightedReg_reg = {};

/**
 * Constructor of RidgeWeightedReg object
 * @constructor
 */
ridgeWeightedReg_reg.RidgeWeightedReg = function() {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
ridgeWeightedReg_reg.RidgeWeightedReg.prototype.init = src_util_regression.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
ridgeWeightedReg_reg.RidgeWeightedReg.prototype.addData = src_util_regression.addData

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
ridgeWeightedReg_reg.RidgeWeightedReg.prototype.predict = function(eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }
    var acceptTime = performance.now() - this.trailTime;
    var trailX = [];
    var trailY = [];
    var trailFeat = [];
    for (var i = 0; i < this.trailDataWindow; i++) {
        if (this.trailTimes.get(i) > acceptTime) {
            trailX.push(this.screenXTrailArray.get(i));
            trailY.push(this.screenYTrailArray.get(i));
            trailFeat.push(this.eyeFeaturesTrail.get(i));
        }
    }

    var len = this.eyeFeaturesClicks.data.length;
    var weightedEyeFeats = Array(len);
    var weightedXArray = Array(len);
    var weightedYArray = Array(len);
    for (var i = 0; i < len; i++) {
        var weight = Math.sqrt( 1 / (len - i) ); // access from oldest to newest so should start with low weight and increase steadily
        //abstraction is leaking...
        var trueIndex = this.eyeFeaturesClicks.getTrueIndex(i);
        for (var j = 0; j < this.eyeFeaturesClicks.data[trueIndex].length; j++) {
            var val = this.eyeFeaturesClicks.data[trueIndex][j] * weight;
            if (weightedEyeFeats[trueIndex] !== undefined){
                weightedEyeFeats[trueIndex].push(val);
            } else {
                weightedEyeFeats[trueIndex] = [val];
            }
        }
        weightedXArray[trueIndex] = this.screenXClicksArray.get(i).slice(0, this.screenXClicksArray.get(i).length);
        weightedYArray[trueIndex] = this.screenYClicksArray.get(i).slice(0, this.screenYClicksArray.get(i).length);
        weightedXArray[i][0] = weightedXArray[i][0] * weight;
        weightedYArray[i][0] = weightedYArray[i][0] * weight;
    }

    var screenXArray = weightedXArray.concat(trailX);
    var screenYArray = weightedYArray.concat(trailY);
    var eyeFeatures = weightedEyeFeats.concat(trailFeat);

    var coefficientsX = src_util_regression.ridge(screenXArray, eyeFeatures, this.ridgeParameter);
    var coefficientsY = src_util_regression.ridge(screenYArray, eyeFeatures, this.ridgeParameter);

    var eyeFeats = src_util.getEyeFeats(eyesObj);
    var predictedX = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedX += eyeFeats[i] * coefficientsX[i];
    }
    var predictedY = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (window.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};

ridgeWeightedReg_reg.RidgeWeightedReg.prototype.setData = src_util_regression.setData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
ridgeWeightedReg_reg.RidgeWeightedReg.prototype.getData = function() {
    return this.dataClicks.data;
};

/**
 * The RidgeWeightedReg object name
 * @type {string}
 */
ridgeWeightedReg_reg.RidgeWeightedReg.prototype.name = 'ridgeWeighted';

/* harmony default export */ var ridgeWeightedReg = (ridgeWeightedReg_reg);

// CONCATENATED MODULE: ./src/ridgeRegThreaded.mjs




const ridgeRegThreaded_reg = {};

var weights = {'X':[0],'Y':[0]};


/**
 * Constructor of RidgeRegThreaded object,
 * it retrieve data window, and prepare a worker,
 * this object allow to perform threaded ridge regression
 * @constructor
 */
ridgeRegThreaded_reg.RidgeRegThreaded = function() {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.init = src_util.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.addData = function(eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    this.worker.postMessage({'eyes':src_util.getEyeFeats(eyes), 'screenPos':screenPos, 'type':type});
};

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.predict = function(eyesObj) {
    // console.log('LOGGING..');
    if (!eyesObj) {
        return null;
    }
    var coefficientsX = weights.X;
    var coefficientsY = weights.Y;

    var eyeFeats = src_util.getEyeFeats(eyesObj);
    var predictedX = 0, predictedY = 0;
    for(var i=0; i< eyeFeats.length; i++){
        predictedX += eyeFeats[i] * coefficientsX[i];
        predictedY += eyeFeats[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (window.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};

/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.setData = src_util_regression.setData

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.getData = function() {
    return this.dataClicks.data;
};

/**
 * The RidgeRegThreaded object name
 * @type {string}
 */
ridgeRegThreaded_reg.RidgeRegThreaded.prototype.name = 'ridge';

/* harmony default export */ var ridgeRegThreaded = (ridgeRegThreaded_reg);

// CONCATENATED MODULE: ./src/index.mjs

//import(/* webpackPreload: true */ '@tensorflow/tfjs');
//import(/* webpackChunkName: 'pageA' */ './vendors~main.js')











const src_webgazer = {};
src_webgazer.tracker = {};
src_webgazer.tracker.TFFaceMesh = facemesh;
src_webgazer.reg = ridgeReg;
src_webgazer.reg.RidgeWeightedReg = ridgeWeightedReg.RidgeWeightedReg;
src_webgazer.reg.RidgeRegThreaded = ridgeRegThreaded.RidgeRegThreaded;
src_webgazer.util = src_util;
src_webgazer.params = src_params;

//PRIVATE VARIABLES

//video elements
var videoStream = null;
var videoElement = null;
var videoElementCanvas = null;
var faceOverlay = null;
var faceFeedbackBox = null;
var gazeDot = null;
// Why is this not in webgazer.params ?
var debugVideoLoc = '';

/*
 * Initialises variables used to store accuracy eigenValues
 * This is used by the calibration example file
 */
var xPast50 = new Array(50);
var yPast50 = new Array(50);

// loop parameters
var clockStart = performance.now();
var latestEyeFeatures = null;
var latestGazeData = null;
var paused = false;
//registered callback for loop
var nopCallback = function(data, time) {};
var callback = nopCallback;

//Types that regression systems should handle
//Describes the source of data so that regression systems may ignore or handle differently the various generating events
var eventTypes = ['click', 'move'];

//movelistener timeout clock parameters
var moveClock = performance.now();
//currently used tracker and regression models, defaults to clmtrackr and linear regression
var curTracker = new src_webgazer.tracker.TFFaceMesh();
var regs = [new src_webgazer.reg.RidgeReg()];
// var blinkDetector = new webgazer.BlinkDetector();

//lookup tables
var curTrackerMap = {
  'TFFacemesh': function() { return new src_webgazer.tracker.TFFaceMesh(); },
};
var regressionMap = {
  'ridge': function() { return new src_webgazer.reg.RidgeReg(); },
  'weightedRidge': function() { return new src_webgazer.reg.RidgeWeightedReg(); },
  'threadedRidge': function() { return new src_webgazer.reg.RidgeRegThreaded(); },
};

//localstorage name
var localstorageDataLabel = 'webgazerGlobalData';
var localstorageSettingsLabel = 'webgazerGlobalSettings';
//settings object for future storage of settings
var settings = {};
var data = [];
var defaults = {
  'data': [],
  'settings': {}
};


//PRIVATE FUNCTIONS

/**
 * Computes the size of the face overlay validation box depending on the size of the video preview window.
 * @returns {Object} The dimensions of the validation box as top, left, width, height.
 */
src_webgazer.computeValidationBoxSize = function() {

  var vw = videoElement.videoWidth;
  var vh = videoElement.videoHeight;
  var pw = parseInt(videoElement.style.width);
  var ph = parseInt(videoElement.style.height);

  // Find the size of the box.
  // Pick the smaller of the two video preview sizes
  var smaller = Math.min( vw, vh );
  var larger  = Math.max( vw, vh );

  // Overall scalar
  var scalar = ( vw == larger ? pw / vw : ph / vh );

  // Multiply this by 2/3, then adjust it to the size of the preview
  var boxSize = (smaller * src_webgazer.params.faceFeedbackBoxRatio) * scalar;

  // Set the boundaries of the face overlay validation box based on the preview
  var topVal = (ph - boxSize)/2;
  var leftVal = (pw - boxSize)/2;

  // top, left, width, height
  return [topVal, leftVal, boxSize, boxSize]
}

/**
 * Checks if the pupils are in the position box on the video
 * // TODO These are all wrong. The latestEyeFeatures will be in 'video' space not 'preview' space, and so need to be converted.
 */
function checkEyesInValidationBox() {

  if (faceFeedbackBox != null && latestEyeFeatures) {
    var w = videoElement.videoWidth;
    var h = videoElement.videoHeight;

    // Find the size of the box.
    // Pick the smaller of the two video preview sizes
    var smaller = Math.min( w, h );
    var boxSize = smaller * src_webgazer.params.faceFeedbackBoxRatio;

    // Set the boundaries of the face overlay validation box based on the preview
    var topBound = (h - boxSize)/2;
    var leftBound = (w - boxSize)/2;
    var rightBound = leftBound + boxSize;
    var bottomBound = topBound + boxSize;

    //get the x and y positions of the left and right eyes
    var eyeLX = latestEyeFeatures.left.imagex;
    var eyeLY = latestEyeFeatures.left.imagey;
    var eyeRX = latestEyeFeatures.right.imagex;
    var eyeRY = latestEyeFeatures.right.imagey;


    var xPositions = false;
    var yPositions = false;

    //check if the x values for the left and right eye are within the
    //validation box
    if (eyeLX > leftBound && eyeLX < rightBound) {
      if (eyeRX > leftBound && eyeRX < rightBound) {
        xPositions = true;
      }
    }

    //check if the y values for the left and right eye are within the
    //validation box
    if (eyeLY > topBound && eyeLY < bottomBound) {
      if (eyeRY > topBound && eyeRY < bottomBound) {
        yPositions = true;
      }
    }

    //if the x and y values for both the left and right eye are within
    //the validation box then the box border turns green, otherwise if
    //the eyes are outside of the box the colour is red
    if (xPositions && yPositions){
      faceFeedbackBox.style.border = 'solid green';
    } else {
      faceFeedbackBox.style.border = 'solid red';
    }
  }
  else
    faceFeedbackBox.style.border = 'solid black';
}

/**
 * This draws the point (x,y) onto the canvas in the HTML
 * @param {colour} colour - The colour of the circle to plot
 * @param {x} x - The x co-ordinate of the desired point to plot
 * @param {y} y - The y co-ordinate of the desired point to plot
 */
function drawCoordinates(colour,x,y){
  var ctx = document.getElementById("plotting_canvas").getContext('2d');
  ctx.fillStyle = colour; // Red color
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2, true);
  ctx.fill();
}

/**
 * Gets the pupil features by following the pipeline which threads an eyes object through each call:
 * curTracker gets eye patches -> blink detector -> pupil detection
 * @param {Canvas} canvas - a canvas which will have the video drawn onto it
 * @param {Number} width - the width of canvas
 * @param {Number} height - the height of canvas
 */
function getPupilFeatures(canvas, width, height) {
  if (!canvas) {
    return;
  }
  try {
    return curTracker.getEyePatches(canvas, width, height);
  } catch(err) {
    console.log("can't get pupil features ", err);
    return null;
  }
}

/**
 * Gets the most current frame of video and paints it to a resized version of the canvas with width and height
 * @param {Canvas} canvas - the canvas to paint the video on to
 * @param {Number} width - the new width of the canvas
 * @param {Number} height - the new height of the canvas
 */
function paintCurrentFrame(canvas, width, height) {
  if (canvas.width != width) {
    canvas.width = width;
  }
  if (canvas.height != height) {
    canvas.height = height;
  }

  var ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
}

/**
 * Paints the video to a canvas and runs the prediction pipeline to get a prediction
 * @param {Number|undefined} regModelIndex - The prediction index we're looking for
 * @returns {*}
 */
async function getPrediction(regModelIndex) {
  var predictions = [];
  // [20200617 xk] TODO: this call should be made async somehow. will take some work.
  latestEyeFeatures = await getPupilFeatures(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height);

  if (regs.length === 0) {
    console.log('regression not set, call setRegression()');
    return null;
  }
  for (var reg in regs) {
    predictions.push(regs[reg].predict(latestEyeFeatures));
  }
  if (regModelIndex !== undefined) {
    return predictions[regModelIndex] === null ? null : {
      'x' : predictions[regModelIndex].x,
      'y' : predictions[regModelIndex].y,
      'eyeFeatures': latestEyeFeatures
    };
  } else {
    return predictions.length === 0 || predictions[0] === null ? null : {
      'x' : predictions[0].x,
      'y' : predictions[0].y,
      'eyeFeatures': latestEyeFeatures,
      'all' : predictions
    };
  }
}

/**
 * Runs every available animation frame if webgazer is not paused
 */
var smoothingVals = new src_util.DataWindow(4);
var src_k = 0;

async function loop() {
  if (!paused) {

    // [20200617 XK] TODO: there is currently lag between the camera input and the face overlay. This behavior
    // is not seen in the facemesh demo. probably need to optimize async implementation. I think the issue lies
    // in the implementation of getPrediction().

    // Paint the latest video frame into the canvas which will be analyzed by WebGazer
    // [20180729 JT] Why do we need to do this? clmTracker does this itself _already_, which is just duplicating the work.
    // Is it because other trackers need a canvas instead of an img/video element?
    paintCurrentFrame(videoElementCanvas, videoElementCanvas.width, videoElementCanvas.height);

    // Get gaze prediction (ask clm to track; pass the data to the regressor; get back a prediction)
    latestGazeData = getPrediction();
    // Count time
    var elapsedTime = performance.now() - clockStart;


    // Draw face overlay
    if( src_webgazer.params.showFaceOverlay )
    {
      // Get tracker object
      var tracker = src_webgazer.getTracker();
      faceOverlay.getContext('2d').clearRect( 0, 0, videoElement.videoWidth, videoElement.videoHeight);
      tracker.drawFaceOverlay(faceOverlay.getContext('2d'), tracker.getPositions());
    }

    // Feedback box
    // Check that the eyes are inside of the validation box
    if( src_webgazer.params.showFaceFeedbackBox )
      checkEyesInValidationBox();

    latestGazeData = await latestGazeData;

    // [20200623 xk] callback to function passed into setGazeListener(fn)
    callback(latestGazeData, elapsedTime);

    if( latestGazeData ) {
      // [20200608 XK] Smoothing across the most recent 4 predictions, do we need this with Kalman filter?
      smoothingVals.push(latestGazeData);
      var x = 0;
      var y = 0;
      var len = smoothingVals.length;
      for (var d in smoothingVals.data) {
        x += smoothingVals.get(d).x;
        y += smoothingVals.get(d).y;
      }

      var pred = src_util.bound({'x':x/len, 'y':y/len});

      if (src_webgazer.params.storingPoints) {
        drawCoordinates('blue',pred.x,pred.y); //draws the previous predictions
        //store the position of the past fifty occuring tracker preditions
        src_webgazer.storePoints(pred.x, pred.y, src_k);
        src_k++;
        if (src_k == 50) {
          src_k = 0;
        }
      }
      // GazeDot
      if (src_webgazer.params.showGazeDot) {
        gazeDot.style.display = 'block';
      }
      gazeDot.style.transform = 'translate3d(' + pred.x + 'px,' + pred.y + 'px,0)';
    } else {
      gazeDot.style.display = 'none';
    }

    requestAnimationFrame(loop);
  }
}

//is problematic to test
//because latestEyeFeatures is not set in many cases

/**
 * Records screen position data based on current pupil feature and passes it
 * to the regression model.
 * @param {Number} x - The x screen position
 * @param {Number} y - The y screen position
 * @param {String} eventType - The event type to store
 * @returns {null}
 */
var recordScreenPosition = function(x, y, eventType) {
  if (paused) {
    return;
  }
  if (regs.length === 0) {
    console.log('regression not set, call setRegression()');
    return null;
  }
  for (var reg in regs) {
    if( latestEyeFeatures )
      regs[reg].addData(latestEyeFeatures, [x, y], eventType);
  }
};

/**
 * Records click data and passes it to the regression model
 * @param {Event} event - The listened event
 */
var clickListener = async function(event) {
  recordScreenPosition(event.clientX, event.clientY, eventTypes[0]); // eventType[0] === 'click'

  if (window.saveDataAcrossSessions) {
    // Each click stores the next data point into localforage.
    await setGlobalData();

    // // Debug line
    // console.log('Model size: ' + JSON.stringify(await localforage.getItem(localstorageDataLabel)).length / 1000000 + 'MB');
  }
};

/**
 * Records mouse movement data and passes it to the regression model
 * @param {Event} event - The listened event
 */
var moveListener = function(event) {
  if (paused) {
    return;
  }

  var now = performance.now();
  if (now < moveClock + src_webgazer.params.moveTickSize) {
    return;
  } else {
    moveClock = now;
  }
  recordScreenPosition(event.clientX, event.clientY, eventTypes[1]); //eventType[1] === 'move'
};

/**
 * Add event listeners for mouse click and move.
 */
var addMouseEventListeners = function() {
  //third argument set to true so that we get event on 'capture' instead of 'bubbling'
  //this prevents a client using event.stopPropagation() preventing our access to the click
  document.addEventListener('click', clickListener, true);
  document.addEventListener('mousemove', moveListener, true);
};

/**
 * Remove event listeners for mouse click and move.
 */
var removeMouseEventListeners = function() {
  // must set third argument to same value used in addMouseEventListeners
  // for this to work.
  document.removeEventListener('click', clickListener, true);
  document.removeEventListener('mousemove', moveListener, true);
};

/**
 * Loads the global data and passes it to the regression model
 */
async function loadGlobalData() {
  // Get settings object from localforage
  // [20200611 xk] still unsure what this does, maybe would be good for Kalman filter settings etc?
  settings = await localforage.getItem(localstorageSettingsLabel);
  settings = settings || defaults;

  // Get click data from localforage
  var loadData = await localforage.getItem(localstorageDataLabel);
  loadData = loadData || defaults;

  // Set global var data to newly loaded data
  data = loadData;

  // Load data into regression model(s)
  for (var reg in regs) {
    regs[reg].setData(loadData);
  }

  console.log("loaded stored data into regression model");
}

/**
 * Adds data to localforage
 */
async function setGlobalData() {
  // Grab data from regression model
  var storeData = regs[0].getData() || data; // Array

  // Store data into localforage
  localforage.setItem(localstorageSettingsLabel, settings) // [20200605 XK] is 'settings' ever being used?
  localforage.setItem(localstorageDataLabel, storeData);
  //TODO data should probably be stored in webgazer object instead of each regression model
  //     -> requires duplication of data, but is likely easier on regression model implementors
}

/**
 * Clears data from model and global storage
 */
function clearData() {
  // Removes data from localforage
  localforage.clear();

  // Removes data from regression model
  for (var reg in regs) {
    regs[reg].init();
  }
}

/**
 * Initializes all needed dom elements and begins the loop
 * @param {URL} stream - The video stream to use
 */
async function init(stream) {
  //////////////////////////
  // Video and video preview
  //////////////////////////
  var topDist = '0px'
  var leftDist = '0px'

  // used for webgazer.stopVideo() and webgazer.setCameraConstraints()
  videoStream = stream;

  videoElement = document.createElement('video');
  videoElement.id = src_webgazer.params.videoElementId;
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  videoElement.style.display = src_webgazer.params.showVideo ? 'block' : 'none';
  videoElement.style.position = 'fixed';
  videoElement.style.top = topDist;
  videoElement.style.left = leftDist;
  // We set these to stop the video appearing too large when it is added for the very first time
  videoElement.style.width = src_webgazer.params.videoViewerWidth + 'px';
  videoElement.style.height = src_webgazer.params.videoViewerHeight + 'px';
  // videoElement.style.zIndex="-1";

  // Canvas for drawing video to pass to clm tracker
  videoElementCanvas = document.createElement('canvas');
  videoElementCanvas.id = src_webgazer.params.videoElementCanvasId;
  videoElementCanvas.style.display = 'none';

  // Face overlay
  // Shows the CLM tracking result
  faceOverlay = document.createElement('canvas');
  faceOverlay.id = src_webgazer.params.faceOverlayId;
  faceOverlay.style.display = src_webgazer.params.showFaceOverlay ? 'block' : 'none';
  faceOverlay.style.position = 'fixed';
  faceOverlay.style.top = topDist;
  faceOverlay.style.left = leftDist;

  // Mirror video feed
  if (src_webgazer.params.mirrorVideo) {
    videoElement.style.setProperty("-moz-transform", "scale(-1, 1)");
    videoElement.style.setProperty("-webkit-transform", "scale(-1, 1)");
    videoElement.style.setProperty("-o-transform", "scale(-1, 1)");
    videoElement.style.setProperty("transform", "scale(-1, 1)");
    videoElement.style.setProperty("filter", "FlipH");
    faceOverlay.style.setProperty("-moz-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("-webkit-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("-o-transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("transform", "scale(-1, 1)");
    faceOverlay.style.setProperty("filter", "FlipH");
  }

  // Feedback box
  // Lets the user know when their face is in the middle
  faceFeedbackBox = document.createElement('canvas');
  faceFeedbackBox.id = src_webgazer.params.faceFeedbackBoxId;
  faceFeedbackBox.style.display = src_webgazer.params.showFaceFeedbackBox ? 'block' : 'none';
  faceFeedbackBox.style.position = 'fixed';
  faceFeedbackBox.style.border = 'solid';

  // Gaze dot
  // Starts offscreen
  gazeDot = document.createElement('div');
  gazeDot.id = src_webgazer.params.gazeDotId;
  gazeDot.style.display = src_webgazer.params.showGazeDot ? 'block' : 'none';
  gazeDot.style.position = 'fixed';
  gazeDot.style.zIndex = 99999;
  gazeDot.style.left = '-5px'; //'-999em';
  gazeDot.style.top  = '-5px';
  gazeDot.style.background = 'red';
  gazeDot.style.borderRadius = '100%';
  gazeDot.style.opacity = '0.7';
  gazeDot.style.width = '10px';
  gazeDot.style.height = '10px';

  // Add other preview/feedback elements to the screen once the video has shown and its parameters are initialized
  document.body.appendChild(videoElement);
  function setupPreviewVideo(e) {

    // All video preview parts have now been added, so set the size both internally and in the preview window.
    setInternalVideoBufferSizes( videoElement.videoWidth, videoElement.videoHeight );
    src_webgazer.setVideoViewerSize( src_webgazer.params.videoViewerWidth, src_webgazer.params.videoViewerHeight );

    document.body.appendChild(videoElementCanvas);
    document.body.appendChild(faceOverlay);
    document.body.appendChild(faceFeedbackBox);
    document.body.appendChild(gazeDot);

    // Run this only once, so remove the event listener
    e.target.removeEventListener(e.type, setupPreviewVideo);
  };
  videoElement.addEventListener('timeupdate', setupPreviewVideo);

  addMouseEventListeners();

  //BEGIN CALLBACK LOOP
  paused = false;
  clockStart = performance.now();

  await loop();
}

/**
 * Initializes navigator.mediaDevices.getUserMedia
 * depending on the browser capabilities
 */
function setUserMediaVariable(){

  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

      // gets the alternative old getUserMedia is possible
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // set an error message if browser doesn't support getUserMedia
      if (!getUserMedia) {
        return Promise.reject(new Error("Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead."));
      }

      // uses navigator.getUserMedia for older browsers
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }
}

//PUBLIC FUNCTIONS - CONTROL

/**
 * Starts all state related to webgazer -> dataLoop, video collection, click listener
 * If starting fails, call `onFail` param function.
 * @param {Function} onFail - Callback to call in case it is impossible to find user camera
 * @returns {*}
 */
src_webgazer.begin = function(onFail) {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.chrome){
    alert("WebGazer works only over https. If you are doing local development you need to run a local server.");
  }

  // Load model data stored in localforage.
  if (window.saveDataAcrossSessions) {
    loadGlobalData();
  }

  onFail = onFail || function() {console.log('No stream')};

  if (debugVideoLoc) {
    init(debugVideoLoc);
    return src_webgazer;
  }

  ///////////////////////
  // SETUP VIDEO ELEMENTS
  // Sets .mediaDevices.getUserMedia depending on browser
  setUserMediaVariable();

  // Request webcam access under specific constraints
  // WAIT for access
  return new Promise(async (resolve, reject) => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia( src_webgazer.params.camConstraints );
      if (src_webgazer.params.showVideoPreview) {
        init(stream);
      }
      resolve(src_webgazer);
    } catch(err) {
      onFail();
      videoElement = null;
      stream = null;
      reject(err);
    }
  });
};


/**
 * Checks if webgazer has finished initializing after calling begin()
 * [20180729 JT] This seems like a bad idea for how this function should be implemented.
 * @returns {boolean} if webgazer is ready
 */
src_webgazer.isReady = function() {
  if (videoElementCanvas === null) {
    return false;
  }
  return videoElementCanvas.width > 0;
};

/**
 * Stops collection of data and predictions
 * @returns {webgazer} this
 */
src_webgazer.pause = function() {
  paused = true;
  return src_webgazer;
};

/**
 * Resumes collection of data and predictions if paused
 * @returns {webgazer} this
 */
src_webgazer.resume = async function() {
  if (!paused) {
    return src_webgazer;
  }
  paused = false;
  await loop();
  return src_webgazer;
};

/**
 * stops collection of data and removes dom modifications, must call begin() to reset up
 * @return {webgazer} this
 */
src_webgazer.end = function() {
  //loop may run an extra time and fail due to removed elements
  paused = true;

  //webgazer.stopVideo(); // uncomment if you want to stop the video from streaming

  //remove video element and canvas
  document.body.removeChild(videoElement);
  document.body.removeChild(videoElementCanvas);

  return src_webgazer;
};

/**
 * Stops the video camera from streaming and removes the video outlines
 * @return {webgazer} this
 */
src_webgazer.stopVideo = function() {
  // Stops the video from streaming
  videoStream.getTracks()[0].stop();

  // Removes the outline of the face
  document.body.removeChild( faceOverlay );

  // Removes the box around the face
  document.body.removeChild( faceFeedbackBox );

  return src_webgazer;
}


//PUBLIC FUNCTIONS - DEBUG

/**
 * Returns if the browser is compatible with webgazer
 * @return {boolean} if browser is compatible
 */
src_webgazer.detectCompatibility = function() {

  var getUserMedia = navigator.mediaDevices.getUserMedia ||
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  return getUserMedia !== undefined;
};

/**
 * Set whether the video preview is visible or not.
 * @param {*} bool
 * @return {webgazer} this
 */
src_webgazer.showVideo = function(val) {
  src_webgazer.params.showVideo = val;
  if( videoElement) {
    videoElement.style.display = val ? 'block' : 'none';
  }
  return src_webgazer;
};

/**
 * Set whether the face overlay is visible or not.
 * @param {*} bool
 * @return {webgazer} this
 */
src_webgazer.showFaceOverlay = function(val) {
  src_webgazer.params.showFaceOverlay = val;
  if( faceOverlay ) {
    faceOverlay.style.display = val ? 'block' : 'none';
  }
  return src_webgazer;
};

/**
 * Set whether the face feedback box is visible or not.
 * @param {*} bool
 * @return {webgazer} this
 */
src_webgazer.showFaceFeedbackBox = function(val) {

  src_webgazer.params.showFaceFeedbackBox = val;
  if( faceFeedbackBox ) {
    faceFeedbackBox.style.display = val ? 'block' : 'none';
  }
  return src_webgazer;
};

/**
 * Set whether the gaze prediction point(s) are visible or not. Multiple because of a trail of past dots.
 * @return {webgazer} this
 */
src_webgazer.showPredictionPoints = function(val) {
  src_webgazer.params.showGazeDot = val;
  if( gazeDot ) {
    gazeDot.style.display = val ? 'block' : 'none';
  }
  return src_webgazer;
};

/**
 * Define constraints on the video camera that is used. Useful for non-standard setups.
 * This can be set before calling webgazer.begin(), but also mid stream.
 *
 * @param {Object} constraints Example constraints object:
 * { width: { min: 320, ideal: 1280, max: 1920 }, height: { min: 240, ideal: 720, max: 1080 }, facingMode: "user" };
 *
 * Follows definition here:
 * https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints
 *
 * Note: The constraints set here are applied to the video track only. They also _replace_ any constraints, so be sure to set everything you need.
 * Warning: Setting a large video resolution will decrease performance, and may require
 */
src_webgazer.setCameraConstraints = async function(constraints) {
  var videoTrack,videoSettings;
  src_webgazer.params.camConstraints = constraints;

  // If the camera stream is already up...
  if(videoStream)
  {
    src_webgazer.pause();
    videoTrack = videoStream.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints( src_webgazer.params.camConstraints );
      videoSettings = videoTrack.getSettings();
      setInternalVideoBufferSizes( videoSettings.width, videoSettings.height );
    } catch(err) {
      console.log( err );
      return;
    }
    // Reset and recompute sizes of the video viewer.
    // This is only to adjust the feedback box, say, if the aspect ratio of the video has changed.
    src_webgazer.setVideoViewerSize( src_webgazer.params.videoViewerWidth, src_webgazer.params.videoViewerHeight )
    src_webgazer.getTracker().reset();
    await src_webgazer.resume();
  }
}


/**
 * Does what it says on the tin.
 * @param {*} width
 * @param {*} height
 */
function setInternalVideoBufferSizes( width, height ) {
  // Re-set the canvas size used by the internal processes
  if( videoElementCanvas )
  {
    videoElementCanvas.width = width;
    videoElementCanvas.height = height;
  }

  // Re-set the face overlay canvas size
  if( faceOverlay )
  {
    faceOverlay.width = width;
    faceOverlay.height = height;
  }
}

/**
 *  Set a static video file to be used instead of webcam video
 *  @param {String} videoLoc - video file location
 *  @return {webgazer} this
 */
src_webgazer.setStaticVideo = function(videoLoc) {
  debugVideoLoc = videoLoc;
  return src_webgazer;
};

/**
 * Set the size of the video viewer
 */
src_webgazer.setVideoViewerSize = function(w, h) {

  src_webgazer.params.videoViewerWidth = w;
  src_webgazer.params.videoViewerHeight = h;

  // Change the video viewer
  videoElement.style.width = w + 'px';
  videoElement.style.height = h + 'px';

  // Change the face overlay
  faceOverlay.style.width = w + 'px';
  faceOverlay.style.height = h + 'px';

  // Change the feedback box size
  // Compute the boundaries of the face overlay validation box based on the video size
  var tlwh = src_webgazer.computeValidationBoxSize()
  // Assign them to the object
  faceFeedbackBox.style.top = tlwh[0] + 'px';
  faceFeedbackBox.style.left = tlwh[1] + 'px';
  faceFeedbackBox.style.width = tlwh[2] + 'px';
  faceFeedbackBox.style.height = tlwh[3] + 'px';
};

/**
 *  Add the mouse click and move listeners that add training data.
 *  @return {webgazer} this
 */
src_webgazer.addMouseEventListeners = function() {
  addMouseEventListeners();
  return src_webgazer;
};

/**
 *  Remove the mouse click and move listeners that add training data.
 *  @return {webgazer} this
 */
src_webgazer.removeMouseEventListeners = function() {
  removeMouseEventListeners();
  return src_webgazer;
};

/**
 *  Records current screen position for current pupil features.
 *  @param {String} x - position on screen in the x axis
 *  @param {String} y - position on screen in the y axis
 *  @return {webgazer} this
 */
src_webgazer.recordScreenPosition = function(x, y) {
  // give this the same weight that a click gets.
  recordScreenPosition(x, y, eventTypes[0]);
  return src_webgazer;
};

/**
 *  Records current screen position for current pupil features.
 *  @param {String} x - position on screen in the x axis
 *  @param {String} y - position on screen in the y axis
 *  @param {String} eventType - "click" or "move", as per eventTypes
 *  @return {webgazer} this
 */
src_webgazer.recordScreenPosition = function(x, y, eventType) {
  // give this the same weight that a click gets.
  recordScreenPosition(x, y, eventType);
  return src_webgazer;
};

/*
 * Stores the position of the fifty most recent tracker preditions
 */
src_webgazer.storePoints = function(x, y, k) {
  xPast50[k] = x;
  yPast50[k] = y;
}

//SETTERS
/**
 * Sets the tracking module
 * @param {String} name - The name of the tracking module to use
 * @return {webgazer} this
 */
src_webgazer.setTracker = function(name) {
  if (curTrackerMap[name] === undefined) {
    console.log('Invalid tracker selection');
    console.log('Options are: ');
    for (var t in curTrackerMap) {
      console.log(t);
    }
    return src_webgazer;
  }
  curTracker = curTrackerMap[name]();
  return src_webgazer;
};

/**
 * Sets the regression module and clears any other regression modules
 * @param {String} name - The name of the regression module to use
 * @return {webgazer} this
 */
src_webgazer.setRegression = function(name) {
  if (regressionMap[name] === undefined) {
    console.log('Invalid regression selection');
    console.log('Options are: ');
    for (var reg in regressionMap) {
      console.log(reg);
    }
    return src_webgazer;
  }
  data = regs[0].getData();
  regs = [regressionMap[name]()];
  regs[0].setData(data);
  return src_webgazer;
};

/**
 * Adds a new tracker module so that it can be used by setTracker()
 * @param {String} name - the new name of the tracker
 * @param {Function} constructor - the constructor of the curTracker object
 * @return {webgazer} this
 */
src_webgazer.addTrackerModule = function(name, constructor) {
  curTrackerMap[name] = function() {
    return new constructor();
  };
};

/**
 * Adds a new regression module so that it can be used by setRegression() and addRegression()
 * @param {String} name - the new name of the regression
 * @param {Function} constructor - the constructor of the regression object
 */
src_webgazer.addRegressionModule = function(name, constructor) {
  regressionMap[name] = function() {
    return new constructor();
  };
};

/**
 * Adds a new regression module to the list of regression modules, seeding its data from the first regression module
 * @param {String} name - the string name of the regression module to add
 * @return {webgazer} this
 */
src_webgazer.addRegression = function(name) {
  var newReg = regressionMap[name]();
  data = regs[0].getData();
  newReg.setData(data);
  regs.push(newReg);
  return src_webgazer;
};

/**
 * Sets a callback to be executed on every gaze event (currently all time steps)
 * @param {function} listener - The callback function to call (it must be like function(data, elapsedTime))
 * @return {webgazer} this
 */
src_webgazer.setGazeListener = function(listener) {
  callback = listener;
  return src_webgazer;
};

/**
 * Removes the callback set by setGazeListener
 * @return {webgazer} this
 */
src_webgazer.clearGazeListener = function() {
  callback = nopCallback;
  return src_webgazer;
};

/**
 * Set the video element canvas; useful if you want to run WebGazer on your own canvas (e.g., on any random image).
 * @return The current video element canvas
 */
src_webgazer.setVideoElementCanvas = function(canvas) {
  videoElementCanvas = canvas;
}

/**
 * Clear data from localforage and from regs
 */
src_webgazer.clearData = async function() {
  clearData();
}


//GETTERS
/**
 * Returns the tracker currently in use
 * @return {tracker} an object following the tracker interface
 */
src_webgazer.getTracker = function() {
  return curTracker;
};

/**
 * Returns the regression currently in use
 * @return {Array.<Object>} an array of regression objects following the regression interface
 */
src_webgazer.getRegression = function() {
  return regs;
};

/**
 * Requests an immediate prediction
 * @return {object} prediction data object
 */
src_webgazer.getCurrentPrediction = function(regIndex) {
  return getPrediction(regIndex);
};

/**
 * returns the different event types that may be passed to regressions when calling regression.addData()
 * @return {Array} array of strings where each string is an event type
 */
src_webgazer.params.getEventTypes = function() {
  return eventTypes.slice();
}

/**
 * Get the video element canvas that WebGazer uses internally on which to run its face tracker.
 * @return The current video element canvas
 */
src_webgazer.getVideoElementCanvas = function() {
  return videoElementCanvas;
}

/**
 * @return array [a,b] where a is width ratio and b is height ratio
 */
src_webgazer.getVideoPreviewToCameraResolutionRatio = function() {
  return [src_webgazer.params.videoViewerWidth / videoElement.videoWidth, src_webgazer.params.videoViewerHeight / videoElement.videoHeight];
}

/*
 * Gets the fifty most recent tracker preditions
 */
src_webgazer.getStoredPoints = function() {
  return [xPast50, yPast50];
}

/* harmony default export */ var src = __webpack_exports__["default"] = (src_webgazer);


/***/ })

/******/ })["default"];
//# sourceMappingURL=webgazer.commonjs2.js.map