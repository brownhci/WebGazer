/**
 * Head pose via iterative solvePnP (mirrors training/src/head_pose.py).
 * Same 3D face model (mm), pinhole camera (f = image width), Euler convention.
 */

/** MediaPipe indices — image-left / image-right when facing the camera. */
export const POSE_LANDMARK_INDICES = [1, 152, 33, 263, 61, 291] as const;

/** Generic adult face model in millimetres. */
export const FACE_3D_MODEL_MM: ReadonlyArray<readonly [number, number, number]> = [
  [0.0, 0.0, 0.0],
  [0.0, -63.6, -12.5],
  [-43.3, 32.7, -26.0],
  [43.3, 32.7, -26.0],
  [-28.9, -28.9, -24.1],
  [28.9, -28.9, -24.1]
];

export type HeadPose = {
  yaw: number;
  pitch: number;
  roll: number;
  tx: number;
  ty: number;
  tz: number;
};

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

const rodrigues = (rvec: Vec3): Mat3 => {
  const [rx, ry, rz] = rvec;
  const theta = Math.hypot(rx, ry, rz);
  if (theta < 1e-8) {
    return [
      [1, -rz, ry],
      [rz, 1, -rx],
      [-ry, rx, 1]
    ];
  }
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const c1 = 1 - c;
  const x = rx / theta;
  const y = ry / theta;
  const z = rz / theta;
  return [
    [c + x * x * c1, x * y * c1 - z * s, x * z * c1 + y * s],
    [y * x * c1 + z * s, c + y * y * c1, y * z * c1 - x * s],
    [z * x * c1 - y * s, z * y * c1 + x * s, c + z * z * c1]
  ];
};

const matVec = (R: Mat3, v: Vec3): Vec3 => [
  R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
  R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
  R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]
];

export const rotationMatrixToEuler = (R: Mat3): [number, number, number] => {
  const sy = Math.hypot(R[0][0], R[1][0]);
  if (sy > 1e-6) {
    const pitch = Math.atan2(-R[2][0], sy);
    const yaw = Math.atan2(R[1][0], R[0][0]);
    const roll = Math.atan2(R[2][1], R[2][2]);
    return [yaw, pitch, roll];
  }
  const pitch = Math.atan2(-R[2][0], sy);
  const yaw = Math.atan2(-R[0][1], R[1][1]);
  return [yaw, pitch, 0];
};

const projectPoint = (
  obj: readonly [number, number, number],
  rvec: Vec3,
  tvec: Vec3,
  focal: number,
  cx: number,
  cy: number
): [number, number] | null => {
  const R = rodrigues(rvec);
  const Xc = matVec(R, [obj[0], obj[1], obj[2]]);
  const x = Xc[0] + tvec[0];
  const y = Xc[1] + tvec[1];
  const z = Xc[2] + tvec[2];
  if (Math.abs(z) < 1e-8) return null;
  return [focal * (x / z) + cx, focal * (y / z) + cy];
};

/** Solve 6×6 symmetric positive system (normal equations) in-place. */
const solveNormal6 = (A: number[], b: number[]): number[] | null => {
  const n = 6;
  const M = A.slice();
  const x = b.slice();
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row * n + col]) > Math.abs(M[pivot * n + col])) pivot = row;
    }
    if (Math.abs(M[pivot * n + col]) < 1e-12) return null;
    if (pivot !== col) {
      for (let j = 0; j < n; j++) {
        const tmp = M[col * n + j];
        M[col * n + j] = M[pivot * n + j];
        M[pivot * n + j] = tmp;
      }
      const tb = x[col];
      x[col] = x[pivot];
      x[pivot] = tb;
    }
    const diag = M[col * n + col];
    for (let row = col + 1; row < n; row++) {
      const f = M[row * n + col] / diag;
      x[row] -= f * x[col];
      for (let j = col; j < n; j++) M[row * n + j] -= f * M[col * n + j];
    }
  }
  for (let row = n - 1; row >= 0; row--) {
    let sum = x[row];
    for (let j = row + 1; j < n; j++) sum -= M[row * n + j] * x[j];
    x[row] = sum / M[row * n + row];
  }
  return x;
};

/**
 * Iterative solvePnP (Gauss–Newton), same camera model as OpenCV path in Python.
 */
export const estimateHeadPose = (
  mesh: [number, number, number][],
  imageW: number,
  imageH: number
): HeadPose | null => {
  if (mesh.length < 292) return null;
  const w = Math.max(imageW, 1);
  const h = Math.max(imageH, 1);
  const focal = w;
  const cx = w * 0.5;
  const cy = h * 0.5;

  const imagePoints: [number, number][] = [];
  for (const idx of POSE_LANDMARK_INDICES) {
    const p = mesh[idx];
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    imagePoints.push([p[0], p[1]]);
  }

  // Initial guess: frontal, depth ~ 0.8 * focal in model units.
  const rvec: Vec3 = [0, 0, 0];
  const tvec: Vec3 = [0, 0, focal * 0.75];
  const params = [...rvec, ...tvec];

  const residualAt = (p: number[]): number[] | null => {
    const rv: Vec3 = [p[0], p[1], p[2]];
    const tv: Vec3 = [p[3], p[4], p[5]];
    const out: number[] = [];
    for (let i = 0; i < FACE_3D_MODEL_MM.length; i++) {
      const proj = projectPoint(FACE_3D_MODEL_MM[i], rv, tv, focal, cx, cy);
      if (!proj) return null;
      out.push(proj[0] - imagePoints[i][0], proj[1] - imagePoints[i][1]);
    }
    return out;
  };

  for (let iter = 0; iter < 30; iter++) {
    const r = residualAt(params);
    if (!r) return null;

    // Finite-difference Jacobian (12 × 6)
    const eps = 1e-4;
    const J: number[][] = [];
    for (let k = 0; k < 6; k++) {
      const p2 = params.slice();
      p2[k] += eps;
      const r2 = residualAt(p2);
      if (!r2) return null;
      const col = r2.map((v, i) => (v - r[i]) / eps);
      J.push(col);
    }

    // Normal equations: (J^T J) δ = -J^T r
    const JTJ = new Array(36).fill(0);
    const JTr = new Array(6).fill(0);
    for (let i = 0; i < 12; i++) {
      for (let k = 0; k < 6; k++) {
        JTr[k] += J[k][i] * r[i];
        for (let l = 0; l < 6; l++) JTJ[k * 6 + l] += J[k][i] * J[l][i];
      }
    }
    const negJTr = JTr.map(v => -v);
    // Dampen diagonal slightly for stability
    for (let k = 0; k < 6; k++) JTJ[k * 6 + k] += 1e-3;

    const delta = solveNormal6(JTJ, negJTr);
    if (!delta) return null;

    let maxStep = 0;
    for (let k = 0; k < 6; k++) {
      params[k] += delta[k];
      maxStep = Math.max(maxStep, Math.abs(delta[k]));
    }
    if (maxStep < 1e-8) break;
  }

  const R = rodrigues([params[0], params[1], params[2]]);
  const [yaw, pitch, roll] = rotationMatrixToEuler(R);
  const tzRaw = params[5];
  if (Math.abs(tzRaw) < 1e-6) return null;
  const tx = params[3] / focal;
  const ty = params[4] / focal;
  const tz = tzRaw / focal;
  if (![yaw, pitch, roll, tx, ty, tz].every(Number.isFinite)) return null;
  return { yaw, pitch, roll, tx, ty, tz };
};
