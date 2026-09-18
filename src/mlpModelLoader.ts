import type { MlpModelBundle } from './mlpInference';

/** Lazy singleton — weights load only when MlpReg is first constructed. */
let bundlePromise: Promise<MlpModelBundle> | null = null;

export const importMlpModelBundle = (): Promise<MlpModelBundle> => {
  if (!bundlePromise) {
    bundlePromise = import('./models/gaze_mlp.json').then(
      module => module.default as MlpModelBundle
    );
  }
  return bundlePromise;
};

export const screenCenter = (): { x: number; y: number } => {
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  return { x: Math.round(w / 2), y: Math.round(h / 2) };
};
