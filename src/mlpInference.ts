export type MlpLayer =
  | { type: 'linear'; weight: number[][]; bias: number[] }
  | { type: 'layernorm'; weight: number[]; bias: number[] };

export type MlpModelBundle = {
  input_dim: number;
  hidden_dims: number[];
  feature_names: string[];
  scaler_mean: number[];
  scaler_scale: number[];
  layers: MlpLayer[];
};

const GELU_COEF = 0.044715;
const SQRT_2_PI = Math.sqrt(2 / Math.PI);

function gelu (x: number): number {
  return 0.5 * x * (1 + Math.tanh(SQRT_2_PI * (x + GELU_COEF * x * x * x)));
}

function layerNorm (x: number[], gamma: number[], beta: number[]): number[] {
  const mean = x.reduce((a, v) => a + v, 0) / x.length;
  const variance = x.reduce((a, v) => a + (v - mean) ** 2, 0) / x.length;
  const invStd = 1 / Math.sqrt(variance + 1e-5);
  return x.map((v, i) => (v - mean) * invStd * gamma[i] + beta[i]);
}

function linear (x: number[], weight: number[][], bias: number[]): number[] {
  return weight.map((row, i) => row.reduce((sum, w, j) => sum + w * x[j], 0) + bias[i]);
}

function sigmoid (x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function standardize (features: number[], mean: number[], scale: number[]): number[] {
  return features.map((v, i) => (v - mean[i]) / (scale[i] || 1));
}

/**
 * Forward pass through the exported GazeMLP (inference mode: no dropout).
 * Returns normalized gaze coordinates in [0, 1].
 */
export function mlpPredict (bundle: MlpModelBundle, features: number[]): [number, number] {
  if (features.length !== bundle.input_dim) {
    throw new Error(`Expected ${bundle.input_dim} features, got ${features.length}`);
  }

  let x = standardize(features, bundle.scaler_mean, bundle.scaler_scale);

  for (let i = 0; i < bundle.layers.length; i++) {
    const layer = bundle.layers[i];
    if (layer.type === 'linear') {
      x = linear(x, layer.weight, layer.bias);
      const next = bundle.layers[i + 1];
      if (!next || next.type !== 'layernorm') {
        return [sigmoid(x[0]), sigmoid(x[1])];
      }
    } else if (layer.type === 'layernorm') {
      x = layerNorm(x, layer.weight, layer.bias).map(gelu);
    }
  }

  throw new Error('Invalid MLP layer stack');
}
