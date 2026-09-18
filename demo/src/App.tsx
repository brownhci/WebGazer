import { useCallback, useEffect, useRef, useState } from 'react';
import { WebGazer, type PredictionResult } from 'webgazer';
import { CalibrationOverlay } from './CalibrationOverlay';

type Status = 'idle' | 'starting' | 'running' | 'error';
type RegressionMode = 'mlpReg' | 'ridgeReg';

type DisplayOptions = {
  camera: boolean;
  facemesh: boolean;
  iris: boolean;
  gazeDot: boolean;
  gazeTrail: boolean;
};

const DEFAULT_DISPLAY: DisplayOptions = {
  camera: true,
  facemesh: true,
  iris: true,
  gazeDot: true,
  gazeTrail: true
};

const DISPLAY_LABELS: { key: keyof DisplayOptions; label: string }[] = [
  { key: 'camera', label: 'Camera feed' },
  { key: 'facemesh', label: 'Facemesh landmarks' },
  { key: 'iris', label: 'Iris centers' },
  { key: 'gazeDot', label: 'Estimated gaze position' },
  { key: 'gazeTrail', label: 'Gaze trail' }
];

const applyDisplayOptions = (wg: WebGazer, display: DisplayOptions, mirrorVideo: boolean): void => {
  if (display.facemesh) wg.showFaceMeshOverlay(mirrorVideo);
  else wg.hideFaceMeshOverlay();

  wg.setIrisOverlayVisible(display.iris);
  wg.setEyeRegionsVisible(false);

  if (display.gazeDot) wg.showGazeDot();
  else wg.hideGazeDot();

  if (display.gazeTrail) wg.showGazeTrail();
  else wg.hideGazeTrail();
};

export const App = (): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webgazerRef = useRef<WebGazer | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [display, setDisplay] = useState<DisplayOptions>(DEFAULT_DISPLAY);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [regressionMode, setRegressionMode] = useState<RegressionMode>('mlpReg');
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [calibrationKey, setCalibrationKey] = useState(0);
  const [modelReady, setModelReady] = useState(false);

  const usesCalibration = regressionMode === 'ridgeReg';

  useEffect(() => () => {
    webgazerRef.current?.destroy();
    webgazerRef.current = null;
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.visibility = display.camera ? 'visible' : 'hidden';
    }
  }, [display.camera, status]);

  useEffect(() => {
    if (status !== 'running' || !webgazerRef.current) return;
    applyDisplayOptions(webgazerRef.current, display, true);
  }, [display, status]);

  const toggleDisplay = useCallback((key: keyof DisplayOptions) => {
    setDisplay(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const start = async (): Promise<void> => {
    if (!videoRef.current || status === 'starting' || status === 'running') return;

    setStatus('starting');
    setError(null);
    setModelReady(false);
    setCalibrated(!usesCalibration);
    setCalibrating(usesCalibration);
    setCalibrationKey(k => k + 1);

    try {
      const wg = new WebGazer({
        saveDataAcrossSessions: false,
        useCalibration: usesCalibration ? 'click' : false,
        regression: regressionMode
      });
      webgazerRef.current = wg;

      if (regressionMode === 'mlpReg') {
        wg.loadMlpModel()
          .then(() => setModelReady(true))
          .catch(err => setError(err instanceof Error ? err.message : String(err)));
      }

      wg.addGazeListener((data: PredictionResult | undefined) => {
        if (data) setPrediction(data);
      });

      await wg.start({
        gazeDot: !usesCalibration,
        gazeTrail: !usesCalibration,
        trackEye: 'both'
      });

      await wg.showVideoFeedback(videoRef.current, {
        faceFeedback: true,
        mirrorVideo: true
      });

      wg.setEyeRegionsVisible(false);
      applyDisplayOptions(wg, display, true);

      setStatus('running');
    } catch (err) {
      setStatus('error');
      setCalibrating(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const stop = (): void => {
    webgazerRef.current?.stop();
    setStatus('idle');
    setPrediction(null);
    setCalibrating(false);
    setCalibrated(false);
    setModelReady(false);
  };

  const clearCalibration = (): void => {
    if (!usesCalibration) return;
    webgazerRef.current?.clearData();
    setCalibrated(false);
    setCalibrating(true);
    setPrediction(null);
    setCalibrationKey(k => k + 1);
  };

  const handleCalibrationComplete = (): void => {
    setCalibrating(false);
    setCalibrated(true);
    webgazerRef.current?.startCalibration('click');
  };

  const iris = prediction?.eyeFeatures?.iris;

  return (
    <div className="app">
      <header>
        <h1>WebGazer — gaze demo</h1>
        <p>
          {regressionMode === 'mlpReg'
            ? 'Pre-trained MLP (GazeT): gaze dot appears immediately, no calibration.'
            : 'Ridge regression: click each calibration point several times.'}
        </p>
      </header>

      <div className="layout">
        <div className="video-wrap">
          <video ref={videoRef} autoPlay muted playsInline />
        </div>

        <aside className="panel">
          <h2>Prediction</h2>
          <div className="stats">
            <div>Status: <span>{status}</span></div>
            <div>Model: <span>{regressionMode === 'mlpReg' ? (modelReady ? 'MLP loaded' : '—') : 'ridge'}</span></div>
            <div>Calibration: <span>{usesCalibration ? (calibrating ? 'in progress' : calibrated ? 'done' : '—') : 'not required'}</span></div>
            <div>Gaze X: <span>{prediction ? Math.round(prediction.x) : '—'}</span></div>
            <div>Gaze Y: <span>{prediction ? Math.round(prediction.y) : '—'}</span></div>
            <div>Left iris: <span>{iris ? `${iris.left[0].toFixed(2)}, ${iris.left[1].toFixed(2)}` : '—'}</span></div>
            <div>Right iris: <span>{iris ? `${iris.right[0].toFixed(2)}, ${iris.right[1].toFixed(2)}` : '—'}</span></div>
            <div>Features: <span>{prediction?.eyeFeatures?.features.length ?? '—'}</span></div>
          </div>

          <fieldset className="display-options">
            <legend>Regression</legend>
            <label className="checkbox-row">
              <input
                type="radio"
                name="regression"
                checked={regressionMode === 'mlpReg'}
                disabled={status === 'running' || status === 'starting'}
                onChange={() => setRegressionMode('mlpReg')}
              />
              Pre-trained MLP (no calibration)
            </label>
            <label className="checkbox-row">
              <input
                type="radio"
                name="regression"
                checked={regressionMode === 'ridgeReg'}
                disabled={status === 'running' || status === 'starting'}
                onChange={() => setRegressionMode('ridgeReg')}
              />
              Ridge (click calibration)
            </label>
          </fieldset>

          <div className="actions">
            <button type="button" onClick={start} disabled={status === 'starting' || status === 'running'}>
              Start
            </button>
            <button type="button" onClick={stop} disabled={status !== 'running'}>
              Stop
            </button>
            {usesCalibration && (
              <button type="button" onClick={clearCalibration} disabled={status !== 'running'}>
                Clear calibration
              </button>
            )}
            <button
              type="button"
              className="options-toggle"
              onClick={() => setOptionsOpen(open => !open)}
              aria-expanded={optionsOpen}
            >
              {optionsOpen ? 'Hide display options' : 'Show display options'}
            </button>
          </div>

          {optionsOpen && (
            <fieldset className="display-options">
              <legend>Overlays</legend>
              {DISPLAY_LABELS.map(({ key, label }) => (
                <label key={key} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={display[key]}
                    onChange={() => toggleDisplay(key)}
                  />
                  {label}
                </label>
              ))}
              {status !== 'running' && (
                <p className="options-note">Overlay toggles take effect once tracking is started.</p>
              )}
            </fieldset>
          )}

          {error && <p className="status-error">{error}</p>}

          <p className="hint">
            {regressionMode === 'mlpReg'
              ? 'Weights are bundled in src/models/gaze_mlp.json (re-export with training/scripts/export_mlp_json.py).'
              : 'Gaze dot and trail appear after calibration. Iris offsets are normalized relative to each eye bounds center (−1 to 1).'}
          </p>
        </aside>
      </div>

      {usesCalibration && (
        <CalibrationOverlay
          key={calibrationKey}
          visible={calibrating && status === 'running'}
          onComplete={handleCalibrationComplete}
        />
      )}
    </div>
  );
};
