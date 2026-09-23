"""
Head pose from MediaPipe Face Mesh 3D (mirrors src/headPose.ts).

No generic mm face template / solvePnP. Builds an orthonormal face frame
from landmark 3D coords (eye line × nose–chin), then Euler angles + nose
offset / IPD in that mesh's native 3D space.
"""

from __future__ import annotations

import math

import numpy as np

# Image-left / image-right when facing the camera.
NOSE_TIP = 1
CHIN = 152
EYE_OUTER_L = 33  # image left
EYE_OUTER_R = 263  # image right


def rotation_matrix_to_euler(R: np.ndarray) -> tuple[float, float, float]:
    """yaw=Y, pitch=X, roll=Z (same as src/headPose.ts)."""
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


def _face_rotation_from_landmarks(landmarks: np.ndarray) -> np.ndarray | None:
    """
    Columns of R are the face axes (X right, Y up, Z forward) in camera/mesh coords.
    """
    le = landmarks[EYE_OUTER_L, :3].astype(np.float64)
    re = landmarks[EYE_OUTER_R, :3].astype(np.float64)
    nose = landmarks[NOSE_TIP, :3].astype(np.float64)
    chin = landmarks[CHIN, :3].astype(np.float64)

    ipd = float(np.linalg.norm(re - le))
    if ipd < 1e-6:
        return None

    x_axis = (re - le) / ipd
    # Up ≈ nose → away from chin, then Gram–Schmidt against X
    y_raw = nose - chin
    y_raw = y_raw - np.dot(y_raw, x_axis) * x_axis
    y_n = float(np.linalg.norm(y_raw))
    if y_n < 1e-6:
        return None
    y_axis = y_raw / y_n
    z_axis = np.cross(x_axis, y_axis)
    z_n = float(np.linalg.norm(z_axis))
    if z_n < 1e-6:
        return None
    z_axis = z_axis / z_n
    y_axis = np.cross(z_axis, x_axis)
    return np.column_stack([x_axis, y_axis, z_axis])


def estimate_head_pose(
    landmarks: np.ndarray,
    image_w: int | float = 1,
    image_h: int | float = 1,
) -> tuple[float, float, float, float, float, float] | None:
    """
    Returns (yaw, pitch, roll, tx, ty, tz) or None.
    tx/ty/tz = (nose - eye_mid) / IPD in MediaPipe 3D (dimensionless).
    image_w/h kept for API parity with the old solvePnP path (unused).
    """
    del image_w, image_h
    if landmarks.shape[0] < 264:
        return None

    R = _face_rotation_from_landmarks(landmarks)
    if R is None:
        return None

    le = landmarks[EYE_OUTER_L, :3].astype(np.float64)
    re = landmarks[EYE_OUTER_R, :3].astype(np.float64)
    nose = landmarks[NOSE_TIP, :3].astype(np.float64)
    ipd = float(np.linalg.norm(re - le))
    if ipd < 1e-6:
        return None

    eye_mid = (le + re) * 0.5
    offset = (nose - eye_mid) / ipd
    yaw, pitch, roll = rotation_matrix_to_euler(R)
    tx, ty, tz = float(offset[0]), float(offset[1]), float(offset[2])
    if not all(math.isfinite(v) for v in (yaw, pitch, roll, tx, ty, tz)):
        return None
    return yaw, pitch, roll, tx, ty, tz
