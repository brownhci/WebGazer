import { grayscale, type Eye } from './worker_scripts/util';

/**
 * Pupil center in patch-local coordinates [cx, cy].
 */
export type PupilDetection = [number, number];

/**
 * Refine COM only inside this fraction of min(width, height) around the
 * darkest peak — keeps lateral gaze from being pulled by the rest of the iris.
 */
const REFINE_RADIUS_FRAC = 0.28;

/** Ignore a 1px border so argmin is not stuck on crop edges. */
const BORDER = 1;

/**
 * 3×3 box blur (edges unchanged).
 */
const boxBlur3 = (
  src: Uint8ClampedArray | number[],
  width: number,
  height: number
): Float32Array => {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        out[y * width + x] = src[y * width + x];
        continue;
      }
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += src[(y + dy) * width + (x + dx)];
        }
      }
      out[y * width + x] = sum / 9;
    }
  }
  return out;
};

/**
 * Darkest interior pixel after blur (local pupil seed).
 * Unlike a global dark-mask COM, this follows an eccentric pupil.
 */
const darkestPeak = (
  pixels: Float32Array,
  width: number,
  height: number
): PupilDetection | null => {
  if (width <= BORDER * 2 || height <= BORDER * 2) return null;
  let best = Infinity;
  let bx = -1;
  let by = -1;
  for (let y = BORDER; y < height - BORDER; y++) {
    for (let x = BORDER; x < width - BORDER; x++) {
      const v = pixels[y * width + x];
      if (v < best) {
        best = v;
        bx = x;
        by = y;
      }
    }
  }
  if (bx < 0) return null;
  return [bx, by];
};

/**
 * Intensity-weighted COM in a disk around (cx0, cy0).
 * Weights only pixels darker than the local mean so sclera/iris gray
 * at the window edge contribute little.
 */
const localDarkCom = (
  pixels: Float32Array,
  width: number,
  height: number,
  cx0: number,
  cy0: number,
  radius: number
): PupilDetection => {
  const r2 = radius * radius;
  let localSum = 0;
  let localN = 0;
  for (let y = Math.max(0, Math.floor(cy0 - radius)); y <= Math.min(height - 1, Math.ceil(cy0 + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx0 - radius)); x <= Math.min(width - 1, Math.ceil(cx0 + radius)); x++) {
      const dx = x - cx0;
      const dy = y - cy0;
      if (dx * dx + dy * dy > r2) continue;
      localSum += pixels[y * width + x];
      localN++;
    }
  }
  if (localN === 0) return [cx0, cy0];
  const localMean = localSum / localN;

  let wSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (let y = Math.max(0, Math.floor(cy0 - radius)); y <= Math.min(height - 1, Math.ceil(cy0 + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx0 - radius)); x <= Math.min(width - 1, Math.ceil(cx0 + radius)); x++) {
      const dx = x - cx0;
      const dy = y - cy0;
      if (dx * dx + dy * dy > r2) continue;
      const v = pixels[y * width + x];
      if (v > localMean) continue;
      const w = localMean - v + 1;
      wSum += w;
      xSum += w * x;
      ySum += w * y;
    }
  }
  if (wSum <= 0) return [cx0, cy0];
  return [xSum / wSum, ySum / wSum];
};

/**
 * Locate the pupil as the darkest local peak, refined by a small-window COM.
 * Avoids the lateral-gaze bias of a global dark-pixel center of mass.
 */
export const getSinglePupil = (
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): PupilDetection | null => {
  if (width < 4 || height < 4) return null;

  const blurred = boxBlur3(pixels, width, height);
  const peak = darkestPeak(blurred, width, height);
  if (!peak) return null;

  const radius = Math.max(2, Math.min(width, height) * REFINE_RADIUS_FRAC);
  return localDarkCom(blurred, width, height, peak[0], peak[1], radius);
};

/**
 * Locate pupils in left/right eye patches (requires ImageData on each eye).
 */
export const getPupils = (eyesObj: { left: Eye; right: Eye }): { left: Eye; right: Eye } => {
  for (const side of ['left', 'right'] as const) {
    const eye = eyesObj[side];
    if (!eye.patch || eye.width <= 0 || eye.height <= 0) continue;
    const gray = grayscale(eye.patch.data, eye.width, eye.height);
    const pupil = getSinglePupil(gray, eye.width, eye.height);
    if (pupil) eye.pupil = pupil;
    else delete eye.pupil;
  }
  return eyesObj;
};

/** Identity helper — pupil is already stored as [cx, cy]. */
export const pupilCenterInPatch = (pupil: PupilDetection): [number, number] => pupil;
