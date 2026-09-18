"""
Pupil localization in an eye patch (mirrors src/pupil.ts).

Darkest local peak after blur, then intensity-weighted COM only in a
small window around that peak — avoids lateral-gaze bias of a global
dark-mask center of mass.
"""

from __future__ import annotations

import numpy as np
from numba import njit

REFINE_RADIUS_FRAC = 0.28
BORDER = 1


def grayscale_bgr(patch_bgr: np.ndarray) -> np.ndarray:
    """BGR uint8 HxWx3 → grayscale float64 HxW (BT.601)."""
    b = patch_bgr[:, :, 0].astype(np.float64)
    g = patch_bgr[:, :, 1].astype(np.float64)
    r = patch_bgr[:, :, 2].astype(np.float64)
    return r * 0.299 + g * 0.587 + b * 0.114


@njit(cache=True)
def _box_blur3(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape
    out = gray.copy()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            s = 0.0
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    s += gray[y + dy, x + dx]
            out[y, x] = s / 9.0
    return out


@njit(cache=True)
def _darkest_peak(pixels: np.ndarray) -> tuple[float, float]:
    h, w = pixels.shape
    if w <= BORDER * 2 or h <= BORDER * 2:
        return -1.0, -1.0
    best = 1e18
    bx = -1
    by = -1
    for y in range(BORDER, h - BORDER):
        for x in range(BORDER, w - BORDER):
            v = pixels[y, x]
            if v < best:
                best = v
                bx = x
                by = y
    if bx < 0:
        return -1.0, -1.0
    return float(bx), float(by)


@njit(cache=True)
def _local_dark_com(
    pixels: np.ndarray,
    cx0: float,
    cy0: float,
    radius: float,
) -> tuple[float, float]:
    h, w = pixels.shape
    r2 = radius * radius
    y0 = max(0, int(np.floor(cy0 - radius)))
    y1 = min(h - 1, int(np.ceil(cy0 + radius)))
    x0 = max(0, int(np.floor(cx0 - radius)))
    x1 = min(w - 1, int(np.ceil(cx0 + radius)))

    local_sum = 0.0
    local_n = 0
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = x - cx0
            dy = y - cy0
            if dx * dx + dy * dy > r2:
                continue
            local_sum += pixels[y, x]
            local_n += 1
    if local_n == 0:
        return cx0, cy0
    local_mean = local_sum / local_n

    w_sum = 0.0
    x_sum = 0.0
    y_sum = 0.0
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = x - cx0
            dy = y - cy0
            if dx * dx + dy * dy > r2:
                continue
            v = pixels[y, x]
            if v > local_mean:
                continue
            weight = local_mean - v + 1.0
            w_sum += weight
            x_sum += weight * x
            y_sum += weight * y
    if w_sum <= 0.0:
        return cx0, cy0
    return x_sum / w_sum, y_sum / w_sum


@njit(cache=True)
def _detect_pupil_center(gray: np.ndarray) -> tuple[float, float]:
    h, w = gray.shape
    if w < 4 or h < 4:
        return -1.0, -1.0

    blurred = _box_blur3(gray)
    cx, cy = _darkest_peak(blurred)
    if cx < 0:
        return -1.0, -1.0

    radius = max(2.0, min(w, h) * REFINE_RADIUS_FRAC)
    return _local_dark_com(blurred, cx, cy, radius)


def detect_pupil_center(patch_bgr: np.ndarray) -> tuple[float, float] | None:
    """Return pupil center in patch-local coordinates, or None on failure."""
    if patch_bgr.size == 0 or patch_bgr.shape[0] < 4 or patch_bgr.shape[1] < 4:
        return None
    gray = grayscale_bgr(patch_bgr)
    cx, cy = _detect_pupil_center(gray)
    if cx < 0:
        return None
    return float(cx), float(cy)
