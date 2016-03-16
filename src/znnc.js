/**
  Sum of Absolute Differences (SAD) of two matrices.
*/
exports.SAD = function(A, B) {
  var sum = 0;
  overall(A, B, function(a, b) {
    sum += Math.abs(a - b);
  });
  return sum;
}

/**
  Sum of Squared Differences (SSD) of two matrices.
*/
exports.SSD = function(A, B) {
  var sum = 0;
  overall(A, B, function(a, b) {
    sum += (a - b) * (a - b);
  });
  return sum;
}

/**
  Zero Mean Normalized Cross-Correlation (ZNCC) of two matrices.
*/
exports.ZNCC = function(A, B) {
  var mean_A = mean(A);
  var mean_B = mean(B);

  var numerator = 0;
  var denumerator = 0;
  var denumerator = 0;
  var denumerator_2 = 0;
  
  overall(A, B, function(a, b) {
    numerator += (a - mean_A) * (b - mean_B);
    denumerator += (a - mean_A) * (a - mean_A);
    denumerator_2 += (b - mean_B) * (b - mean_B);
  });

  denumerator = Math.sqrt(denumerator * denumerator_2);

  return numerator / denumerator;
}

function mean(A) {
  var sum = 0;
  var m = A[0].length;
  var n = A.length;

  for (var i = 0; i < m; i++) {
    for (var j = 0; j < n; j++) {
      sum += A[i][j];
    }
  }
  
  return sum / (m * n);
}

function overall(A, B, cb) {
  var m = A[0].length == B[0].length ? A[0].length : null;
  var n = A.length == B.length ? A.length : null;
  
  if (m === null || n === null) {
    throw new Error("Matrices don't have the same size.");
  }

  for (var i = 0; i < m; i++) {
    for (var j = 0; j < n; j++) {
      cb(A[i][j], B[i][j]);
    }
  }
}