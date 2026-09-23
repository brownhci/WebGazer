import { grayscale, type Eye } from './worker_scripts/util';

/**
 * Iris center via sclera + limbus curvature.
 *
 * 1. Large bright blobs = sclera.
 * 2. Dark = clearly below sclera mean; morphological opening kills lashes /
 *    thin skin bridges.
 * 3. Keep dark components that touch the sclera.
 * 4. Prefer the candidate (blob COM or circle fit) closest to the eye-rect
 *    center — rejects lash / brow / canthus blobs on the border.
 * 5. Temporal EMA across frames to damp residual noise.
 */
export type PupilDetection = [number, number];

const SCLERA_PERCENTILE = 0.40;
const MIN_SCLERA_BLOB = 6;
const SCLERA_CONTACT_RADIUS = 2;
const DARK_OF_SCLERA = 0.65;
const OPEN_RADIUS = 1;
const MIN_THICKNESS = 1;
const MAX_ELONG = 4.0;
const SECTORS = 16;
const INLIER_FRAC = 0.15;
const MIN_INLIERS = 5;
/** Temporal EMA on successive frames (1 = no memory, 0 = freeze). */
const SMOOTH_ALPHA = 0.35;
const REFIT_ITERS = 2;

let prevPupilLeft: PupilDetection | null = null;
let prevPupilRight: PupilDetection | null = null;

export const fillPolygonMask = (
  width: number,
  height: number,
  poly: Array<[number, number]>
): Uint8Array => {
  const mask = new Uint8Array(width * height);
  if (poly.length < 3 || width < 1 || height < 1) return mask;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return mask;
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) mask[i] = data[p] > 127 ? 1 : 0;
  return mask;
};

export const eyelidPolygonFromArcs = (
  upper: Array<[number, number]>,
  lower: Array<[number, number]>
): Array<[number, number]> => {
  const poly: Array<[number, number]> = [...upper];
  for (let i = lower.length - 1; i >= 0; i--) poly.push(lower[i]);
  return poly;
};

const boxBlur3 = (
  src: Float32Array | Uint8ClampedArray | number[],
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
        for (let dx = -1; dx <= 1; dx++) sum += src[(y + dy) * width + (x + dx)];
      }
      out[y * width + x] = sum / 9;
    }
  }
  return out;
};

const maskedHighPercentile = (
  values: Float32Array,
  mask: Uint8Array | null,
  percentile: number
): number => {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    if (mask && !mask[i]) continue;
    hist[Math.min(255, Math.max(0, Math.round(values[i])))]++;
    n++;
  }
  if (!n) return 0;
  const target = Math.max(1, Math.floor(n * percentile));
  let acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 0;
};

const connectedComponents = (
  binary: Uint8Array,
  width: number,
  height: number
): number[][] => {
  const labels = new Int32Array(width * height);
  const members: number[][] = [];
  const queue = new Int32Array(width * height);
  let next = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = y * width + x;
      if (!binary[s] || labels[s]) continue;
      next++;
      const list: number[] = [];
      let qh = 0;
      let qt = 0;
      queue[qt++] = s;
      labels[s] = next;
      while (qh < qt) {
        const i = queue[qh++];
        list.push(i);
        const cx = i % width;
        const cy = (i / width) | 0;
        const neigh = [
          cy > 0 ? i - width : -1,
          cy < height - 1 ? i + width : -1,
          cx > 0 ? i - 1 : -1,
          cx < width - 1 ? i + 1 : -1
        ];
        for (const n of neigh) {
          if (n < 0 || !binary[n] || labels[n]) continue;
          labels[n] = next;
          queue[qt++] = n;
        }
      }
      members.push(list);
    }
  }
  return members;
};

const keepLargeBlobs = (
  binary: Uint8Array,
  width: number,
  height: number,
  minSize: number
): Uint8Array => {
  const members = connectedComponents(binary, width, height);
  const out = new Uint8Array(width * height);
  for (const list of members) {
    if (list.length < minSize) continue;
    for (const i of list) out[i] = 1;
  }
  return out;
};

const dilateBinary = (
  src: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array => {
  if (radius <= 0) return src;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!src[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
};

const erodeBinary = (
  src: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array => {
  if (radius <= 0) return src;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!src[y * width + x]) continue;
      let ok = true;
      for (let dy = -radius; dy <= radius && ok; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || !src[ny * width + nx]) {
            ok = false;
            break;
          }
        }
      }
      if (ok) out[y * width + x] = 1;
    }
  }
  return out;
};

const maxThickness = (members: number[], width: number, height: number): number => {
  const active = new Uint8Array(width * height);
  for (const i of members) active[i] = 1;
  let remaining = members.length;
  let layer = 0;
  const queue: number[] = [];
  while (remaining > 0) {
    queue.length = 0;
    for (const i of members) {
      if (!active[i]) continue;
      const x = i % width;
      const y = (i / width) | 0;
      let border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (!border) {
        for (const ni of [i - width, i + width, i - 1, i + 1]) {
          if (!active[ni]) {
            border = true;
            break;
          }
        }
      }
      if (border) queue.push(i);
    }
    if (!queue.length) break;
    layer++;
    for (const i of queue) {
      if (active[i]) {
        active[i] = 0;
        remaining--;
      }
    }
    if (layer > 64) break;
  }
  return layer;
};

const touches = (i: number, width: number, height: number, other: Uint8Array): boolean => {
  const x = i % width;
  const y = (i / width) | 0;
  for (const n of [
    y > 0 ? i - width : -1,
    y < height - 1 ? i + width : -1,
    x > 0 ? i - 1 : -1,
    x < width - 1 ? i + 1 : -1
  ]) {
    if (n >= 0 && other[n]) return true;
  }
  return false;
};

const fitCircleKasa = (
  xs: number[],
  ys: number[],
  active: Uint8Array
): { cx: number; cy: number; r: number; rmse: number; n: number } | null => {
  let n = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let sxz = 0;
  let syz = 0;
  let sz = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!active[i]) continue;
    const x = xs[i];
    const y = ys[i];
    const z = x * x + y * y;
    sx += x;
    sy += y;
    sz += z;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    sxz += x * z;
    syz += y * z;
    n++;
  }
  if (n < 3) return null;
  const a11 = sxx;
  const a12 = sxy;
  const a13 = sx;
  const a22 = syy;
  const a23 = sy;
  const a33 = n;
  const b1 = -sxz;
  const b2 = -syz;
  const b3 = -sz;
  const det =
    a11 * (a22 * a33 - a23 * a23) -
    a12 * (a12 * a33 - a23 * a13) +
    a13 * (a12 * a23 - a22 * a13);
  if (Math.abs(det) < 1e-6) return null;
  const inv11 = (a22 * a33 - a23 * a23) / det;
  const inv12 = (a13 * a23 - a12 * a33) / det;
  const inv13 = (a12 * a23 - a13 * a22) / det;
  const inv22 = (a11 * a33 - a13 * a13) / det;
  const inv23 = (a12 * a13 - a11 * a23) / det;
  const inv33 = (a11 * a22 - a12 * a12) / det;
  const D = inv11 * b1 + inv12 * b2 + inv13 * b3;
  const E = inv12 * b1 + inv22 * b2 + inv23 * b3;
  const F = inv13 * b1 + inv23 * b2 + inv33 * b3;
  const cx = -D / 2;
  const cy = -E / 2;
  const r2 = cx * cx + cy * cy - F;
  if (r2 <= 1) return null;
  const r = Math.sqrt(r2);
  let err = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!active[i]) continue;
    const di = Math.hypot(xs[i] - cx, ys[i] - cy) - r;
    err += di * di;
  }
  return { cx, cy, r, rmse: Math.sqrt(err / n), n };
};

const angularCoverageActive = (
  xs: number[],
  ys: number[],
  active: Uint8Array,
  cx: number,
  cy: number
): number => {
  const hit = new Uint8Array(SECTORS);
  for (let i = 0; i < xs.length; i++) {
    if (!active[i]) continue;
    let a = Math.atan2(ys[i] - cy, xs[i] - cx);
    if (a < 0) a += Math.PI * 2;
    hit[Math.min(SECTORS - 1, ((a / (Math.PI * 2)) * SECTORS) | 0)] = 1;
  }
  let n = 0;
  for (let i = 0; i < SECTORS; i++) n += hit[i];
  return n / SECTORS;
};

/** Deterministic circle fit with iterative outlier rejection (no RNG). */
const fitCircleOnEdges = (
  xs: number[],
  ys: number[],
  minR: number,
  maxR: number,
  blurred: Float32Array,
  sclera: Uint8Array,
  width: number,
  height: number,
  mask: Uint8Array | null,
  scleraMean: number
): { cx: number; cy: number; r: number; score: number } | null => {
  const n = xs.length;
  if (n < MIN_INLIERS) return null;
  const active = new Uint8Array(n);
  active.fill(1);
  let circ = fitCircleKasa(xs, ys, active);
  if (!circ) return null;

  for (let iter = 0; iter < REFIT_ITERS; iter++) {
    const tol = Math.max(1.25, circ.r * INLIER_FRAC);
    let kept = 0;
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue;
      const d = Math.abs(Math.hypot(xs[i] - circ.cx, ys[i] - circ.cy) - circ.r);
      if (d > tol) active[i] = 0;
      else kept++;
    }
    if (kept < MIN_INLIERS) return null;
    const refit = fitCircleKasa(xs, ys, active);
    if (!refit) return null;
    circ = refit;
  }

  if (circ.r < minR || circ.r > maxR) return null;
  if (!inScleraBowl(circ.cx, circ.cy, circ.r, blurred, sclera, width, height, mask, scleraMean)) {
    return null;
  }
  const coverage = angularCoverageActive(xs, ys, active, circ.cx, circ.cy);
  if (coverage < 0.15) return null;
  const score = circ.n * coverage * coverage * (1 / (1 + circ.rmse / Math.max(1, circ.r * 0.15)));
  return { cx: circ.cx, cy: circ.cy, r: circ.r, score };
};

const inScleraBowl = (
  cx: number,
  cy: number,
  r: number,
  blurred: Float32Array,
  sclera: Uint8Array,
  width: number,
  height: number,
  mask: Uint8Array | null,
  scleraMean: number
): boolean => {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  if (icx < 0 || icy < 0 || icx >= width || icy >= height) return false;
  const ci = icy * width + icx;
  if (mask && !mask[ci]) return false;
  if (sclera[ci] || blurred[ci] > scleraMean * 0.65) return false;
  const whiteCut = scleraMean * 0.75;
  let bright = 0;
  const qHit = [false, false, false, false];
  for (let s = 0; s < SECTORS; s++) {
    const a = (s / SECTORS) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(a) * r * 1.15);
    const py = Math.round(cy + Math.sin(a) * r * 1.15);
    if (px < 0 || py < 0 || px >= width || py >= height) continue;
    const pi = py * width + px;
    if (mask && !mask[pi]) continue;
    if (sclera[pi] || blurred[pi] >= whiteCut) {
      bright++;
      qHit[(s / (SECTORS / 4)) | 0] = true;
    }
  }
  let quads = 0;
  for (const q of qHit) if (q) quads++;
  return bright >= Math.ceil(SECTORS * 0.2) && quads >= 2;
};

const findIrisCenter = (
  blurred: Float32Array,
  width: number,
  height: number,
  mask: Uint8Array | null
): PupilDetection => {
  const scleraCut = maskedHighPercentile(blurred, mask, SCLERA_PERCENTILE);
  const scleraRaw = new Uint8Array(width * height);
  for (let i = 0; i < blurred.length; i++) {
    if (mask && !mask[i]) continue;
    if (blurred[i] >= scleraCut) scleraRaw[i] = 1;
  }
  const sclera = keepLargeBlobs(scleraRaw, width, height, MIN_SCLERA_BLOB);
  let scleraN = 0;
  let scleraMean = 0;
  for (let i = 0; i < sclera.length; i++) {
    if (!sclera[i]) continue;
    scleraN++;
    scleraMean += blurred[i];
  }
  if (scleraN < MIN_SCLERA_BLOB) {
    return alwaysCenter(blurred, width, height, mask, new Uint8Array(width * height), 120);
  }
  scleraMean /= scleraN;
  const scleraContact = dilateBinary(sclera, width, height, SCLERA_CONTACT_RADIUS);

  const darkRaw = new Uint8Array(width * height);
  const darkThresh = scleraMean * DARK_OF_SCLERA;
  for (let i = 0; i < blurred.length; i++) {
    if (mask && !mask[i]) continue;
    if (sclera[i]) continue;
    if (blurred[i] < darkThresh) darkRaw[i] = 1;
  }
  const dark = dilateBinary(erodeBinary(darkRaw, width, height, OPEN_RADIUS), width, height, OPEN_RADIUS);

  const eyeSpan = Math.max(width, height);
  const minR = eyeSpan * 0.06;
  const maxR = eyeSpan * 0.55;
  const midX = (width - 1) / 2;
  const midY = (height - 1) / 2;
  // Prefer the dark blob whose barycenter is closest to the eye-rect center
  // (rejects lash / brow / canthus blobs glued to the border).
  let bestCx = -1;
  let bestCy = -1;
  let bestDist = Infinity;
  let bestScore = -1;
  const consider = (cx: number, cy: number, quality: number): void => {
    const dist = Math.hypot(cx - midX, cy - midY);
    if (
      bestCx < 0 ||
      dist < bestDist - 0.5 ||
      (Math.abs(dist - bestDist) <= 0.5 && quality > bestScore)
    ) {
      bestCx = cx;
      bestCy = cy;
      bestDist = dist;
      bestScore = quality;
    }
  };

  const components = connectedComponents(dark, width, height);
  for (const list of components) {
    if (list.length < 6) continue;

    let adj = false;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let inten = 0;
    let sx = 0;
    let sy = 0;
    for (const i of list) {
      const x = i % width;
      const y = (i / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      inten += blurred[i];
      sx += x;
      sy += y;
      if (touches(i, width, height, scleraContact)) adj = true;
    }
    if (!adj) continue;

    const thick = maxThickness(list, width, height);
    if (thick < MIN_THICKNESS) continue;
    const elong =
      Math.max(maxX - minX + 1, maxY - minY + 1) /
      Math.max(1, Math.min(maxX - minX + 1, maxY - minY + 1));
    if (elong > MAX_ELONG) continue;

    const meanDark = inten / list.length;
    const darkness = Math.max(0.05, 1 - meanDark / Math.max(1, scleraMean));
    const comCx = sx / list.length;
    const comCy = sy / list.length;
    const quality = (list.length * thick * darkness) / elong;
    consider(comCx, comCy, quality);

    const xs: number[] = [];
    const ys: number[] = [];
    for (const i of list) {
      if (!touches(i, width, height, scleraContact)) continue;
      if (mask) {
        const x = i % width;
        const y = (i / width) | 0;
        let nearExt = x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2;
        if (!nearExt) {
          for (const [dx, dy] of [
            [0, -2],
            [0, 2],
            [-2, 0],
            [2, 0]
          ] as const) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]) {
              nearExt = true;
              break;
            }
          }
        }
        if (nearExt) continue;
      }
      xs.push(i % width);
      ys.push((i / width) | 0);
    }
    if (xs.length < MIN_INLIERS) continue;

    const hit = fitCircleOnEdges(xs, ys, minR, maxR, blurred, sclera, width, height, mask, scleraMean);
    if (hit) consider(hit.cx, hit.cy, hit.score);
  }

  if (bestCx >= 0 && bestCy >= 0 && bestCx < width && bestCy < height) {
    return [bestCx, bestCy];
  }
  return alwaysCenter(blurred, width, height, mask, sclera, darkThresh);
};

/** Dark COM → inverse-intensity mask COM → geometric center. Never fails. */
const alwaysCenter = (
  blurred: Float32Array,
  width: number,
  height: number,
  mask: Uint8Array | null,
  sclera: Uint8Array,
  darkThresh: number
): PupilDetection => {
  const dark = darkCom(blurred, width, height, mask, sclera, darkThresh);
  if (dark) return dark;
  let wSum = 0;
  let xSum = 0;
  let ySum = 0;
  let nMask = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask && !mask[i]) continue;
      nMask++;
      mx += x;
      my += y;
      const w = 256 - blurred[i];
      wSum += w;
      xSum += w * x;
      ySum += w * y;
    }
  }
  if (wSum > 0) return [xSum / wSum, ySum / wSum];
  if (nMask > 0) return [mx / nMask, my / nMask];
  return [(width - 1) / 2, (height - 1) / 2];
};

const darkCom = (
  blurred: Float32Array,
  width: number,
  height: number,
  mask: Uint8Array | null,
  sclera: Uint8Array,
  darkThresh: number
): PupilDetection | null => {
  const midX = (width - 1) / 2;
  const midY = (height - 1) / 2;
  const span2 = Math.max(width, height) ** 2;
  let wSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask && !mask[i]) continue;
      if (sclera[i]) continue;
      if (blurred[i] >= darkThresh) continue;
      // Down-weight border darkness (lashes / canthus).
      const centr = 1 / (1 + ((x - midX) ** 2 + (y - midY) ** 2) / (span2 * 0.08));
      const w = (darkThresh - blurred[i] + 1) * centr;
      wSum += w;
      xSum += w * x;
      ySum += w * y;
    }
  }
  if (wSum <= 0) return null;
  return [xSum / wSum, ySum / wSum];
};

export const getSinglePupil = (
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number,
  mask: Uint8Array | null = null
): PupilDetection => {
  if (width < 1 || height < 1) return [0, 0];
  if (width < 4 || height < 4) return [(width - 1) / 2, (height - 1) / 2];
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = pixels[i];
  return findIrisCenter(boxBlur3(gray, width, height), width, height, mask);
};

export const getPupils = (eyesObj: { left: Eye; right: Eye }): { left: Eye; right: Eye } => {
  for (const side of ['left', 'right'] as const) {
    const eye = eyesObj[side];
    if (!eye.patch || eye.width <= 0 || eye.height <= 0) continue;
    const g = grayscale(eye.patch.data, eye.width, eye.height);
    const raw = getSinglePupil(g, eye.width, eye.height, eye.eyelidMask ?? null);
    // Eyes are reallocated every frame — keep EMA state on this module.
    const prev = side === 'left' ? prevPupilLeft : prevPupilRight;
    const smoothed: PupilDetection = prev
      ? [
        SMOOTH_ALPHA * raw[0] + (1 - SMOOTH_ALPHA) * prev[0],
        SMOOTH_ALPHA * raw[1] + (1 - SMOOTH_ALPHA) * prev[1]
      ]
      : raw;
    eye.pupil = smoothed;
    if (side === 'left') prevPupilLeft = smoothed;
    else prevPupilRight = smoothed;
  }
  return eyesObj;
};

/** Call if face tracking drops, so the next lock does not blend with a stale position. */
export const resetPupilSmoothing = (): void => {
  prevPupilLeft = null;
  prevPupilRight = null;
};

export const pupilCenterInPatch = (pupil: PupilDetection): [number, number] => pupil;
