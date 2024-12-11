/**
 * Matrix operations, mostly based on WEKA
 * @see https://github.com/Waikato/weka-3.8/blob/master/weka/src/main/java/weka/core/matrix/Matrix.java
 */

// Equivalent to 0 in JavaScript decimal precision
const EPSILON = 1e-10;

export type Matrix = number[][];

type OperationCallback = (a: number, b: number) => number;

/**
 * Apply arithmetic operations to every element of A and B:
 * X = A ○ B, where ○ can be one of +, -, *, /, etc.
 */
const applyArithmeticOperation = (A: Matrix, B: Matrix, op: OperationCallback): Matrix => {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('Matrix dimensions must agree.');
  }

  const rows = A.length;
  const cols = A[0].length;

  const X: Matrix = new Array(rows);

  for (let i = 0; i < rows; i++) {
    X[i] = new Array(cols);

    for (let j = 0; j < cols; j++) {
      X[i][j] = op(A[i][j], B[i][j]);
    }
  }

  return X;
};

/**
 * Transposes an m*n array
 */
export const transpose = (matrix: (number[] | Uint8ClampedArray)[]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const transposedMatrix: Matrix = new Array(cols);

  for (let j = 0; j < cols; j++) {
    transposedMatrix[j] = new Array(rows);

    for (let i = 0; i < rows; i++) {
      transposedMatrix[j][i] = matrix[i][j];
    }
  }

  return transposedMatrix;
};

/**
 * Get a sub-matrix of matrix
 */
export const getMatrix = (matrix: Matrix, r: number[], j0: number, j1: number): Matrix => {
  const X: Matrix = new Array(r.length);
  const m = j1 - j0 + 1;

  for (let i = 0, len = r.length; i < len; i++) {
    X[i] = new Array(m);

    for (let j = j0; j <= j1; j++) {
      X[i][j - j0] = matrix[r[i]][j];
    }
  }

  return X;
};

/**
 * Get a submatrix of matrix
 */
export const getSubMatrix = (matrix: Matrix, i0: number, i1: number, j0: number, j1: number): Matrix => {
  const size = j1 - j0 + 1;
  const X: Matrix = new Array(i1 - i0 + 1);

  for (let i = i0; i <= i1; i++) {
    const subI = i - i0;
    X[subI] = new Array(size);

    for (let j = j0; j <= j1; j++) {
      X[subI][j - j0] = matrix[i][j];
    }
  }

  return X;
};

/**
 * Linear algebraic matrix multiplication, X = A * B
 */
export const mult = (matrix1: (number[] | Uint8ClampedArray)[], matrix2: (number[] | Uint8ClampedArray)[]): Matrix => {
  if (matrix2.length !== matrix1[0].length) {
    throw new Error('Matrix inner dimensions must agree.');
  }

  const X: Matrix = new Array(matrix1.length);
  const Bcolj: number[] = new Array(matrix1[0].length);

  for (let j = 0; j < matrix2[0].length; j++) {
    for (let k = 0; k < matrix1[0].length; k++) {
      Bcolj[k] = matrix2[k][j];
    }
    for (let i = 0; i < matrix1.length; i++) {
      if (j === 0) {
        X[i] = new Array(matrix2[0].length);
      }

      const Arowi = matrix1[i];
      let s = 0;
      for (let k = 0; k < matrix1[0].length; k++) {
        s += Arowi[k] * Bcolj[k];
      }
      X[i][j] = s;
    }
  }
  return X;
};

/**
 * Multiply a matrix by a scalar, X = s*A
 */
export const multScalar = (A: Matrix, s: number): Matrix => {
  const rows = A.length;
  const cols = A[0].length;

  const X: Matrix = new Array(rows);

  for (let i = 0; i < rows; i++) {
    X[i] = new Array(cols);

    for (let j = 0; j < cols; j++) {
      X[i][j] = A[i][j] * s;
    }
  }

  return X;
};

/**
 * Linear algebraic matrix addition, X = A * B
 */
export const add = (A: Matrix, B: Matrix): Matrix => applyArithmeticOperation(A, B, (a, b) => a + b);

/**
 * Linear algebraic matrix subtraction, X = A - B
 */
export const sub = (A: Matrix, B: Matrix): Matrix => applyArithmeticOperation(A, B, (a, b) => a - b);

/**
 * Matrix inverse or pseudoinverse, based on WEKA code
 */
export const inv = (A: Matrix): Matrix => solve(A, identity(A.length, A[0].length));

/**
 * Generate identity matrix, based on WEKA code
 */
export const identity = (m: number, n: number = m): Matrix => {
  const X: Matrix = new Array(m);

  for (let i = 0; i < m; i++) {
    X[i] = new Array(n);

    for (let j = 0; j < n; j++) {
      X[i][j] = (i === j ? 1.0 : 0.0);
    }
  }

  return X;
};

/**
 * Solve A*X = B, based on WEKA code
 */
export const solve = (A: Matrix, B: Matrix): Matrix =>
  // Use LU if A is square
  A.length === A[0].length ? LUDecomposition(A, B) : QRDecomposition(A, B);

/**
 * LUDecomposition to solve A*X = B, based on WEKA code
 */
const LUDecomposition = (A: Matrix, B: Matrix): Matrix => {
  const LU: Matrix = new Array(A.length);

  for (let i = 0; i < A.length; i++) {
    LU[i] = new Array(A[0].length);
    for (let j = 0; j < A[0].length; j++) {
      LU[i][j] = A[i][j];
    }
  }

  const m = A.length;
  const n = A[0].length;
  const piv: number[] = new Array(m);
  for (let i = 0; i < m; i++) {
    piv[i] = i;
  }
  let pivsign = 1;
  let LUrowi: number[];
  const LUcolj: number[] = new Array(m);
  // Outer loop.
  for (let j = 0; j < n; j++) {
    // Make a copy of the j-th column to localize references.
    for (let i = 0; i < m; i++) {
      LUcolj[i] = LU[i][j];
    }
    // Apply previous transformations.
    for (let i = 0; i < m; i++) {
      LUrowi = LU[i];
      // Most of the time is spent in the following dot product.
      const kmax = Math.min(i, j);
      let s = 0;
      for (let k = 0; k < kmax; k++) {
        s += LUrowi[k] * LUcolj[k];
      }
      LUrowi[j] = LUcolj[i] -= s;
    }
    // Find pivot and exchange if necessary.
    let p = j;
    for (let i = j + 1; i < m; i++) {
      if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
        p = i;
      }
    }
    if (p !== j) {
      for (let k = 0; k < n; k++) {
        const t = LU[p][k];
        LU[p][k] = LU[j][k];
        LU[j][k] = t;
      }
      const k = piv[p];
      piv[p] = piv[j];
      piv[j] = k;
      pivsign = -pivsign;
    }
    // Compute multipliers.
    if (j < m && LU[j][j] !== 0) {
      for (let i = j + 1; i < m; i++) {
        LU[i][j] /= LU[j][j];
      }
    }
  }
  if (B.length !== m) {
    console.log('Matrix row dimensions must agree.');
  }
  for (let j = 0; j < n; j++) {
    if (Math.abs(LU[j][j]) < EPSILON) {
      throw new Error('Matrix is singular.');
    }
  }
  const nx = B[0].length;
  const X = getMatrix(B, piv, 0, nx - 1);
  // Solve L*Y = B(piv,:)
  for (let k = 0; k < n; k++) {
    for (let i = k + 1; i < n; i++) {
      for (let j = 0; j < nx; j++) {
        X[i][j] -= X[k][j] * LU[i][k];
      }
    }
  }
  // Solve U*X = Y;
  for (let k = n - 1; k >= 0; k--) {
    for (let j = 0; j < nx; j++) {
      X[k][j] /= LU[k][k];
    }
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < nx; j++) {
        X[i][j] -= X[k][j] * LU[i][k];
      }
    }
  }
  return X;
};

/**
 * Least squares solution of A*X = B, based on WEKA code
 */
const QRDecomposition = (A: Matrix, B: Matrix): Matrix => {
  // Initialize.
  const QR: Matrix = new Array(A.length);

  for (let i = 0; i < A.length; i++) {
    QR[i] = new Array(A[0].length);
    for (let j = 0; j < A[0].length; j++) {
      QR[i][j] = A[i][j];
    }
  }
  const m = A.length;
  const n = A[0].length;
  const Rdiag: number[] = new Array(n);
  let nrm: number;

  // Main loop.
  for (let k = 0; k < n; k++) {
    // Compute 2-norm of k-th column without under/overflow.
    nrm = 0;
    for (let i = k; i < m; i++) {
      nrm = Math.hypot(nrm, QR[i][k]);
    }
    if (nrm !== 0) {
      // Form k-th Householder vector.
      if (QR[k][k] < 0) {
        nrm = -nrm;
      }
      for (let i = k; i < m; i++) {
        QR[i][k] /= nrm;
      }
      QR[k][k] += 1;

      // Apply transformation to remaining columns.
      for (let j = k + 1; j < n; j++) {
        let s = 0;
        for (let i = k; i < m; i++) {
          s += QR[i][k] * QR[i][j];
        }
        s = -s / QR[k][k];
        for (let i = k; i < m; i++) {
          QR[i][j] += s * QR[i][k];
        }
      }
    }
    Rdiag[k] = -nrm;
  }
  if (B.length !== m) {
    console.log('Matrix row dimensions must agree.');
  }
  for (let j = 0; j < n; j++) {
    if (Math.abs(Rdiag[j]) < EPSILON) {
      throw new Error('Matrix is rank deficient');
    }
  }
  // Copy right hand side
  const nx = B[0].length;
  const X: Matrix = new Array(B.length);
  for (let i = 0; i < B.length; i++) {
    X[i] = new Array(B[0].length);
  }
  for (let i = 0; i < B.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      X[i][j] = B[i][j];
    }
  }
  // Compute Y = transpose(Q)*B
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < nx; j++) {
      let s = 0.0;
      for (let i = k; i < m; i++) {
        s += QR[i][k] * X[i][j];
      }
      s = -s / QR[k][k];
      for (let i = k; i < m; i++) {
        X[i][j] += s * QR[i][k];
      }
    }
  }
  // Solve R*X = Y;
  for (let k = n - 1; k >= 0; k--) {
    for (let j = 0; j < nx; j++) {
      X[k][j] /= Rdiag[k];
    }
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < nx; j++) {
        X[i][j] -= X[k][j] * QR[i][k];
      }
    }
  }
  return getSubMatrix(X, 0, n - 1, 0, nx - 1);
};
