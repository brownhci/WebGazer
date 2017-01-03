import { ObjectDetect } from '../../build/tmp/dependencies'

/**
 * Constructor for Js_objectdetectGaze which captures face and eye positions using the js_objectdetect library
 * @alias module:Js_objectdetectGaze
 * @exports Js_objectdetectGaze
 */
var Js_objectdetectGaze = function () {
};

/**
 * The Js_objectdetectGaze object name
 * @type {string}
 */
Js_objectdetectGaze.prototype.name = 'js_objectdetect';

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {HTMLCanvasElement} imageCanvas - canvas corresponding to the webcam stream
 * @return {Object} the two eye-patches, first left, then right eye
 */
Js_objectdetectGaze.prototype.getEyePatches = function ( imageCanvas ) {

    // Check input consistency
    if ( !imageCanvas ) {
        console.error( "Unable to process null canvas !" );
        return null;
    }

    var canvasWidth = imageCanvas.width;
    if ( !canvasWidth ) {
        console.error( "Unable to process canvas with null width !!!" );
        return null;
    }

    var canvasHeight = imageCanvas.height;
    if ( !canvasHeight ) {
        console.error( "Unable to process canvas with null height !!!" );
        return null;
    }

    var canvasContext = imageCanvas.getContext( '2d' );
    if ( !canvasContext ) {
        console.error( "Unable to process null canvas context !!!" );
        return null;
    }

    /*
     FACE DETECTION
     */
    var face = this.detectFace( imageCanvas );
    if ( !face || !face.length ) {
        console.error( "Unable to process empty or null faces !!!" );
        return null;
    }

    var faceOffsetX = Math.floor( face[ 0 ] );
    if ( isNaN( faceOffsetX ) ) {
        console.error( "Unable to process x offset as NaN value !!!" );
        return null;
    }

    var faceOffsetY = Math.floor( face[ 1 ] );
    if ( isNaN( faceOffsetY ) ) {
        console.error( "Unable to process y offset as NaN value !!!" );
        return null;
    }

    var faceWidth = Math.floor( face[ 2 ] );
    if ( isNaN( faceWidth ) ) {
        console.error( "Unable to process face width as NaN value !!!" );
        return null;
    }

    var faceHalfHeight = Math.floor( face[ 3 ] / 2 );
    if ( isNaN( faceHalfHeight ) ) {
        console.error( "Unable to process face height as NaN value !!!" );
        return null;
    }

    /*
     EYES DETECTION
     */
    //current ImageData that correspond to the working image.
    //It can be the whole canvas if the face detection failed or only the upper half of the face to avoid unnecessary computations
    //Todo: The eyes are located only in a small portion of the image !
    //Todo: Need to defined precisely witch region about the returned context instead the half face !
    var workingImage = canvasContext.getImageData( faceOffsetX, faceOffsetY, faceWidth, faceHalfHeight );

    var eyes = this.detectEyes( workingImage );
    if ( !eyes || eyes.length !== 2 ) {
        console.error( "Unable to process null or single eye !!!" );
        return null;
    }

    var leftEyeOffsetX = Math.floor( eyes[ 0 ][ 0 ] ) + faceOffsetX;
    var leftEyeOffsetY = Math.floor( eyes[ 0 ][ 1 ] ) + faceOffsetY;
    var leftEyeWidth   = Math.floor( eyes[ 0 ][ 2 ] );
    var leftEyeHeight  = Math.floor( eyes[ 0 ][ 3 ] );
    if ( !leftEyeWidth || !leftEyeHeight ) {
        console.error( 'The left eye had zero width or height !!!' );
        return null;
    }

    var rightEyeOffsetX = Math.floor( eyes[ 1 ][ 0 ] ) + faceOffsetX;
    var rightEyeOffsetY = Math.floor( eyes[ 1 ][ 1 ] ) + faceOffsetY;
    var rightEyeWidth   = Math.floor( eyes[ 1 ][ 2 ] );
    var rightEyeHeight  = Math.floor( eyes[ 1 ][ 3 ] );
    if ( !rightEyeWidth || !rightEyeHeight ) {
        console.error( 'The right eye had zero width or height !!!' );
        return null;
    }

    return {
        left:  {
            patch:  canvasContext.getImageData( leftEyeOffsetX, leftEyeOffsetY, leftEyeWidth, leftEyeHeight ),
            imageX: leftEyeOffsetX,
            imageY: leftEyeOffsetY,
            width:  leftEyeWidth,
            height: leftEyeHeight
        },
        right: {
            patch:  canvasContext.getImageData( rightEyeOffsetX, rightEyeOffsetY, rightEyeWidth, rightEyeHeight ),
            imageX: rightEyeOffsetX,
            imageY: rightEyeOffsetY,
            width:  rightEyeWidth,
            height: rightEyeHeight
        }
    };
};

/**
 * Performs eye detection on the passed imageData
 * @param {ImageData} imageData - either the whole canvas or the upper half of the head
 * @param {Number} workingImageWidth - width of working image
 * @param {Number} workingImageHeight - height of working image
 * @return {Array} eyes - array of rectangle information.
 */
Js_objectdetectGaze.prototype.detectEyes = function ( imageData ) {

    // Check input consistency
    if ( !imageData ) {
        console.error( "Unable to process null image data !" );
        return null;
    }

    var imageDataWidth = imageData.width;
    if ( !imageDataWidth ) {
        console.error( "Unable to process image data with null width !!!" );
        return null;
    }

    var imageDataHeight = imageData.height;
    if ( !imageDataHeight ) {
        console.error( "Unable to process image data with null height !!!" );
        return null;
    }

    var tempCanvas    = document.createElement( 'canvas' );
    tempCanvas.width  = imageDataWidth;
    tempCanvas.height = imageDataHeight;
    tempCanvas.getContext( '2d' )
              .putImageData( imageData, 0, 0 );

    //Following js_objectdetect conventions resize imageData
    var width            = ~~(60 * imageDataWidth / imageDataHeight);
    var height           = 60;
    var detector         = new ObjectDetect.detector( width, height, 1.1, ObjectDetect.eye );
    var intermediateEyes = detector.detect( tempCanvas, 0 );
    var eyes             = this.mergeRectangles( intermediateEyes );
    if ( !eyes || !eyes.length ) {
        console.error( 'js_objectdetect could not detect two eyes in the video !!!' );
        return null;
    }

    // Rescale coordinates from detector to video coordinate space:
    var detectorCanvas           = detector.canvas;
    var eyeWidthScaleMultiplier  = imageDataWidth / detectorCanvas.width;
    var eyeHeightScaleMultiplier = imageDataHeight / detectorCanvas.height;

    for ( var i = 0, numberOfEyes = eyes.length ; i < numberOfEyes ; i++ ) {
        eyes[ i ][ 0 ] *= eyeWidthScaleMultiplier;
        eyes[ i ][ 1 ] *= eyeHeightScaleMultiplier;
        eyes[ i ][ 2 ] *= eyeWidthScaleMultiplier;
        eyes[ i ][ 3 ] *= eyeHeightScaleMultiplier;
    }

    eyes.sort( function ( a, b ) {
        return a[ 0 ] - b[ 0 ]
    } );

    return eyes;

};

/**
 * Performs face detection on the passed canvas
 * @param {HTMLCanvasElement} imageCanvas - whole video canvas
 * @param {Number} workingImageWidth - width of imageCanvas
 * @param {Number} workingImageHeight - height of imageCanvas
 * @return {Array.<Array.<Number>>} face - array of rectangle information
 */
Js_objectdetectGaze.prototype.detectFace = function ( imageCanvas ) {

    var workingImageWidth  = imageCanvas.width;
    var workingImageHeight = imageCanvas.height;
    var width              = ~~(60 * workingImageWidth / workingImageHeight);
    var height             = 60;
    var detector           = new ObjectDetect.detector( width, height, 1.1, ObjectDetect.frontalface_alt );
    var intermediateFaces  = detector.detect( imageCanvas, 1 );
    var face               = this.findLargestRectangle( intermediateFaces );

    // Rescale coordinates from detector to video coordinate space:
    var detectorCanvas            = detector.canvas;
    var faceWidthScaleMultiplier  = workingImageWidth / detectorCanvas.width;
    var faceHeightScaleMultiplier = workingImageHeight / detectorCanvas.height;

    face[ 0 ] *= faceWidthScaleMultiplier;
    face[ 1 ] *= faceHeightScaleMultiplier;
    face[ 2 ] *= faceWidthScaleMultiplier;
    face[ 3 ] *= faceHeightScaleMultiplier;

    return face;

};

/**
 * Goes through an array of rectangles and returns the one with the largest area
 * @param {Array.<Array.<Number>>} rectangles - array of arrays of format [xCoordinate, yCoordinate, width, height]
 * @return {Array} largestRectangle = [xCoordinate, yCoordinate, width, height]
 */
Js_objectdetectGaze.prototype.findLargestRectangle = function ( rectangles ) {

    var largestRectangle = [];
    var largestArea      = 0;
    var area             = 0;

    for ( var i = 0, numberOfRectangles = rectangles.length ; i < numberOfRectangles ; ++i ) {
        area = rectangles[ i ][ 2 ] * rectangles[ i ][ 3 ];
        if ( area > largestArea ) {
            largestArea      = area;
            largestRectangle = rectangles[ i ];
        }
    }

    return largestRectangle;

};

/**
 * Merges detected rectangles in clusters
 * Taken from trackingjs and modified slightly to reflect that rectangles are arrays and not objects
 * @param  {Array.<Array.<Number>>} rects - rectangles to be clustered
 * @return {Array.<Array.<Number>>} result merged rectangles
 */
Js_objectdetectGaze.prototype.mergeRectangles = function ( rects ) {

    var numberOfRects = rects.length;
    var disjointSet   = new tracking.DisjointSet( numberOfRects );
    var rectOne       = [];
    var rectTwo       = [];
    var x1            = 0;
    var y1            = 0;
    var x2            = 0;
    var y2            = 0;
    var overlap       = 0;
    var area1         = 0;
    var area2         = 0;
    var i, j;
    for ( i = 0 ; i < numberOfRects ; i++ ) {
        rectOne = rects[ i ];
        for ( j = 0 ; j < numberOfRects ; j++ ) {
            rectTwo = rects[ j ];
            if ( tracking.Math.intersectRect( rectOne[ 0 ], rectOne[ 1 ], rectOne[ 0 ] + rectOne[ 2 ], rectOne[ 1 ] + rectOne[ 3 ], rectTwo[ 0 ], rectTwo[ 1 ], rectTwo[ 0 ] + rectTwo[ 2 ], rectTwo[ 1 ] + rectTwo[ 3 ] ) ) {
                x1      = Math.max( rectOne[ 0 ], rectTwo[ 0 ] );
                y1      = Math.max( rectOne[ 1 ], rectTwo[ 1 ] );
                x2      = Math.min( rectOne[ 0 ] + rectOne[ 2 ], rectTwo[ 0 ] + rectTwo[ 2 ] );
                y2      = Math.min( rectOne[ 1 ] + rectOne[ 3 ], rectTwo[ 1 ] + rectTwo[ 3 ] );
                overlap = (x1 - x2) * (y1 - y2);
                area1   = (rectOne[ 2 ] * rectOne[ 3 ]);
                area2   = (rectTwo[ 2 ] * rectTwo[ 3 ]);

                if ( (overlap / (area1 * (area1 / area2)) >= 0.5) &&
                    (overlap / (area2 * (area1 / area2)) >= 0.5) ) {
                    disjointSet.union( i, j );
                }
            }
        }
    }

    var map = {};
    var rep = undefined;
    for ( var k = 0, numberOfSet = disjointSet.length ; k < numberOfSet ; k++ ) {
        rep = disjointSet.find( k );
        if ( !map[ rep ] ) {
            map[ rep ] = {
                total:  1,
                x:      rects[ k ][ 0 ],
                y:      rects[ k ][ 1 ],
                width:  rects[ k ][ 2 ],
                height: rects[ k ][ 3 ]
            };
            continue;
        }
        map[ rep ].total++;
        map[ rep ].x += rects[ k ][ 0 ];
        map[ rep ].y += rects[ k ][ 1 ];
        map[ rep ].width += rects[ k ][ 2 ];
        map[ rep ].height += rects[ k ][ 3 ];
    }

    var result = [];
    var rect   = null;
    Object.keys( map )
          .forEach( function ( key ) {
              rect = map[ key ];
              result.push( [
                  ((rect.x / rect.total + 0.5) | 0),
                  ((rect.y / rect.total + 0.5) | 0),
                  ((rect.width / rect.total + 0.5) | 0),
                  ((rect.height / rect.total + 0.5) | 0)
              ] );
          } );
    return result;
};

export { Js_objectdetectGaze }
