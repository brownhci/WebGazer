(function(window) {
    "use strict";

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};

    /**
     * Constructor of TrackingjsGaze object
     * @constructor
     */
    var TrackingjsGaze = function() {};

    webgazer.tracker.TrackingjsGaze = TrackingjsGaze;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {Number} width - of imageCanvas
     * @param  {Number} height - of imageCanvas
     * @return {Object} the two eye-patches, first left, then right eye
     */
    TrackingjsGaze.prototype.getEyePatches = function(imageCanvas, width, height) {

        if (imageCanvas.width == 0) {
            return null;
        }

        //current ImageData that correspond to the working image. 
        //It can be the whole canvas if the face detection failed or only the upper half of the face to avoid unnecessary computations
        var workingImage = imageCanvas.getContext('2d').getImageData(0,0,width,height);

        var face = this.detectFace(workingImage, width, height);

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
        console.log(eyes);
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
     * Performs eye detection on the passed working image
     * @param {ImageData} workingImage - either the whole canvas or the upper half of the head
     * @param {Number} width - width of working image
     * @param {Number} height - height of working image
     * @return {Array} eyes - array of rectangle information. 
     */
    TrackingjsGaze.prototype.detectEyes = function(workingImage, width, height){         
        var eyes = [];
        var intermediateEyes = [];
        var pixels = workingImage.data;
        tracking.ViolaJones.detect(pixels, width, height, 0.5, 2, 1.7, 0.1, tracking.ViolaJones.classifiers['eye']).forEach(function(rect){
                var intermediateEye = [rect.x, rect.y, rect.width, rect.height];
                intermediateEyes.push(intermediateEye);
        });
        if (intermediateEyes.length>1){
            //find the two eyes with the shortest y distance
            var minimumYDistance = 1000;
            var eyes = [];

            for(var i=0; i < intermediateEyes.length; i++){
                for(var j = i+1; j < intermediateEyes.length; j++){
                    var YDistance = Math.abs(Math.floor(intermediateEyes[i][1]) - Math.floor(intermediateEyes[j][1]));
                    if(YDistance <= minimumYDistance){
                        minimumYDistance = YDistance;
                        eyes[0] = intermediateEyes[i];
                        eyes[1] = intermediateEyes[j];
                    }                       
                }
            }

            eyes.sort(function(a,b) {
              return a[0]-b[0]
            });
            return eyes;
        }
        else{
            console.log('tracking.js could not detect two eyes in the video');
            return null;
        }
    };

    /**
     * Performs face detection on the passed canvas
     * @param {ImageData} workingImage - whole video canvas
     * @param {Number} width - width of imageCanvas
     * @param {Number} height - height of imageCanvas
     * @return {Array} face - array of rectangle information
     */
    TrackingjsGaze.prototype.detectFace = function(workingImage, width, height){
        var intermediateFaces = [];
        var face = [];

        // Detect faces in the image
        var pixels = workingImage.data;
        tracking.ViolaJones.detect(pixels, width, height, 2, 1.25, 2, 0.1, tracking.ViolaJones.classifiers['face']).forEach(function(rect){
                var intermediateFace = [rect.x, rect.y, rect.width, rect.height];
                intermediateFaces.push(intermediateFace);
        });
        face = this.findLargestRectangle(intermediateFaces);
        return face;
    };

    /**
     * Goes through an array of rectangles and returns the one with the largest area
     * @param {Array.<Array.<Number>>} rectangles - array of arrays of format [xCoordinate, yCoordinate, width, height]
     * @return {Array} largestRectangle = [xCoordinate, yCoordinate, width, height]
     */
    TrackingjsGaze.prototype.findLargestRectangle = function(rectangles){
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
     * The TrackingjsGaze object name
     * @type {string}
     */
    TrackingjsGaze.prototype.name = 'trackingjs';
    
}(window));
