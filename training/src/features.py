"""
Feature extraction from MediaPipe Face Mesh + masked patch pupil + 3D head pose.

Iris/pupil offsets match the browser (src/facemesh.ts + src/pupil.ts):
search restricted to the eyelid-opening polygon.
Head pose matches src/headPose.ts (MediaPipe 3D face frame).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

import numpy as np

from pupil import detect_pupil_center, eyelid_polygon_from_arcs, fill_polygon_mask
from head_pose import estimate_head_pose

TrackEye = Literal["left", "right", "both"]

# Must match src/facemesh.ts EYE_PATCH_HEIGHT_RATIO
EYE_PATCH_HEIGHT_RATIO = 1.0

# Subject's left/right eye arcs (MediaPipe Face Mesh) — same as src/facemesh.ts
EYE_ARCS = {
    "left": {
        "upper": [466, 388, 387, 386, 385, 384, 398],
        "lower": [263, 249, 390, 373, 374, 380, 381, 382, 362],
    },
    "right": {
        "upper": [246, 161, 160, 159, 158, 157, 173],
        "lower": [33, 7, 163, 144, 145, 153, 154, 155, 133],
    },
}

# MediaPipe Face Mesh indices (478 landmarks with refine_landmarks=True)
NOSE_TIP = 1
CHIN = 152
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374
FACE_LEFT = 234
FACE_RIGHT = 454


@dataclass(frozen=True)
class EyeBounds:
    x: int
    y: int
    width: int
    height: int

    @property
    def center_x(self) -> float:
        return self.x + self.width / 2

    @property
    def center_y(self) -> float:
        return self.y + self.height / 2


def _lm(landmarks: np.ndarray, idx: int) -> np.ndarray:
    return landmarks[idx]


def shrink_eye_bounds_vertically(
    origin_x: int,
    origin_y: int,
    width: int,
    height: int,
    ratio: float,
) -> EyeBounds:
    new_h = max(1, int(round(height * ratio)))
    y = origin_y + (height - new_h) // 2
    return EyeBounds(x=origin_x, y=y, width=width, height=new_h)


def eye_patch_bounds_from_landmarks(
    landmarks: np.ndarray,
    side: Literal["left", "right"],
    image_w: int,
    image_h: int,
    height_ratio: float = EYE_PATCH_HEIGHT_RATIO,
) -> EyeBounds | None:
    """Eyelid-arc bbox, vertically shrunk — mirrors TFFaceMesh.makeEye."""
    arcs = EYE_ARCS[side]
    top = [_lm(landmarks, i) for i in arcs["upper"]]
    bottom = [_lm(landmarks, i) for i in arcs["lower"]]
    min_x = int(round(min(p[0] for p in top + bottom)))
    max_x = int(round(max(p[0] for p in top + bottom)))
    min_y = int(round(min(p[1] for p in top)))
    max_y = int(round(max(p[1] for p in bottom)))
    width = max_x - min_x
    height = max_y - min_y
    if width <= 0 or height <= 0:
        return None

    shrunk = shrink_eye_bounds_vertically(min_x, min_y, width, height, height_ratio)
    x = max(0, min(shrunk.x, image_w - 1))
    y = max(0, min(shrunk.y, image_h - 1))
    w = max(1, min(shrunk.width, image_w - x))
    h = max(1, min(shrunk.height, image_h - y))
    return EyeBounds(x=x, y=y, width=w, height=h)


def normalized_iris_offset(iris_center: np.ndarray, eye: EyeBounds) -> tuple[float, float]:
    half_w = eye.width / 2
    half_h = eye.height / 2
    if half_w == 0 or half_h == 0:
        return 0.0, 0.0
    return (
        float((iris_center[0] - eye.center_x) / half_w),
        float((iris_center[1] - eye.center_y) / half_h),
    )


def pupil_offset_from_image(
    image_bgr: np.ndarray,
    landmarks: np.ndarray,
    side: Literal["left", "right"],
) -> tuple[float, float] | None:
    h, w = image_bgr.shape[:2]
    eye = eye_patch_bounds_from_landmarks(landmarks, side, w, h)
    if eye is None:
        return None
    arcs = EYE_ARCS[side]
    upper = np.array([_lm(landmarks, i)[:2] for i in arcs["upper"]], dtype=np.float64)
    lower = np.array([_lm(landmarks, i)[:2] for i in arcs["lower"]], dtype=np.float64)
    poly_abs = eyelid_polygon_from_arcs(upper, lower)
    poly_local = poly_abs.copy()
    poly_local[:, 0] -= eye.x
    poly_local[:, 1] -= eye.y
    mask = fill_polygon_mask(eye.width, eye.height, poly_local)

    patch = image_bgr[eye.y : eye.y + eye.height, eye.x : eye.x + eye.width]
    center_local = detect_pupil_center(patch, mask)
    abs_x = eye.x + center_local[0]
    abs_y = eye.y + center_local[1]
    return normalized_iris_offset(np.array([abs_x, abs_y], dtype=np.float64), eye)


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
    """2D geometry proxies (nose/eyes/face). Complementary to solvePnP angles."""
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


def scale_proxies(landmarks: np.ndarray) -> tuple[float, float]:
    le = landmarks[LEFT_EYE_OUTER, :2]
    re = landmarks[RIGHT_EYE_OUTER, :2]
    ipd = float(np.linalg.norm(re - le))
    face_w = float(np.linalg.norm(landmarks[FACE_RIGHT, :2] - landmarks[FACE_LEFT, :2]))
    return ipd, face_w


def build_feature_vector(
    landmarks: np.ndarray,
    image_bgr: np.ndarray,
    track_eye: TrackEye = "both",
    include_head_pose: bool = True,
    include_scale_proxies: bool = True,
) -> np.ndarray | None:
    """
    Build face feature vector. Pupil offsets from eye-patch search.
    Head pose: MediaPipe 3D face frame (yaw/pitch/roll + nose/IPD offsets) + 2D proxies.
    """
    left_off = pupil_offset_from_image(image_bgr, landmarks, "left")
    right_off = pupil_offset_from_image(image_bgr, landmarks, "right")
    if left_off is None or right_off is None:
        return None

    parts: list[float] = []
    if track_eye == "left":
        parts.extend(left_off)
    elif track_eye == "right":
        parts.extend(right_off)
    else:
        parts.extend(left_off)
        parts.extend(right_off)

    if include_head_pose:
        h, w = image_bgr.shape[:2]
        pose = estimate_head_pose(landmarks, w, h)
        if pose is None:
            return None
        parts.extend(pose)
        parts.extend(head_pose_proxies(landmarks))
        parts.append(eye_aspect_ratio(landmarks, "left"))
        parts.append(eye_aspect_ratio(landmarks, "right"))

    if include_scale_proxies:
        ipd, face_w = scale_proxies(landmarks)
        parts.extend([ipd, face_w])

    return np.asarray(parts, dtype=np.float32)


FEATURE_NAMES_BOTH: list[str] = [
    "left_iris_x",
    "left_iris_y",
    "right_iris_x",
    "right_iris_y",
    "head_yaw",
    "head_pitch",
    "head_roll",
    "head_tx",
    "head_ty",
    "head_tz",
    "head_yaw_proxy",
    "head_pitch_proxy",
    "head_roll_proxy",
    "head_tx_norm",
    "head_ty_norm",
    "ear_left",
    "ear_right",
    "ipd_px",
    "face_width_px",
]
