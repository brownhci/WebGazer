"""MediaPipe Face Mesh wrapper for batch offline feature extraction."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

from features import TrackEye, build_feature_vector


@dataclass
class FaceMeshResult:
    features: np.ndarray
    landmarks: np.ndarray


class FaceMeshExtractor:
    def __init__(self, max_num_faces: int = 1) -> None:
        self._mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=max_num_faces,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def close(self) -> None:
        self._mesh.close()

    def __enter__(self) -> FaceMeshExtractor:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def extract_from_bgr(
        self,
        image_bgr: np.ndarray,
        track_eye: TrackEye = "both",
        include_head_pose: bool = True,
        include_scale_proxies: bool = True,
        flip_horizontal: bool = False,
    ) -> FaceMeshResult | None:
        if flip_horizontal:
            image_bgr = cv2.flip(image_bgr, 1)
        h, w = image_bgr.shape[:2]
        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        result = self._mesh.process(rgb)
        if not result.multi_face_landmarks:
            return None

        lm = result.multi_face_landmarks[0].landmark
        landmarks = np.zeros((478, 3), dtype=np.float32)
        for i, p in enumerate(lm):
            landmarks[i, 0] = p.x * w
            landmarks[i, 1] = p.y * h
            landmarks[i, 2] = p.z * w

        features = build_feature_vector(
            landmarks,
            image_bgr,
            track_eye=track_eye,
            include_head_pose=include_head_pose,
            include_scale_proxies=include_scale_proxies,
        )
        if features is None:
            return None
        return FaceMeshResult(features=features, landmarks=landmarks)

    def extract_from_path(self, path: Path | str, **kwargs: object) -> FaceMeshResult | None:
        image = cv2.imread(str(path))
        if image is None:
            return None
        return self.extract_from_bgr(image, **kwargs)  # type: ignore[arg-type]
