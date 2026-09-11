"""
Feature extraction from MediaPipe Face Mesh landmarks.

Mirrors the logic in src/worker_scripts/util.ts and extends it with head-pose
proxies for the offline training pipeline.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

import numpy as np

TrackEye = Literal["left", "right", "both"]

# MediaPipe Face Mesh indices (478 landmarks with refine_landmarks=True)
NOSE_TIP = 1
CHIN = 152
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263
LEFT_MOUTH = 61
RIGHT_MOUTH = 291
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374
LEFT_IRIS_CENTER = 468
RIGHT_IRIS_CENTER = 473
FACE_LEFT = 234
FACE_RIGHT = 454


@dataclass(frozen=True)
class EyeBounds:
    x: float
    y: float
    width: float
    height: float

    @property
    def center_x(self) -> float:
        return self.x + self.width / 2

    @property
    def center_y(self) -> float:
        return self.y + self.height / 2


def _lm(landmarks: np.ndarray, idx: int) -> np.ndarray:
    return landmarks[idx]


def eye_bounds_from_landmarks(landmarks: np.ndarray, side: Literal["left", "right"]) -> EyeBounds:
    if side == "left":
        outer, inner = LEFT_EYE_OUTER, LEFT_EYE_INNER
        top, bottom = LEFT_EYE_TOP, LEFT_EYE_BOTTOM
    else:
        outer, inner = RIGHT_EYE_OUTER, RIGHT_EYE_INNER
        top, bottom = RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM

    xs = [landmarks[i, 0] for i in (outer, inner, top, bottom)]
    ys = [landmarks[i, 1] for i in (outer, inner, top, bottom)]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    return EyeBounds(x=x_min, y=y_min, width=x_max - x_min, height=y_max - y_min)


def normalized_iris_offset(iris_center: np.ndarray, eye: EyeBounds) -> tuple[float, float]:
    half_w = eye.width / 2
    half_h = eye.height / 2
    if half_w == 0 or half_h == 0:
        return 0.0, 0.0
    return (
        float((iris_center[0] - eye.center_x) / half_w),
        float((iris_center[1] - eye.center_y) / half_h),
    )


def eye_aspect_ratio(landmarks: np.ndarray, side: Literal["left", "right"]) -> float:
    if side == "left":
        p1, p4 = LEFT_EYE_OUTER, LEFT_EYE_INNER
        p2, p6 = LEFT_EYE_TOP, LEFT_EYE_BOTTOM
        p3, p5 = LEFT_EYE_TOP, LEFT_EYE_BOTTOM
    else:
        p1, p4 = RIGHT_EYE_OUTER, RIGHT_EYE_INNER
        p2, p6 = RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM
        p3, p5 = RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM

    def dist(a: int, b: int) -> float:
        return float(np.linalg.norm(landmarks[a, :2] - landmarks[b, :2]))

    horiz = dist(p1, p4)
    if horiz == 0:
        return 0.0
    return (dist(p2, p6) + dist(p3, p5)) / (2.0 * horiz)


def head_pose_proxies(landmarks: np.ndarray) -> tuple[float, float, float, float, float]:
    """Returns (yaw_proxy, pitch_proxy, roll_rad, tx_norm, ty_norm)."""
    nose = landmarks[NOSE_TIP, :2]
    le = landmarks[LEFT_EYE_OUTER, :2]
    re = landmarks[RIGHT_EYE_OUTER, :2]

    eye_mid = (le + re) / 2
    ipd = float(np.linalg.norm(re - le))
    if ipd < 1e-6:
        ipd = 1.0

    roll = math.atan2(re[1] - le[1], re[0] - le[0])
    yaw_proxy = float((nose[0] - eye_mid[0]) / ipd)
    pitch_proxy = float((nose[1] - eye_mid[1]) / ipd)

    face_cx = (landmarks[FACE_LEFT, 0] + landmarks[FACE_RIGHT, 0]) / 2
    face_cy = (landmarks[FACE_LEFT, 1] + landmarks[FACE_RIGHT, 1]) / 2
    tx_norm = float((nose[0] - face_cx) / ipd)
    ty_norm = float((nose[1] - face_cy) / ipd)

    return yaw_proxy, pitch_proxy, roll, tx_norm, ty_norm


def scale_proxies(landmarks: np.ndarray) -> tuple[float, float, float]:
    le = landmarks[LEFT_EYE_OUTER, :2]
    re = landmarks[RIGHT_EYE_OUTER, :2]
    ipd = float(np.linalg.norm(re - le))
    face_w = float(np.linalg.norm(landmarks[FACE_RIGHT, :2] - landmarks[FACE_LEFT, :2]))
    z_depth = float(landmarks[CHIN, 2] - landmarks[NOSE_TIP, 2])
    return ipd, face_w, z_depth


def build_feature_vector(
    landmarks: np.ndarray,
    track_eye: TrackEye = "both",
    include_head_pose: bool = True,
    include_scale_proxies: bool = True,
) -> np.ndarray | None:
    left_eye = eye_bounds_from_landmarks(landmarks, "left")
    right_eye = eye_bounds_from_landmarks(landmarks, "right")
    if left_eye.width <= 0 or right_eye.width <= 0:
        return None

    left_iris = _lm(landmarks, LEFT_IRIS_CENTER)
    right_iris = _lm(landmarks, RIGHT_IRIS_CENTER)
    left_off = normalized_iris_offset(left_iris, left_eye)
    right_off = normalized_iris_offset(right_iris, right_eye)

    parts: list[float] = []
    if track_eye == "left":
        parts.extend(left_off)
    elif track_eye == "right":
        parts.extend(right_off)
    else:
        parts.extend(left_off)
        parts.extend(right_off)

    if include_head_pose:
        parts.extend(head_pose_proxies(landmarks))
        parts.append(eye_aspect_ratio(landmarks, "left"))
        parts.append(eye_aspect_ratio(landmarks, "right"))

    if include_scale_proxies:
        ipd, face_w, z_depth = scale_proxies(landmarks)
        parts.extend([ipd, face_w, z_depth])

    return np.asarray(parts, dtype=np.float32)


FEATURE_NAMES_BOTH: list[str] = [
    "left_iris_x",
    "left_iris_y",
    "right_iris_x",
    "right_iris_y",
    "head_yaw_proxy",
    "head_pitch_proxy",
    "head_roll",
    "head_tx_norm",
    "head_ty_norm",
    "ear_left",
    "ear_right",
    "ipd_px",
    "face_width_px",
    "z_depth_proxy",
]
