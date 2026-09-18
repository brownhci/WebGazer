import type { EyesData } from './facemesh';
import { estimateHeadPose } from './headPose';

const NOSE_TIP = 1;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;

const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;

/** 19 face + 2 viewport = 21 dims (solvePnP + 2D proxies). */
export const MLP_FACE_FEATURE_NAMES = [
  'left_iris_x',
  'left_iris_y',
  'right_iris_x',
  'right_iris_y',
  'head_yaw',
  'head_pitch',
  'head_roll',
  'head_tx',
  'head_ty',
  'head_tz',
  'head_yaw_proxy',
  'head_pitch_proxy',
  'head_roll_proxy',
  'head_tx_norm',
  'head_ty_norm',
  'ear_left',
  'ear_right',
  'ipd_px',
  'face_width_px'
] as const;

export const MLP_SCREEN_FEATURE_NAMES = ['screen_w_norm', 'screen_h_norm'] as const;

export const MLP_FEATURE_NAMES = [
  ...MLP_FACE_FEATURE_NAMES,
  ...MLP_SCREEN_FEATURE_NAMES
] as const;

const lm = (mesh: [number, number, number][], idx: number): [number, number, number] =>
  mesh[idx] ?? [0, 0, 0];

const dist2d = (a: [number, number, number], b: [number, number, number]): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
};

const eyeAspectRatio = (mesh: [number, number, number][], side: 'left' | 'right'): number => {
  const [p1, p4, p2, p6] = side === 'left'
    ? [LEFT_EYE_OUTER, LEFT_EYE_INNER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM]
    : [RIGHT_EYE_OUTER, RIGHT_EYE_INNER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM];
  const horiz = dist2d(lm(mesh, p1), lm(mesh, p4));
  if (horiz === 0) return 0;
  return (dist2d(lm(mesh, p2), lm(mesh, p6)) + dist2d(lm(mesh, p2), lm(mesh, p6))) / (2 * horiz);
};

const headPoseProxies = (
  mesh: [number, number, number][]
): [number, number, number, number, number] => {
  const nose = lm(mesh, NOSE_TIP);
  const le = lm(mesh, LEFT_EYE_OUTER);
  const re = lm(mesh, RIGHT_EYE_OUTER);
  const eyeMid: [number, number] = [(le[0] + re[0]) / 2, (le[1] + re[1]) / 2];
  let ipd = dist2d(le, re);
  if (ipd < 1e-6) ipd = 1;

  const roll = Math.atan2(re[1] - le[1], re[0] - le[0]);
  const yawProxy = (nose[0] - eyeMid[0]) / ipd;
  const pitchProxy = (nose[1] - eyeMid[1]) / ipd;

  const faceCx = (lm(mesh, FACE_LEFT)[0] + lm(mesh, FACE_RIGHT)[0]) / 2;
  const faceCy = (lm(mesh, FACE_LEFT)[1] + lm(mesh, FACE_RIGHT)[1]) / 2;
  const txNorm = (nose[0] - faceCx) / ipd;
  const tyNorm = (nose[1] - faceCy) / ipd;

  return [yawProxy, pitchProxy, roll, txNorm, tyNorm];
};

const scaleProxies = (mesh: [number, number, number][]): [number, number] => {
  const ipd = dist2d(lm(mesh, LEFT_EYE_OUTER), lm(mesh, RIGHT_EYE_OUTER));
  const faceW = dist2d(lm(mesh, FACE_LEFT), lm(mesh, FACE_RIGHT));
  return [ipd, faceW];
};

const screenFeatures = (): [number, number] => {
  const w = Math.max(window.innerWidth || document.documentElement.clientWidth, 1);
  const h = Math.max(window.innerHeight || document.documentElement.clientHeight, 1);
  return [w / REFERENCE_WIDTH, h / REFERENCE_HEIGHT];
};

/**
 * Builds the 21-dim MLP input (19 face + 2 viewport): patch pupils, solvePnP, 2D proxies.
 */
export const buildMlpFeatureVector = (eyes: EyesData): number[] | null => {
  if (!eyes.facemesh.length || eyes.left.width <= 0 || eyes.right.width <= 0) return null;

  const imageW = eyes.videoWidth || 1;
  const imageH = eyes.videoHeight || 1;
  const pose = estimateHeadPose(eyes.facemesh, imageW, imageH);
  if (!pose) return null;

  const [yawP, pitchP, rollP, txN, tyN] = headPoseProxies(eyes.facemesh);
  const [ipd, faceW] = scaleProxies(eyes.facemesh);
  const [screenW, screenH] = screenFeatures();

  return [
    eyes.iris.left[0],
    eyes.iris.left[1],
    eyes.iris.right[0],
    eyes.iris.right[1],
    pose.yaw,
    pose.pitch,
    pose.roll,
    pose.tx,
    pose.ty,
    pose.tz,
    yawP,
    pitchP,
    rollP,
    txN,
    tyN,
    eyeAspectRatio(eyes.facemesh, 'left'),
    eyeAspectRatio(eyes.facemesh, 'right'),
    ipd,
    faceW,
    screenW,
    screenH
  ];
};
