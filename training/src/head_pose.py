"""
Head pose via solvePnP on Face Mesh landmarks (mirrors src/headPose.ts).

Canonical 3D face (mm) + approximate pinhole camera (f = image width).
Returns yaw/pitch/roll (rad) and translation normalized by focal length.
"""

from __future__ import annotations

import math

import cv2
import numpy as np

# MediaPipe indices — left/right = left/right of the *image* when facing the camera
# (idx 33 ≈ person's right eye outer, 263 ≈ person's left eye outer).
POSE_LANDMARK_INDICES = (1, 152, 33, 263, 61, 291)

# Generic adult face model in millimetres (OpenCV / learnopencv convention).
FACE_3D_MODEL_MM = np.array(
    [
        [0.0, 0.0, 0.0],  # nose tip
        [0.0, -63.6, -12.5],  # chin
        [-43.3, 32.7, -26.0],  # left eye outer (image left)
        [43.3, 32.7, -26.0],  # right eye outer (image right)
        [-28.9, -28.9, -24.1],  # left mouth
        [28.9, -28.9, -24.1],  # right mouth
    ],
    dtype=np.float64,
)


def _camera_matrix(image_w: float, image_h: float) -> np.ndarray:
    focal = float(max(image_w, 1.0))
    cx = float(image_w) * 0.5
    cy = float(image_h) * 0.5
    return np.array(
        [[focal, 0.0, cx], [0.0, focal, cy], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )


def rotation_matrix_to_euler(R: np.ndarray) -> tuple[float, float, float]:
    """
    Extract (yaw, pitch, roll) in radians from a rotation matrix.
    Convention: yaw=Y, pitch=X, roll=Z (same as src/headPose.ts).
    """
    sy = math.sqrt(float(R[0, 0]) ** 2 + float(R[1, 0]) ** 2)
    if sy > 1e-6:
        pitch = math.atan2(-float(R[2, 0]), sy)
        yaw = math.atan2(float(R[1, 0]), float(R[0, 0]))
        roll = math.atan2(float(R[2, 1]), float(R[2, 2]))
    else:
        pitch = math.atan2(-float(R[2, 0]), sy)
        yaw = math.atan2(-float(R[0, 1]), float(R[1, 1]))
        roll = 0.0
    return yaw, pitch, roll


def estimate_head_pose(
    landmarks: np.ndarray,
    image_w: int | float,
    image_h: int | float,
) -> tuple[float, float, float, float, float, float] | None:
    """
    Returns (yaw, pitch, roll, tx, ty, tz) or None on failure.
    tx/ty/tz = tvec / focal (dimensionless).
    """
    if landmarks.shape[0] < 292:
        return None
    image_w = float(max(image_w, 1.0))
    image_h = float(max(image_h, 1.0))
    image_points = np.array(
        [landmarks[i, :2] for i in POSE_LANDMARK_INDICES],
        dtype=np.float64,
    )
    if not np.isfinite(image_points).all():
        return None

    cam = _camera_matrix(image_w, image_h)
    dist = np.zeros((4, 1), dtype=np.float64)
    ok, rvec, tvec = cv2.solvePnP(
        FACE_3D_MODEL_MM,
        image_points,
        cam,
        dist,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not ok:
        return None

    R, _ = cv2.Rodrigues(rvec)
    yaw, pitch, roll = rotation_matrix_to_euler(R)
    focal = image_w
    t = tvec.reshape(3)
    if abs(float(t[2])) < 1e-6:
        return None
    tx, ty, tz = float(t[0] / focal), float(t[1] / focal), float(t[2] / focal)
    if not all(math.isfinite(v) for v in (yaw, pitch, roll, tx, ty, tz)):
        return None
    return yaw, pitch, roll, tx, ty, tz
