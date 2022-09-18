/**
 * Matrix operations, mostly based on WEKA
 * @see https://github.com/Waikato/weka-3.8/blob/master/weka/src/main/java/weka/core/matrix/Matrix.java
 */

/**
 * @callback operationCallback
 * @param {number} a - an element of matrix A
 * @param {number} b - an element of matrix B
 * @return {number} a ○ b
 */
/**
 * Apply arithmetic operations to every element of A and B:
 * X = A ○ B, where ○ can be one of +, -, *, /, etc.
 *
 * @param {Array.<Array.<Number>>} A
 * @param {Array.<Array.<Number>>} B
 * @param {operationCallback} op - operation to apply, op(a, b) => a ○ b
 * @return {Array.<Array.<Number>>} A ○ B
 */
function applyArithmeticOperation(A, B, op) {

    if (A.length !== B.length || A[0].length !== B[0].length) {
        throw new Error('Matrix dimensions must agree.');
    }

    const rows = A.length;
    const cols = A[0].length;

    const X = new Array(rows);

    for (let i = 0; i < rows; i++) {
        X[i] = new Array(cols);

        for (let j = 0; j < cols; j++) {
            X[i][j] = op(A[i][j], B[i][j]);
        }
    }

    return X;
}

const mat = {
    /**
     * Transposes an m*n array
     * @param {Array.<Array.<Number>>} matrix - of 'M x N' dimensionality
     * @return {Array.<Array.<Number>>} transposed matrix
     */
    transpose(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const transposedMatrix = new Array(cols);

        for (let j = 0; j < cols; j++) {
            transposedMatrix[j] = new Array(rows);

            for (let i = 0; i < rows; i++) {
                transposedMatrix[j][i] = matrix[i][j];
            }
        }

        return transposedMatrix;
    },

    /**
     * Get a sub-matrix of matrix
     * @param {Array.<Array.<Number>>} matrix - original matrix
     * @param {Array.<Number>} r - Array of row indices
     * @param {Number} j0 - Initial column index
     * @param {Number} j1 - Final column index
     * @returns {Array} The sub-matrix matrix(r(:),j0:j1)
     */
    getMatrix(matrix, r, j0, j1) {
        const X = new Array(r.length);
        const m = j1 - j0 + 1;

        for (let i = 0, len = r.length; i < len; i++) {
            X[i] = new Array(m);

            for (let j = j0; j <= j1; j++) {
                X[i][j - j0] = matrix[r[i]][j];
            }
        }

        return X;
    },

    /**
     * Get a submatrix of matrix
     * @param {Array.<Array.<Number>>} matrix - original matrix
     * @param {Number} i0 - Initial row index
     * @param {Number} i1 - Final row index
     * @param {Number} j0 - Initial column index
     * @param {Number} j1 - Final column index
     * @return {Array} The sub-matrix matrix(i0:i1,j0:j1)
     */
    getSubMatrix(matrix, i0, i1, j0, j1) {
        const size = j1 - j0 + 1;
        const X = new Array(i1 - i0 + 1);

        for (let i = i0; i <= i1; i++) {
            const subI = i - i0;
            X[subI] = new Array(size);

            for (let j = j0; j <= j1; j++) {
                X[subI][j - j0] = matrix[i][j];
            }
        }

        return X;
    },

    /**
     * Linear algebraic matrix multiplication, X = A * B
     * @param {Array.<Array.<Number>>} A
     * @param {Array.<Array.<Number>>} B
     * @return {Array.<Array.<Number>>} Matrix product, A * B
     */
    mult(matrix1, matrix2) {
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
    },

    /**
     * Multiply a matrix by a scalar, X = s*A
     * @param {Array.<Array.<Number>>}  A - matrix
     * @param {Number}                  s - scalar
     * @return {Array.<Array.<Number>>} s*A
     */
    multScalar(A, s) {
        const rows = A.length;
        const cols = A[0].length;

        const X = new Array(rows);

        for (let i = 0; i < rows; i++) {
            X[i] = new Array(cols);

            for (let j = 0; j < cols; j++) {
                X[i][j] = A[i][j] * s;
            }
        }

        return X;
    },

    /**
     * Linear algebraic matrix addition, X = A + B
     * @param {Array.<Array.<Number>>} A
     * @param {Array.<Array.<Number>>} B
     * @return {Array.<Array.<Number>>} A + B
     */
    add(A, B) {
        return applyArithmeticOperation(A, B, (a, b) => a + b);
    },

    /**
     * Linear algebraic matrix subtraction, X = A - B
     * @param {Array.<Array.<Number>>} A
     * @param {Array.<Array.<Number>>} B
     * @return {Array.<Array.<Number>>} A - B
     */
    sub(A, B) {
        return applyArithmeticOperation(A, B, (a, b) => a - b);
    },

    /**
     * Matrix inverse or pseudoinverse, based on WEKA code
     * @param {Array.<Array.<Number>>} A - original matrix
     * @return inverse(A) if A is square, pseudoinverse otherwise.
     */
    inv(A) {
        return mat.solve(A, mat.identity(A.length, A[0].length));
    },

    /**
     * Generate identity matrix, based on WEKA code
     * @param {Number} m - number of rows.
     * @param {Number} [n] - number of colums, n = m if undefined.
     * @return {Array.<Array.<Number>>} An m * n matrix with ones on the diagonal and zeros elsewhere.
     */
    identity(m, n = m) {
        const X = new Array(m);

        for (let i = 0; i < m; i++) {
            X[i] = new Array(n);

            for (let j = 0; j < n; j++) {
                X[i][j] = (i === j ? 1.0 : 0.0);
            }
        }

        return X;
    },

    /**
     * Solve A*X = B, based on WEKA code
     * @param {Array.<Array.<Number>>} A - left matrix of equation to be solved
     * @param {Array.<Array.<Number>>} B - right matrix of equation to be solved
     * @return {Array.<Array.<Number>>}  solution if A is square, least squares solution otherwiseis
     */
    solve(A, B) {
        if (A.length === A[0].length) {
            // A is square
            return mat.LUDecomposition(A, B);
        }

        return mat.QRDecomposition(A, B);
    },

    /**
     * LUDecomposition to solve A*X = B, based on WEKA code
     * @param {Array.<Array.<Number>>} A - left matrix of equation to be solved
     * @param {Array.<Array.<Number>>} B - right matrix of equation to be solved
     * @return {Array.<Array.<Number>>} X so that L*U*X = B(piv,:)
     */
    LUDecomposition(A, B) {
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
        var X = mat.getMatrix(B,piv,0,nx-1);
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
    },

    /**
     * Least squares solution of A*X = B, based on WEKA code
     * @param {Array.<Array.<Number>>} A - left side matrix to be solved
     * @param {Array.<Array.<Number>>} B - a matrix with as many rows as A and any number of columns.
     * @return {Array.<Array.<Number>>} X - that minimizes the two norms of QR*X-B.
     */
    QRDecomposition(A, B) {
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
};

export default mat;
