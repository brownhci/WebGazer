/**
 * TrackingjsGaze constructor which uses the trackingjs library in order to find the head and eye positions
 * @alias module:TrackingjsGaze
 * @constructor
 */
var TrackingjsGaze = function () {
};

/**
 * The TrackingjsGaze object name
 * @type {string}
 */
TrackingjsGaze.prototype.name = 'trackingjs';

/**
 * Isolates the two patches that correspond to the user's eyes
 * @param  {HTMLCanvasElement} imageCanvas - canvas corresponding to the webcam stream
 * @param  {Number} width - of imageCanvas
 * @param  {Number} height - of imageCanvas
 * @return {Object} the two eye-patches, first left, then right eye
 */
TrackingjsGaze.prototype.getEyePatches = function ( imageCanvas, width, height ) {

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
    var face = this.detectFace( imageCanvas, canvasWidth, canvasHeight );
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
 * Performs eye detection on the passed working image
 * @param {ImageData} imageData - either the whole canvas or the upper half of the head
 * @return {Array} eyes - array of rectangle information.
 */
TrackingjsGaze.prototype.detectEyes = function ( imageData ) {

    var ViolaJones       = tracking.ViolaJones;
    var pixels           = imageData.data;
    var width            = imageData.width;
    var height           = imageData.height;
    var eyes             = [];
    var intermediateEyes = [];

    ViolaJones
        .detect( pixels, width, height, 0.5, 2, 1.7, 0.1, ViolaJones.classifiers[ 'eye' ] )
        .forEach( function ( rect ) {
            intermediateEyes.push( [ rect.x, rect.y, rect.width, rect.height ] );
        } );

    var numberOfintermediateEyes = intermediateEyes.length;
    if ( numberOfintermediateEyes <= 1 ) {
        console.log( 'tracking.js could not detect two eyes in the video' );
        return null;
    }

    //find the two eyes with the shortest y distance
    var minimumYDistance = Number.MAX_VALUE;
    var YDistance        = 0;
    var firstEye         = null;
    var secondEye        = null;
    var i, j;
    for ( i = 0 ; i < numberOfintermediateEyes ; i++ ) {
        firstEye = intermediateEyes[ i ];
        for ( j = i + 1 ; j < numberOfintermediateEyes ; j++ ) {
            secondEye = intermediateEyes[ j ];
            YDistance = Math.abs( Math.floor( firstEye[ 1 ] ) - Math.floor( secondEye[ 1 ] ) );
            if ( YDistance < minimumYDistance ) {
                minimumYDistance = YDistance;
                eyes[ 0 ]        = firstEye;
                eyes[ 1 ]        = secondEye;
            }
        }
    }

    eyes.sort( function ( a, b ) {
        return a[ 0 ] - b[ 0 ]
    } );

    return eyes;

};

/**
 * Performs face detection on the passed canvas
 * @param {ImageData} imageData - whole video canvas
 * @return {Array} face - array of rectangle information
 */
TrackingjsGaze.prototype.detectFace = function ( imageData ) {

    var ViolaJones        = tracking.ViolaJones;
    var width             = imageData.width;
    var height            = imageData.height;
    var pixels            = imageData.data;
    var intermediateFaces = [];

    ViolaJones
        .detect( pixels, width, height, 2, 1.25, 2, 0.1, ViolaJones.classifiers[ 'face' ] )
        .forEach( function ( rect ) {
            intermediateFaces.push( [ rect.x, rect.y, rect.width, rect.height ] );
        } );

    return this.findLargestRectangle( intermediateFaces );

};

/**
 * Goes through an array of rectangles and returns the one with the largest area
 * @param {Array.<Array.<Number>>} rectangles - array of arrays of format [xCoordinate, yCoordinate, width, height]
 * @return {Array} largestRectangle = [xCoordinate, yCoordinate, width, height]
 */
TrackingjsGaze.prototype.findLargestRectangle = function ( rectangles ) {

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

export { TrackingjsGaze };
