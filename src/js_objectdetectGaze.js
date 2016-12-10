(function(window) {
    "use strict";

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};

    /**
     * Constructor of Js_objectdetectGaze
     * @constructor
     */
    var Js_objectdetectGaze = function() {};

    webgazer.tracker.Js_objectdetectGaze = Js_objectdetectGaze;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {Number} width - of imageCanvas
     * @param  {Number} height - of imageCanvas
     * @return {Object} the two eye-patches, first left, then right eye
     */
    Js_objectdetectGaze.prototype.getEyePatches = function(imageCanvas, width, height) {

        if (imageCanvas.width == 0) {
            return null;
        }

        //current ImageData that correspond to the working image. 
        //It can be the whole canvas if the face detection failed or only the upper half of the face to avoid unnecessary computations
        var workingImage = imageCanvas.getContext('2d').getImageData(0,0,width,height);

        var face = this.detectFace(imageCanvas, width, height);

        //offsets of the working image from the top left corner of the video canvas
        var offsetX = 0;
        var offsetY = 0;

        //if face has been detected
        if (face.length>0 && !isNaN(face[0]) && !isNaN(face[1]) && !isNaN(face[2]) && !isNaN(face[3])){
            //working image is restricted on upper half of detected face
            workingImage = imageCanvas.getContext('2d').getImageData(Math.floor(face[0]), Math.floor(face[1]), Math.floor(face[2]), Math.floor(face[3]/2));
            width = Math.floor(face[2]);
            height = Math.floor(face[3]/2);
            //offset from detected face
            offsetX = Math.floor(face[0]);
            offsetY = Math.floor(face[1]);  
        }

        var eyes = this.detectEyes(workingImage, width, height);
        if (eyes == null){
            return null;
        }

        var eyeObjs = {};
        var leftImageData = imageCanvas.getContext('2d').getImageData(Math.floor(eyes[0][0])+offsetX, Math.floor(eyes[0][1])+offsetY, Math.floor(eyes[0][2]), Math.floor(eyes[0][3]));
        eyeObjs.left = {
            patch: leftImageData,
            imagex: eyes[0][0]+offsetX,
            imagey: eyes[0][1]+offsetY,
            width: eyes[0][2],
            height: eyes[0][3]
        };
 
        var rightImageData = imageCanvas.getContext('2d').getImageData(Math.floor(eyes[1][0])+offsetX, Math.floor(eyes[1][1])+offsetY, Math.floor(eyes[1][2]), Math.floor(eyes[1][3]));
        eyeObjs.right = {
            patch: rightImageData,
            imagex: eyes[1][0]+offsetX,
            imagey: eyes[1][1]+offsetY,
            width: eyes[1][2],
            height: eyes[1][3]        
        };
      
        if (leftImageData.width == 0 || rightImageData.width == 0) {
            console.log('an eye patch had zero width');
            return null;
        }

        return eyeObjs;
    };

    /**
     * Performs eye detection on the passed workingImage
     * @param {ImageData} workingImage - either the whole canvas or the upper half of the head
     * @param {Number} workingImageWidth - width of working image
     * @param {Number} workingImageHeight - height of working image
     * @return {Array} eyes - array of rectangle information.
     */
    Js_objectdetectGaze.prototype.detectEyes = function(workingImage, workingImageWidth, workingImageHeight){    

        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = workingImageWidth;
        tempCanvas.height = workingImageHeight;
        tempCanvas.getContext('2d').putImageData(workingImage,0,0);
        
        //Following js_objectdetect conventions resize workingImage
        var eyes = [];
        var intermediateEyes = [];
        var width = ~~(60 * workingImageWidth / workingImageHeight);
        var height = 60;
        var detector = new objectdetect.detector(width, height, 1.1, objectdetect.eye);
        intermediateEyes = detector.detect(tempCanvas, 0);
        eyes = this.mergeRectangles(intermediateEyes);
        if (typeof eyes !== 'undefined'){
            for(var i=0; i< eyes.length; i++){
                // Rescale coordinates from detector to video coordinate space:
                eyes[i][0] *= workingImageWidth / detector.canvas.width;
                eyes[i][1] *= workingImageHeight / detector.canvas.height;
                eyes[i][2] *= workingImageWidth / detector.canvas.width;
                eyes[i][3] *= workingImageHeight / detector.canvas.height;
            }

            eyes.sort(function(a,b) {
              return a[0]-b[0]
            });
            return eyes;    
        }       
        else{
            console.log('js_objectdetect could not detect two eyes in the video');
            return null;
        }
    };

    /**
     * Performs face detection on the passed canvas
     * @param {Canvas} imageCanvas - whole video canvas
     * @param {Number} workingImageWidth - width of imageCanvas
     * @param {Number} workingImageHeight - height of imageCanvas
     * @return {Array.<Array.<Number>>} face - array of rectangle information
     */
    Js_objectdetectGaze.prototype.detectFace = function(imageCanvas, workingImageWidth, workingImageHeight){
        var intermediateFaces = [];
        var face = [];
        var width = ~~(60 * workingImageWidth / workingImageHeight);
        var height = 60;
        var detector = new objectdetect.detector(width, height, 1.1, objectdetect.frontalface_alt);
        intermediateFaces = detector.detect(imageCanvas, 1);
        face = this.findLargestRectangle(intermediateFaces);
        // Rescale coordinates from detector to video coordinate space:
        face[0] *= workingImageWidth / detector.canvas.width;
        face[1] *= workingImageHeight / detector.canvas.height;
        face[2] *= workingImageWidth / detector.canvas.width;
        face[3] *= workingImageHeight / detector.canvas.height;
        return face;
    };

    /**
     * Goes through an array of rectangles and returns the one with the largest area
     * @param {Array.<Array.<Number>>} rectangles - array of arrays of format [xCoordinate, yCoordinate, width, height]
     * @return {Array} largestRectangle = [xCoordinate, yCoordinate, width, height]
     */
    Js_objectdetectGaze.prototype.findLargestRectangle = function(rectangles){
        var largestArea = 0;
        var area = 0;
        var largestRectangle = [];
        for (var i = 0; i < rectangles.length; ++i){
            area = rectangles[i][2] * rectangles[i][3];
            if (area > largestArea){
                largestArea = area;
                largestRectangle = rectangles[i];
            }
        }
        return largestRectangle;
    };

    /**
     * Merges detected rectangles in clusters
     * Taken from trackingjs and modified slightly to reflect that rectangles are arrays and not objects
     * @param  {Array.<Array.<Number>>} rects - rectangles to me clustered
     * @return {Array.<Array.<Number>>} result merged rectangles
     */
    Js_objectdetectGaze.prototype.mergeRectangles = function(rects){
        var disjointSet = new tracking.DisjointSet(rects.length);

        for (var i = 0; i < rects.length; i++){
          var r1 = rects[i];
          for (var j = 0; j < rects.length; j++){
            var r2 = rects[j];
            if (tracking.Math.intersectRect(r1[0], r1[1], r1[0] + r1[2], r1[1] + r1[3], r2[0], r2[1], r2[0] + r2[2], r2[1] + r2[3])){
              var x1 = Math.max(r1[0], r2[0]);
              var y1 = Math.max(r1[1], r2[1]);
              var x2 = Math.min(r1[0] + r1[2], r2[0] + r2[2]);
              var y2 = Math.min(r1[1] + r1[3], r2[1] + r2[3]);
              var overlap = (x1 - x2) * (y1 - y2);
              var area1 = (r1[2] * r1[3]);
              var area2 = (r2[2] * r2[3]);

              if ((overlap / (area1 * (area1 / area2)) >= 0.5) &&
                (overlap / (area2 * (area1 / area2)) >= 0.5)){
                disjointSet.union(i, j);
              }
            }
          }
        }

        var map ={};
        for (var k = 0; k < disjointSet.length; k++){
          var rep = disjointSet.find(k);
          if (!map[rep]){
            map[rep] ={
              total: 1,
              width: rects[k][2],
              height: rects[k][3],
              x: rects[k][0],
              y: rects[k][1]
            };
            continue;
          }
          map[rep].total++;
          map[rep].width += rects[k][2];
          map[rep].height += rects[k][3];
          map[rep].x += rects[k][0];
          map[rep].y += rects[k][1];
        }

        var result = [];
        Object.keys(map).forEach(function(key){
          var rect = map[key];
          result.push([((rect.x / rect.total + 0.5) | 0), ((rect.y / rect.total + 0.5) | 0), ((rect.width / rect.total + 0.5) | 0), ((rect.height / rect.total + 0.5) | 0)]);
        });
        return result;
    };
    
    /**
     * The Js_objectdetectGaze object name
     * @type {string}
     */
    Js_objectdetectGaze.prototype.name = 'js_objectdetect';

}(window));
