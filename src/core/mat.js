//TODO: mat should be rename Matrix
//TODO: Matrix should be an object and not a library !

/**
 * Transposes an mxn array
 * @param {Array.<Array.<Number>>} matrix - of "M x N" dimensionality
 * @return {Array.<Array.<Number>>} transposed matrix
 */
export function transpose ( matrix ) {

    var matrixLength           = matrix.length;
    var firstIndexMatrixLength = matrix[ 0 ].length;
    var transposedMatrix       = new Array( firstIndexMatrixLength );
    var i, j;

    for ( i = 0 ; i < matrixLength ; i++ ) {
        for ( j = 0 ; j < firstIndexMatrixLength ; j++ ) {
            if ( i === 0 ) {
                transposedMatrix[ j ] = new Array( matrixLength );
            }
            transposedMatrix[ j ][ i ] = matrix[ i ][ j ];
        }
    }

    return transposedMatrix;

}

/**
 * Get a sub-matrix of matrix
 * @param {Array.<Array.<Number>>} matrix - original matrix
 * @param {Array.<Number>} row - Array of row indices
 * @param {Number} initialColumnIndex - Initial column index
 * @param {Number} finalColumnIndex - Final column index
 * @returns {Array.<Array.<Number>>} The sub-matrix matrix(r(:),j0:j1)
 */
export function getMatrix ( matrix, row, initialColumnIndex, finalColumnIndex ) {

    var newMatrix        = new Array( row.length );
    var deltaColumnIndex = finalColumnIndex - initialColumnIndex + 1;
    var numberOfRow      = row.length;
    var rowIndex, columnIndex;

    for ( rowIndex = 0 ; rowIndex < numberOfRow ; rowIndex++ ) {
        newMatrix[ rowIndex ] = new Array( deltaColumnIndex );
        for ( columnIndex = initialColumnIndex ; columnIndex <= finalColumnIndex ; columnIndex++ ) {
            newMatrix[ rowIndex ][ columnIndex - initialColumnIndex ] = matrix[ row[ rowIndex ] ][ columnIndex ];
        }
    }

    return newMatrix;

}

/**
 * Get a submatrix of matrix
 * @param {Array.<Array.<Number>>} matrix - original matrix
 * @param {Number} initialRowIndex - Initial row index
 * @param {Number} finalRowIndex - Final row index
 * @param {Number} initialColumnIndex - Initial column index
 * @param {Number} finalColumnIndex - Final column index
 * @return {Array.<Array.<Number>>} The sub-matrix matrix(i0:i1,j0:j1)
 */
export function getSubMatrix ( matrix, initialRowIndex, finalRowIndex, initialColumnIndex, finalColumnIndex ) {

    var size      = finalColumnIndex - initialColumnIndex + 1;
    var subMatrix = new Array( finalRowIndex - initialRowIndex + 1 );
    var subIndex  = 0;
    var rowIndex, columnIndex;

    for ( rowIndex = initialRowIndex ; rowIndex <= finalRowIndex ; rowIndex++ ) {

        subIndex              = rowIndex - initialRowIndex;
        subMatrix[ subIndex ] = new Array( size );

        for ( columnIndex = initialColumnIndex ; columnIndex <= finalColumnIndex ; columnIndex++ ) {
            subMatrix[ subIndex ][ columnIndex - initialColumnIndex ] = matrix[ rowIndex ][ columnIndex ];
        }
    }

    return subMatrix;

}

/**
 * Linear algebraic matrix multiplication, matrix1 * matrix2
 * @param {Array.<Array.<Number>>} firstMatrix
 * @param {Array.<Array.<Number>>} secondMatrix
 * @return {Array.<Array.<Number>>} Matrix product, matrix1 * matrix2
 */
export function multiply ( firstMatrix, secondMatrix ) {

    var firstMatrixLength     = firstMatrix.length;
    var firstMatrixRowLength  = firstMatrix[ 0 ].length;
    var secondMatrixLength    = secondMatrix.length;
    var secondMatrixRowLength = secondMatrix[ 0 ].length;
    var multipliedMatrix      = new Array( firstMatrixLength );
    var secondMatrixColumn    = new Array( firstMatrixRowLength );
    var firstMatrixRow        = undefined;
    var multiplicationResult  = 0;
    var i, j, k, l;

    if ( secondMatrixLength !== firstMatrixRowLength ) {
        console.warn( "Matrix inner dimensions must agree." );
    }

    for ( i = 0 ; i < secondMatrixRowLength ; i++ ) {

        for ( j = 0 ; j < firstMatrixRowLength ; j++ ) {
            secondMatrixColumn[ j ] = secondMatrix[ j ][ i ];
        }

        for ( k = 0 ; k < firstMatrixLength ; k++ ) {

            if ( i === 0 ) {
                multipliedMatrix[ k ] = new Array( secondMatrixRowLength );
            }

            firstMatrixRow       = firstMatrix[ k ];
            multiplicationResult = 0;
            for ( l = 0 ; l < firstMatrixRowLength ; l++ ) {
                multiplicationResult += firstMatrixRow[ l ] * secondMatrixColumn[ l ];
            }
            multipliedMatrix[ k ][ i ] = multiplicationResult;
        }

    }

    return multipliedMatrix;

}

/**
 * LUDecomposition to solve A*X = B, based on WEKA code
 * @param {Array.<Array.<Number>>} leftMatrix - left matrix of equation to be solved
 * @param {Array.<Array.<Number>>} rightMatrix - right matrix of equation to be solved
 * @return {Array.<Array.<Number>>} X so that L*U*X = B(piv,:)
 */
export function LUDecomposition ( leftMatrix, rightMatrix ) {

    var leftMatrixLength     = leftMatrix.length;
    var leftMatrixRowLength  = leftMatrix[ 0 ].length;
    var rightMatrixLength    = rightMatrix.length;
    var rightMatrixRowLength = rightMatrix[ 0 ].length;
    var pivotSign            = 1;

    var LU            = new Array( leftMatrixLength );
    var cacheLURow    = new Array( leftMatrixLength );
    var cacheLUColumn = new Array( leftMatrixLength );
    var pivot         = new Array( leftMatrixLength );
    var resultMatrix  = getMatrix( rightMatrix, pivot, 0, rightMatrixRowLength - 1 );

    if ( rightMatrixLength !== leftMatrixLength ) {
        console.warn( "Matrix row dimensions must agree." );
    }

    function fillLUMatrix () {

        var i, j;

        for ( i = 0 ; i < leftMatrixLength ; i++ ) {
            LU[ i ] = new Array( leftMatrixRowLength );
            for ( j = 0 ; j < leftMatrixRowLength ; j++ ) {
                LU[ i ][ j ] = leftMatrix[ i ][ j ];
            }
        }

    }

    function fillPivot () {

        var i;

        for ( i = 0 ; i < leftMatrixLength ; i++ ) {
            pivot[ i ] = i;
        }

    }

    function copyColumnToLocalizeReference ( columnIndex ) {

        var i;

        for ( i = 0 ; i < leftMatrixLength ; i++ ) {
            cacheLUColumn[ i ] = LU[ i ][ columnIndex ];
        }

    }

    function applyPreviousTransformation ( j ) {

        var kMax   = 0;
        var result = 0;
        var i, k;

        for ( i = 0 ; i < leftMatrixLength ; i++ ) {
            cacheLURow = LU[ i ];
            // Most of the time is spent in the following dot product.
            kMax       = Math.min( i, j );
            result     = 0;
            for ( k = 0 ; k < kMax ; k++ ) {
                result += cacheLURow[ k ] * cacheLUColumn[ k ];
            }
            cacheLURow[ j ] = cacheLUColumn[ i ] -= result;
        }

    }

    function findPivotAndExchange ( j ) {

        var p                  = j;
        var tempPivotValueForP = undefined;
        var tempLUValue        = undefined;
        var i, k;

        // Find
        for ( i = j + 1 ; i < leftMatrixLength ; i++ ) {
            if ( Math.abs( cacheLUColumn[ i ] ) > Math.abs( cacheLUColumn[ p ] ) ) {
                p = i;
            }
        }

        // Exchange
        if ( p != j ) {

            for ( k = 0 ; k < leftMatrixRowLength ; k++ ) {
                tempLUValue  = LU[ p ][ k ];
                LU[ p ][ k ] = LU[ j ][ k ];
                LU[ j ][ k ] = tempLUValue;
            }
            tempPivotValueForP = pivot[ p ];
            pivot[ p ]         = pivot[ j ];
            pivot[ j ]         = tempPivotValueForP;
            pivotSign          = -pivotSign;

        }

    }

    function computeMultipliers ( j ) {

        var i;

        if ( j < leftMatrixLength && LU[ j ][ j ] !== 0 ) {
            for ( i = j + 1 ; i < leftMatrixLength ; i++ ) {
                LU[ i ][ j ] /= LU[ j ][ j ];
            }
        }

    }

    function checkSingularMatrix () {

        var i;

        for ( i = 0 ; i < leftMatrixRowLength ; i++ ) {
            if ( LU[ i ][ i ] === 0 ) {
                console.warn( "Matrix is singular." )
            }
        }

    }

    // Solve L*Y = B(piv,:)
    function solveLower () {

        var i, j, k;

        for ( i = 0 ; i < leftMatrixRowLength ; i++ ) {
            for ( j = i + 1 ; j < leftMatrixRowLength ; j++ ) {
                for ( k = 0 ; k < rightMatrixRowLength ; k++ ) {
                    resultMatrix[ j ][ k ] -= resultMatrix[ i ][ k ] * LU[ j ][ i ];
                }
            }
        }

    }

    // Solve U*X = Y;
    function solveUpper () {

        var i, j, k, l;

        for ( i = leftMatrixRowLength - 1 ; i >= 0 ; i-- ) {
            for ( j = 0 ; j < rightMatrixRowLength ; j++ ) {
                resultMatrix[ i ][ j ] /= LU[ i ][ i ];
            }
            for ( k = 0 ; k < i ; k++ ) {
                for ( l = 0 ; l < rightMatrixRowLength ; l++ ) {
                    resultMatrix[ k ][ l ] -= resultMatrix[ i ][ l ] * LU[ k ][ i ];
                }
            }
        }

    }

    fillLUMatrix();
    fillPivot();

    // Outer loop.
    for ( var j = 0 ; j < leftMatrixRowLength ; j++ ) {

        // Make a copy of the j-th column to localize references.
        copyColumnToLocalizeReference( j );

        // Apply previous transformations.
        applyPreviousTransformation( j );

        // Find pivot and exchange if necessary.
        findPivotAndExchange( j );

        // Compute multipliers.
        computeMultipliers( j );

    }

    checkSingularMatrix();

    solveLower();
    solveUpper();

    return resultMatrix;

}

/**
 * Least squares solution of A*X = B, based on WEKA code
 * @param {Array.<Array.<Number>>} leftMatrix - left side matrix to be solved
 * @param {Array.<Array.<Number>>} rightMatrix - a matrix with as many rows as A and any number of columns.
 * @return {Array.<Array.<Number>>} X - that minimizes the two norms of QR*X-B.
 */
export function QRDecomposition ( leftMatrix, rightMatrix ) {

    var leftMatrixLength     = leftMatrix.length;
    var leftMatrixRowLength  = leftMatrix[ 0 ].length;
    var rightMatrixLength    = rightMatrix.length;
    var rightMatrixRowLength = rightMatrix[ 0 ].length;

    var QR             = new Array( leftMatrixLength );
    var matrixDiagonal = new Array( leftMatrixRowLength );
    var resultMatrix   = new Array( rightMatrixLength );
    var norm           = 0;

    if ( rightMatrixLength != leftMatrixLength ) {
        console.warn( "Matrix row dimensions must agree." );
    }

    function fillQRMatrix () {

        var i, j;

        for ( i = 0 ; i < leftMatrixLength ; i++ ) {
            QR[ i ] = new Array( leftMatrixRowLength );
            for ( j = 0 ; j < leftMatrixRowLength ; j++ ) {
                QR[ i ][ j ] = leftMatrix[ i ][ j ];
            }
        }

    }

    function formHouseholderVector ( k ) {

        if ( QR[ k ][ k ] < 0 ) {
            norm = -norm;
        }

        var i;
        for ( i = k ; i < leftMatrixLength ; i++ ) {
            QR[ i ][ k ] /= norm;
        }

        QR[ k ][ k ] += 1;

    }

    function applyTransformationToRemainingColumns ( k ) {

        var result = undefined;
        var i, j, l;

        for ( i = k + 1 ; i < leftMatrixRowLength ; i++ ) {
            result = 0;
            for ( j = k ; j < leftMatrixLength ; j++ ) {
                result += QR[ j ][ k ] * QR[ j ][ i ];
            }
            result = -result / QR[ k ][ k ];
            for ( l = k ; l < leftMatrixLength ; l++ ) {
                QR[ l ][ i ] += result * QR[ l ][ k ];
            }
        }

    }

    function checkMatrixRank () {

        var i;

        for ( i = 0 ; i < leftMatrixRowLength ; i++ ) {
            if ( matrixDiagonal[ i ] === 0 ) {
                console.warn( "Matrix is rank deficient" );
            }
        }

    }

    function copyRightHandSide () {

        var i, j;

        for ( i = 0 ; i < rightMatrixLength ; i++ ) {
            resultMatrix[ i ] = new Array( rightMatrixRowLength );
            for ( j = 0 ; j < rightMatrixRowLength ; j++ ) {
                resultMatrix[ i ][ j ] = rightMatrix[ i ][ j ];
            }
        }

    }

    // Compute Y = transpose(Q)*B
    function computeMatrixResults () {

        var result = 0.0;
        var i, j, k, l;

        for ( i = 0 ; i < leftMatrixRowLength ; i++ ) {
            for ( j = 0 ; j < rightMatrixRowLength ; j++ ) {
                result = 0.0;
                for ( k = i ; k < leftMatrixLength ; k++ ) {
                    result += QR[ k ][ i ] * resultMatrix[ k ][ j ];
                }
                result = -result / QR[ i ][ i ];
                for ( l = i ; l < leftMatrixLength ; l++ ) {
                    resultMatrix[ l ][ j ] += result * QR[ l ][ i ];
                }
            }
        }

    }

    // Solve R*X = Y;
    function solve () {

        var i, j, k, l;

        for ( i = leftMatrixRowLength - 1 ; i >= 0 ; i-- ) {
            for ( j = 0 ; j < rightMatrixRowLength ; j++ ) {
                resultMatrix[ i ][ j ] /= matrixDiagonal[ i ];
            }
            for ( k = 0 ; k < i ; k++ ) {
                for ( l = 0 ; l < rightMatrixRowLength ; l++ ) {
                    resultMatrix[ k ][ l ] -= resultMatrix[ i ][ l ] * QR[ k ][ i ];
                }
            }
        }

    }

    fillQRMatrix();

    // Main loop.
    for ( var k = 0 ; k < leftMatrixRowLength ; k++ ) {

        // Compute 2-norm of k-th column without under/overflow.
        norm = 0;

        for ( var l = k ; l < leftMatrixLength ; l++ ) {
            norm = Math.hypot( norm, QR[ l ][ k ] );
        }

        if ( norm !== 0 ) {
            formHouseholderVector( k );
            applyTransformationToRemainingColumns( k );
        }

        matrixDiagonal[ k ] = -norm;
    }

    checkMatrixRank();
    copyRightHandSide();
    computeMatrixResults();
    solve();

    return getSubMatrix( resultMatrix, 0, leftMatrixRowLength - 1, 0, rightMatrixRowLength - 1 );

}
