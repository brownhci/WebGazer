const params = {
  // Path to MediaPipe face_mesh solution files (WASM + model data)
  faceMeshSolutionPath: './mediapipe/face_mesh',
  moveTickSize: 50,
  videoContainerId: 'webgazerVideoContainer',
  videoElementId: 'webgazerVideoFeed',
  videoElementCanvasId: 'webgazerVideoCanvas',
  faceOverlayId: 'webgazerFaceOverlay',
  faceFeedbackBoxId: 'webgazerFaceFeedbackBox',
  gazeDotId: 'webgazerGazeDot',
  videoViewerWidth: 320,
  videoViewerHeight: 240,
  faceFeedbackBoxRatio: 0.66,
  // View options
  showVideo: true,
  mirrorVideo: true,
  showFaceOverlay: true,
  showFaceFeedbackBox: true,
  showGazeDot: true,
  camConstraints: { video: { width: { min: 320, ideal: 640, max: 1920 }, height: { min: 240, ideal: 480, max: 1080 }, facingMode: "user" } },
  dataTimestep: 50,
  showVideoPreview: true,
  applyKalmanFilter: true,
  // Higher values reduce gaze-dot jitter but increase visual latency.
  gazeSmoothingWindowSize: 8, // Previous value: 4
  // Kalman tuning: higher measurement noise trusts raw gaze less; lower
  // process noise makes movement smoother but slower to follow fast changes.
  kalmanMeasurementNoise: 120, // Previous value: 47
  kalmanProcessNoiseScale: 0.08, // Previous value: 1 / 10
  saveDataAcrossSessions: true,
  // Whether or not to store accuracy eigenValues, used by the calibration example file
  storingPoints: false,

  trackEye: 'both',
};

export default params;
