import { Ridge } from './worker_scripts/regression';
import type { EyesData } from './facemesh';
import { buildMlpFeatureVector } from './mlpFeatures';
import { mlpPredict, type MlpModelBundle } from './mlpInference';
import { importMlpModelBundle, screenCenter } from './mlpModelLoader';

export type MlpRegOptions = {
  useKalmanFilter?: boolean;
  moveTickSize?: number;
};

/**
 * Pre-trained MLP gaze regressor (no per-user calibration required).
 * Weights live in src/models/gaze_mlp.json (export via training/scripts/export_mlp_json.py).
 */
export class MlpReg extends Ridge {
  name = 'mlpReg' as const;

  private model: MlpModelBundle | null = null;
  private loadPromise: Promise<void>;

  constructor ({ useKalmanFilter = true, moveTickSize = 50 }: MlpRegOptions = {}) {
    super({ useKalmanFilter, moveTickSize });
    this.loadPromise = importMlpModelBundle()
      .then(bundle => {
        this.model = bundle;
      })
      .catch(err => {
        console.error('Failed to load MLP model:', err);
        throw err;
      });
  }

  /** Resolves when weights are parsed and ready for inference. */
  whenReady = (): Promise<void> => this.loadPromise;

  isReady = (): boolean => this.model !== null;

  predict = (eyesObj: EyesData | undefined): { x: number; y: number } | undefined => {
    if (!this.model) return screenCenter();
    if (!eyesObj) return;

    const features = buildMlpFeatureVector(eyesObj);
    if (!features) return;

    const [nx, ny] = mlpPredict(this.model, features);
    const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    let predictedX = Math.round(nx * w);
    let predictedY = Math.round(ny * h);

    if (this.useKalmanFilter) {
      const [x, y] = this.kalman.update([predictedX, predictedY]);
      return { x, y };
    }
    return { x: predictedX, y: predictedY };
  };

  /** MLP is fixed; calibration clicks are ignored. */
  addData = (): void => {};

  getData = (): never[] => [];

  setData = (): void => {};
}
