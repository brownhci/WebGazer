(function() {
    "use strict"

    self.self.gazer = self.self.gazer || {};
    self.self.gazer.mat = self.self.gazer.mat || {};

/**
     * Transposes a mxn array
     * @param {array of arrays} matrix mxn
     * @return{array of arrays} transposed matrix
     */
    self.gazer.mat.transpose = function(matrix){
        var m = matrix.length;
        var n = matrix[0].length;
        var transposedMatrix = new Array(n);
        for (var i = 0; i < n; i++){
            transposedMatrix[i] = new Array(m);
        }  
        for (var i = 0; i < m; i++){
            for (var j = 0; j < n; j++){
                transposedMatrix[j][i] = matrix[i][j];
            }
        }
        return transposedMatrix;
    }

    /** 
     * Get a submatrix of matrix
     * @param [array of arrays] matrix original matrix
     * @param [array] r    Array of row indices.
     * @param [number] j0   Initial column index
     * @param [number] j1   Final column index
     * @return [array of arrays] X is the submatrix matrix(r(:),j0:j1)
     */
    self.gazer.mat.getMatrix = function(matrix, r, j0, j1){
        var X = new Array(r.length);
        for(var i=0; i<r.length; i++){
            X[i] = new Array(j1-j0+1);
        }
        for (var i = 0; i < r.length; i++){
            for (var j = j0; j <= j1; j++){
                X[i][j-j0] = matrix[r[i]][j];
            }
        }
        return X;
    }

    /** 
     * Get a submatrix of matrix
     * @param [array of arrays] matrix original matrix
     * @param [number] i0   Initial row index
     * @param [number] 1   Final row index
     * @param [number] j0   Initial column index
     * @param [number] j1   Final column index
     * @return     A(i0:i1,j0:j1)
     * @throws  ArrayIndexOutOfBoundsException Submatrix indices
     */
    self.gazer.mat.getSubMatrix = function(matrix, i0, i1, j0, j1){
        var X = new Array(i1-i0+1);
        for(var i=0; i<i1-i0+1; i++){
            X[i] = new Array(j1-j0+1);
        }
        for (var i = i0; i <= i1; i++){
            for (var j = j0; j <= j1; j++){
                X[i-i0][j-j0] = matrix[i][j];
            }
        }
        return X;
    }

    /** 
     * Linear algebraic matrix multiplication, matrix1 * matrix2
     * @param {array of arrays} matrix1
     * @param {array of arrays} matrix2
     * @return {array of arrays} Matrix product, matrix1 * matrix2
     */
    self.gazer.mat.mult = function(matrix1, matrix2){	
        if (matrix2.length != matrix1[0].length){
            console.log("Matrix inner dimensions must agree.");
        }
        var X = new Array(matrix1.length);
        for (var i = 0; i < matrix1.length; i++){
            X[i] = new Array(matrix2[0].length);
        }  
        var Bcolj = new Array(matrix1[0].length);
        for (var j = 0; j < matrix2[0].length; j++){
            for (var k = 0; k < matrix1[0].length; k++){
                Bcolj[k] = matrix2[k][j];
            }
            for (var i = 0; i < matrix1.length; i++){
                var Arowi = matrix1[i];
                var s = 0;
                for (var k = 0; k < matrix1[0].length; k++){
                    s += Arowi[k]*Bcolj[k];
                }
                X[i][j] = s;
            }
        }
        return X;
    }


    /**
     * Solves A*X = B, based on WEKA code
     * @param{array of arrays} A left matrix of equation to be solved
     * @param{array of arrays} B right matrix of equation to be solved
     * @return {array of arrays} X so that L*U*X = B(piv,:)
     */
    self.gazer.mat.LUDecomposition = function(A,B){
        var LU = new Array(A.length);
        for(var i=0; i<A.length; i++){
            LU[i] = new Array(A[0].length);
        }
        for (var i = 0; i < A.length; i++){
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
            console.log("Matrix row dimensions must agree.");
        }
        for (var j = 0; j < n; j++){
            if (LU[j][j] == 0){
                console.log("Matrix is singular.")
            }
        }
        var nx = B[0].length;
        var X = self.gazer.mat.getMatrix(B,piv,0,nx-1);
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
    }

    /**
     * Least squares solution of A*X = B, based on WEKA code
     * @param [array of arrays] A left side matrix to be solved
     * @param [array of arrays] B a matrix with as many rows as A and any number of columns.
     * @return [array of arrays] X that minimizes the two norm of QR*X-B.
     * @param[array of arrays] Matrix A [description]
     */
            self.gazer.mat.QRDecomposition = function(A, B){
                // Initialize.
                QR = new Array(A.length);
                for(var i=0; i<A.length; i++){
                    QR[i] = new Array(A[0].length);
                }
                for (var i = 0; i < A.length; i++){
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
                    console.log("Matrix row dimensions must agree.");
                }
                for (var j = 0; j < n; j++){
                    if (Rdiag[j] == 0)
                        console.log("Matrix is rank deficient");
                }
                // Copy right hand side
                var nx = B[0].length;
                X = new Array(B.length);
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
                return self.gazer.mat.getSubMatrix(X,0,n-1,0,nx-1);
            }
}());

