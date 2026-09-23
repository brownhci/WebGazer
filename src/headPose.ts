/**
 * Head pose from MediaPipe Face Mesh 3D (mirrors training/src/head_pose.py).
 *
 * No mm template / solvePnP. Orthonormal face frame from landmark 3D
 * (eye line × nose–chin), Euler angles + nose offset / IPD.
 */

const NOSE_TIP = 1;
const CHIN = 152;
const EYE_OUTER_L = 33;
const EYE_OUTER_R = 263;

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

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 | null => {
  const n = norm(a);
  if (n < 1e-6) return null;
  return scale(a, 1 / n);
};

const lm3 = (mesh: [number, number, number][], idx: number): Vec3 | null => {
  const p = mesh[idx];
  if (!p || !p.every(Number.isFinite)) return null;
  return [p[0], p[1], p[2]];
};

export const rotationMatrixToEuler = (R: Mat3): [number, number, number] => {
  const sy = Math.hypot(R[0][0], R[1][0]);
  if (sy > 1e-6) {
    return [
      Math.atan2(R[1][0], R[0][0]),
      Math.atan2(-R[2][0], sy),
      Math.atan2(R[2][1], R[2][2])
    ];
  }
  return [
    Math.atan2(-R[0][1], R[1][1]),
    Math.atan2(-R[2][0], sy),
    0
  ];
};

const faceRotation = (mesh: [number, number, number][]): Mat3 | null => {
  const le = lm3(mesh, EYE_OUTER_L);
  const re = lm3(mesh, EYE_OUTER_R);
  const nose = lm3(mesh, NOSE_TIP);
  const chin = lm3(mesh, CHIN);
  if (!le || !re || !nose || !chin) return null;

  const ipd = norm(sub(re, le));
  if (ipd < 1e-6) return null;

  const xAxis = scale(sub(re, le), 1 / ipd);
  let yRaw = sub(nose, chin);
  yRaw = sub(yRaw, scale(xAxis, dot(yRaw, xAxis)));
  const yAxis = normalize(yRaw);
  if (!yAxis) return null;
  const zAxis = normalize(cross(xAxis, yAxis));
  if (!zAxis) return null;
  const yOrtho = cross(zAxis, xAxis);

  return [
    [xAxis[0], yOrtho[0], zAxis[0]],
    [xAxis[1], yOrtho[1], zAxis[1]],
    [xAxis[2], yOrtho[2], zAxis[2]]
  ];
};

/**
 * @param imageW unused (API parity with old solvePnP)
 * @param imageH unused
 */
export const estimateHeadPose = (
  mesh: [number, number, number][],
  _imageW = 1,
  _imageH = 1
): HeadPose | null => {
  if (mesh.length < 264) return null;
  const R = faceRotation(mesh);
  if (!R) return null;

  const le = lm3(mesh, EYE_OUTER_L);
  const re = lm3(mesh, EYE_OUTER_R);
  const nose = lm3(mesh, NOSE_TIP);
  if (!le || !re || !nose) return null;

  const ipd = norm(sub(re, le));
  if (ipd < 1e-6) return null;

  const eyeMid = scale(add(le, re), 0.5);
  const offset = scale(sub(nose, eyeMid), 1 / ipd);
  const [yaw, pitch, roll] = rotationMatrixToEuler(R);
  const [tx, ty, tz] = offset;
  if (![yaw, pitch, roll, tx, ty, tz].every(Number.isFinite)) return null;
  return { yaw, pitch, roll, tx, ty, tz };
};
