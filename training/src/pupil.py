"""
Iris localization (mirrors src/pupil.ts).

Sclera-first + limbus curvature: dark components that touch the sclera;
deterministic circle fit (Kåsa + outlier trim) on the sclera-facing edge;
require a white bowl around the center. Always returns a center.
"""

from __future__ import annotations

import numpy as np
from numba import njit

SCLERA_PERCENTILE = 0.40
MIN_SCLERA_BLOB = 6
SCLERA_CONTACT_RADIUS = 2
DARK_OF_SCLERA = 0.65
OPEN_RADIUS = 1
MIN_THICKNESS = 1
MAX_ELONG = 4.0
SECTORS = 16
INLIER_FRAC = 0.15
MIN_INLIERS = 5
REFIT_ITERS = 2


def grayscale_bgr(patch_bgr: np.ndarray) -> np.ndarray:
    b = patch_bgr[:, :, 0].astype(np.float64)
    g = patch_bgr[:, :, 1].astype(np.float64)
    r = patch_bgr[:, :, 2].astype(np.float64)
    return r * 0.299 + g * 0.587 + b * 0.114


def fill_polygon_mask(width: int, height: int, poly: np.ndarray) -> np.ndarray:
    import cv2

    mask = np.zeros((height, width), dtype=np.uint8)
    if poly.shape[0] < 3 or width < 1 or height < 1:
        return mask
    pts = np.round(poly).astype(np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(mask, [pts], 1)
    return mask


def eyelid_polygon_from_arcs(upper: np.ndarray, lower: np.ndarray) -> np.ndarray:
    return np.vstack([upper, lower[::-1]])


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
def _masked_percentile_high(values: np.ndarray, mask: np.ndarray, percentile: float) -> float:
    hist = np.zeros(256, dtype=np.int64)
    n = 0
    h, w = values.shape
    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0:
                continue
            v = int(round(values[y, x]))
            if v < 0:
                v = 0
            elif v > 255:
                v = 255
            hist[v] += 1
            n += 1
    if n == 0:
        return 0.0
    target = max(1, int(n * percentile))
    acc = 0
    for v in range(255, -1, -1):
        acc += hist[v]
        if acc >= target:
            return float(v)
    return 0.0


@njit(cache=True)
def _label_components(binary: np.ndarray) -> tuple[np.ndarray, int]:
    h, w = binary.shape
    labels = np.zeros((h, w), dtype=np.int32)
    queue = np.empty(h * w, dtype=np.int32)
    next_label = 0
    for y0 in range(h):
        for x0 in range(w):
            if binary[y0, x0] == 0 or labels[y0, x0] != 0:
                continue
            next_label += 1
            qh = 0
            qt = 0
            queue[qt] = y0 * w + x0
            qt += 1
            labels[y0, x0] = next_label
            while qh < qt:
                idx = queue[qh]
                qh += 1
                cy = idx // w
                cx = idx - cy * w
                for k in range(4):
                    if k == 0:
                        ny, nx = cy - 1, cx
                    elif k == 1:
                        ny, nx = cy + 1, cx
                    elif k == 2:
                        ny, nx = cy, cx - 1
                    else:
                        ny, nx = cy, cx + 1
                    if ny < 0 or ny >= h or nx < 0 or nx >= w:
                        continue
                    if binary[ny, nx] == 0 or labels[ny, nx] != 0:
                        continue
                    labels[ny, nx] = next_label
                    queue[qt] = ny * w + nx
                    qt += 1
    return labels, next_label


@njit(cache=True)
def _keep_large(binary: np.ndarray, min_size: int) -> np.ndarray:
    h, w = binary.shape
    labels, nlab = _label_components(binary)
    sizes = np.zeros(nlab + 1, dtype=np.int32)
    for y in range(h):
        for x in range(w):
            lab = labels[y, x]
            if lab != 0:
                sizes[lab] += 1
    out = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            lab = labels[y, x]
            if lab != 0 and sizes[lab] >= min_size:
                out[y, x] = 1
    return out


@njit(cache=True)
def _dilate(src: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return src.copy()
    h, w = src.shape
    out = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            if src[y, x] == 0:
                continue
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    ny = y + dy
                    nx = x + dx
                    if 0 <= ny < h and 0 <= nx < w:
                        out[ny, nx] = 1
    return out


@njit(cache=True)
def _erode(src: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return src.copy()
    h, w = src.shape
    out = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            if src[y, x] == 0:
                continue
            ok = True
            for dy in range(-radius, radius + 1):
                if not ok:
                    break
                for dx in range(-radius, radius + 1):
                    ny = y + dy
                    nx = x + dx
                    if ny < 0 or ny >= h or nx < 0 or nx >= w or src[ny, nx] == 0:
                        ok = False
                        break
            if ok:
                out[y, x] = 1
    return out


@njit(cache=True)
def _touches(y: int, x: int, other: np.ndarray) -> bool:
    h, w = other.shape
    if y > 0 and other[y - 1, x] != 0:
        return True
    if y < h - 1 and other[y + 1, x] != 0:
        return True
    if x > 0 and other[y, x - 1] != 0:
        return True
    if x < w - 1 and other[y, x + 1] != 0:
        return True
    return False


@njit(cache=True)
def _touches_mask_exterior(labels: np.ndarray, lab: int, mask: np.ndarray) -> bool:
    h, w = labels.shape
    for y in range(h):
        for x in range(w):
            if labels[y, x] != lab:
                continue
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                return True
            if mask[y - 1, x] == 0 or mask[y + 1, x] == 0 or mask[y, x - 1] == 0 or mask[y, x + 1] == 0:
                return True
    return False


@njit(cache=True)
def _max_thickness(labels: np.ndarray, lab: int) -> int:
    h, w = labels.shape
    active = np.zeros((h, w), dtype=np.uint8)
    mx = np.empty(h * w, dtype=np.int32)
    my = np.empty(h * w, dtype=np.int32)
    n = 0
    for y in range(h):
        for x in range(w):
            if labels[y, x] == lab:
                active[y, x] = 1
                mx[n] = x
                my[n] = y
                n += 1
    remaining = n
    layer = 0
    border = np.empty(n, dtype=np.int32)
    while remaining > 0:
        bn = 0
        for i in range(n):
            x = mx[i]
            y = my[i]
            if active[y, x] == 0:
                continue
            is_b = x == 0 or y == 0 or x == w - 1 or y == h - 1
            if not is_b:
                if (
                    active[y - 1, x] == 0
                    or active[y + 1, x] == 0
                    or active[y, x - 1] == 0
                    or active[y, x + 1] == 0
                ):
                    is_b = True
            if is_b:
                border[bn] = i
                bn += 1
        if bn == 0:
            break
        layer += 1
        for j in range(bn):
            i = border[j]
            y = my[i]
            x = mx[i]
            if active[y, x] != 0:
                active[y, x] = 0
                remaining -= 1
        if layer > 64:
            break
    return layer


@njit(cache=True)
def _fit_circle_kasa(
    xs: np.ndarray, ys: np.ndarray, active: np.ndarray, n: int
) -> tuple[float, float, float, float, int]:
    """Returns cx, cy, r, rmse, n_used; r < 0 on failure."""
    sxx = 0.0
    syy = 0.0
    sxy = 0.0
    sxz = 0.0
    syz = 0.0
    sz = 0.0
    sx = 0.0
    sy = 0.0
    used = 0
    for i in range(n):
        if active[i] == 0:
            continue
        x = xs[i]
        y = ys[i]
        z = x * x + y * y
        sx += x
        sy += y
        sz += z
        sxx += x * x
        syy += y * y
        sxy += x * y
        sxz += x * z
        syz += y * z
        used += 1
    if used < 3:
        return 0.0, 0.0, -1.0, 0.0, 0
    a11, a12, a13 = sxx, sxy, sx
    a22, a23 = syy, sy
    a33 = float(used)
    b1, b2, b3 = -sxz, -syz, -sz
    det = (
        a11 * (a22 * a33 - a23 * a23)
        - a12 * (a12 * a33 - a23 * a13)
        + a13 * (a12 * a23 - a22 * a13)
    )
    if abs(det) < 1e-6:
        return 0.0, 0.0, -1.0, 0.0, 0
    inv11 = (a22 * a33 - a23 * a23) / det
    inv12 = (a13 * a23 - a12 * a33) / det
    inv13 = (a12 * a23 - a13 * a22) / det
    inv22 = (a11 * a33 - a13 * a13) / det
    inv23 = (a12 * a13 - a11 * a23) / det
    inv33 = (a11 * a22 - a12 * a12) / det
    D = inv11 * b1 + inv12 * b2 + inv13 * b3
    E = inv12 * b1 + inv22 * b2 + inv23 * b3
    F = inv13 * b1 + inv23 * b2 + inv33 * b3
    cx = -D / 2.0
    cy = -E / 2.0
    r2 = cx * cx + cy * cy - F
    if r2 <= 1.0:
        return 0.0, 0.0, -1.0, 0.0, 0
    r = r2 ** 0.5
    err = 0.0
    for i in range(n):
        if active[i] == 0:
            continue
        di = ((xs[i] - cx) ** 2 + (ys[i] - cy) ** 2) ** 0.5 - r
        err += di * di
    return cx, cy, r, (err / used) ** 0.5, used


@njit(cache=True)
def _angular_coverage_active(
    xs: np.ndarray, ys: np.ndarray, active: np.ndarray, n: int, cx: float, cy: float
) -> float:
    hit = np.zeros(SECTORS, dtype=np.uint8)
    two_pi = 2.0 * np.pi
    for i in range(n):
        if active[i] == 0:
            continue
        a = np.arctan2(ys[i] - cy, xs[i] - cx)
        if a < 0.0:
            a += two_pi
        s = int(a / two_pi * SECTORS)
        if s < 0:
            s = 0
        if s >= SECTORS:
            s = SECTORS - 1
        hit[s] = 1
    c = 0
    for i in range(SECTORS):
        c += hit[i]
    return c / float(SECTORS)


@njit(cache=True)
def _in_sclera_bowl(
    cx: float,
    cy: float,
    r: float,
    blurred: np.ndarray,
    sclera: np.ndarray,
    mask: np.ndarray,
    sclera_mean: float,
) -> bool:
    h, w = blurred.shape
    icx = int(round(cx))
    icy = int(round(cy))
    if icx < 0 or icy < 0 or icx >= w or icy >= h:
        return False
    if mask[icy, icx] == 0:
        return False
    if sclera[icy, icx] != 0 or blurred[icy, icx] > sclera_mean * 0.65:
        return False
    white_cut = sclera_mean * 0.75
    bright = 0
    q0 = q1 = q2 = q3 = False
    for s in range(SECTORS):
        a = s / float(SECTORS) * 2.0 * np.pi
        px = int(round(cx + np.cos(a) * r * 1.15))
        py = int(round(cy + np.sin(a) * r * 1.15))
        if px < 0 or py < 0 or px >= w or py >= h:
            continue
        if mask[py, px] == 0:
            continue
        if sclera[py, px] != 0 or blurred[py, px] >= white_cut:
            bright += 1
            q = s // (SECTORS // 4)
            if q == 0:
                q0 = True
            elif q == 1:
                q1 = True
            elif q == 2:
                q2 = True
            else:
                q3 = True
    quads = int(q0) + int(q1) + int(q2) + int(q3)
    return bright >= int(np.ceil(SECTORS * 0.2)) and quads >= 2


@njit(cache=True)
def _fit_circle_on_edges(
    xs: np.ndarray,
    ys: np.ndarray,
    n: int,
    min_r: float,
    max_r: float,
    blurred: np.ndarray,
    sclera: np.ndarray,
    mask: np.ndarray,
    sclera_mean: float,
) -> tuple[float, float, float]:
    """Deterministic Kåsa + outlier trim. Returns cx, cy, score; score < 0 on failure."""
    if n < MIN_INLIERS:
        return -1.0, -1.0, -1.0
    active = np.ones(n, dtype=np.uint8)
    cx, cy, r, rmse, used = _fit_circle_kasa(xs, ys, active, n)
    if r < 0.0:
        return -1.0, -1.0, -1.0
    for _ in range(REFIT_ITERS):
        tol = max(1.25, r * INLIER_FRAC)
        kept = 0
        for i in range(n):
            if active[i] == 0:
                continue
            d = abs(((xs[i] - cx) ** 2 + (ys[i] - cy) ** 2) ** 0.5 - r)
            if d > tol:
                active[i] = 0
            else:
                kept += 1
        if kept < MIN_INLIERS:
            return -1.0, -1.0, -1.0
        cx, cy, r, rmse, used = _fit_circle_kasa(xs, ys, active, n)
        if r < 0.0:
            return -1.0, -1.0, -1.0
    if r < min_r or r > max_r:
        return -1.0, -1.0, -1.0
    if not _in_sclera_bowl(cx, cy, r, blurred, sclera, mask, sclera_mean):
        return -1.0, -1.0, -1.0
    coverage = _angular_coverage_active(xs, ys, active, n, cx, cy)
    if coverage < 0.15:
        return -1.0, -1.0, -1.0
    score = used * coverage * coverage * (1.0 / (1.0 + rmse / max(1.0, r * 0.15)))
    return cx, cy, score


@njit(cache=True)
def _always_center(
    blurred: np.ndarray, mask: np.ndarray, sclera: np.ndarray, dark_thresh: float
) -> tuple[float, float]:
    h, w = blurred.shape
    cx, cy = _dark_com(blurred, mask, sclera, dark_thresh)
    if cx >= 0.0:
        return cx, cy
    w_sum = 0.0
    x_sum = 0.0
    y_sum = 0.0
    n_mask = 0
    mx = 0.0
    my = 0.0
    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0:
                continue
            n_mask += 1
            mx += x
            my += y
            weight = 256.0 - blurred[y, x]
            w_sum += weight
            x_sum += weight * x
            y_sum += weight * y
    if w_sum > 0.0:
        return x_sum / w_sum, y_sum / w_sum
    if n_mask > 0:
        return mx / n_mask, my / n_mask
    return (w - 1) * 0.5, (h - 1) * 0.5


@njit(cache=True)
def _dark_com(
    blurred: np.ndarray, mask: np.ndarray, sclera: np.ndarray, dark_thresh: float
) -> tuple[float, float]:
    h, w = blurred.shape
    mid_x = (w - 1) * 0.5
    mid_y = (h - 1) * 0.5
    span2 = float(max(w, h)) ** 2
    w_sum = 0.0
    x_sum = 0.0
    y_sum = 0.0
    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0 or sclera[y, x] != 0:
                continue
            if blurred[y, x] >= dark_thresh:
                continue
            centr = 1.0 / (1.0 + ((x - mid_x) ** 2 + (y - mid_y) ** 2) / (span2 * 0.08))
            weight = (dark_thresh - blurred[y, x] + 1.0) * centr
            w_sum += weight
            x_sum += weight * x
            y_sum += weight * y
    if w_sum <= 0.0:
        return -1.0, -1.0
    return x_sum / w_sum, y_sum / w_sum


@njit(cache=True)
def _find_iris(blurred: np.ndarray, mask: np.ndarray) -> tuple[float, float]:
    h, w = blurred.shape
    sclera_cut = _masked_percentile_high(blurred, mask, SCLERA_PERCENTILE)
    sclera_raw = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            if mask[y, x] != 0 and blurred[y, x] >= sclera_cut:
                sclera_raw[y, x] = 1
    sclera = _keep_large(sclera_raw, MIN_SCLERA_BLOB)
    sclera_n = 0
    sclera_mean = 0.0
    for y in range(h):
        for x in range(w):
            if sclera[y, x] != 0:
                sclera_n += 1
                sclera_mean += blurred[y, x]
    if sclera_n < MIN_SCLERA_BLOB:
        return _always_center(blurred, mask, np.zeros((h, w), dtype=np.uint8), 120.0)
    sclera_mean /= sclera_n
    sclera_contact = _dilate(sclera, SCLERA_CONTACT_RADIUS)

    dark_raw = np.zeros((h, w), dtype=np.uint8)
    dark_thresh = sclera_mean * DARK_OF_SCLERA
    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0 or sclera[y, x] != 0:
                continue
            if blurred[y, x] < dark_thresh:
                dark_raw[y, x] = 1
    dark = _dilate(_erode(dark_raw, OPEN_RADIUS), OPEN_RADIUS)
    labels, nlab = _label_components(dark)

    eye_span = float(max(w, h))
    min_r = eye_span * 0.06
    max_r = eye_span * 0.55
    mid_x = (w - 1) * 0.5
    mid_y = (h - 1) * 0.5
    best_dist = 1e18
    best_quality = -1.0
    best_cx = -1.0
    best_cy = -1.0
    bx = np.empty(h * w, dtype=np.float64)
    by = np.empty(h * w, dtype=np.float64)

    for lab in range(1, nlab + 1):
        size = 0
        adj = False
        min_x, max_x = w, -1
        min_y, max_y = h, -1
        bn = 0
        inten = 0.0
        sx = 0.0
        sy = 0.0
        for y in range(h):
            for x in range(w):
                if labels[y, x] != lab:
                    continue
                size += 1
                inten += blurred[y, x]
                sx += x
                sy += y
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
                if _touches(y, x, sclera_contact):
                    adj = True
                    bx[bn] = float(x)
                    by[bn] = float(y)
                    bn += 1
        if size < 6 or not adj:
            continue
        thick = _max_thickness(labels, lab)
        if thick < MIN_THICKNESS:
            continue
        bw = max_x - min_x + 1
        bh = max_y - min_y + 1
        elong = float(max(bw, bh)) / float(max(1, min(bw, bh)))
        if elong > MAX_ELONG:
            continue
        mean_dark = inten / size
        darkness = 1.0 - mean_dark / max(1.0, sclera_mean)
        if darkness < 0.05:
            darkness = 0.05
        com_cx = sx / size
        com_cy = sy / size
        quality = (size * thick * darkness) / elong
        dist = ((com_cx - mid_x) ** 2 + (com_cy - mid_y) ** 2) ** 0.5
        if dist < best_dist - 0.5 or (abs(dist - best_dist) <= 0.5 and quality > best_quality):
            best_dist = dist
            best_quality = quality
            best_cx = com_cx
            best_cy = com_cy

        # Filter edge points near mask exterior (lid/brow), keep limbus.
        bn2 = 0
        for i in range(bn):
            x = int(bx[i])
            y = int(by[i])
            near_ext = x <= 1 or y <= 1 or x >= w - 2 or y >= h - 2
            if not near_ext:
                for k in range(4):
                    if k == 0:
                        nx, ny = x, y - 2
                    elif k == 1:
                        nx, ny = x, y + 2
                    elif k == 2:
                        nx, ny = x - 2, y
                    else:
                        nx, ny = x + 2, y
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or mask[ny, nx] == 0:
                        near_ext = True
                        break
            if near_ext:
                continue
            bx[bn2] = bx[i]
            by[bn2] = by[i]
            bn2 += 1
        bn = bn2
        if bn < MIN_INLIERS:
            continue
        cx, cy, score = _fit_circle_on_edges(
            bx, by, bn, min_r, max_r, blurred, sclera, mask, sclera_mean
        )
        if score >= 0.0:
            dist = ((cx - mid_x) ** 2 + (cy - mid_y) ** 2) ** 0.5
            if dist < best_dist - 0.5 or (abs(dist - best_dist) <= 0.5 and score > best_quality):
                best_dist = dist
                best_quality = score
                best_cx = cx
                best_cy = cy

    if best_cx >= 0.0 and 0.0 <= best_cx < w and 0.0 <= best_cy < h:
        return best_cx, best_cy
    return _always_center(blurred, mask, sclera, dark_thresh)


@njit(cache=True)
def _detect(gray: np.ndarray, mask: np.ndarray) -> tuple[float, float]:
    h, w = gray.shape
    if w < 1 or h < 1:
        return 0.0, 0.0
    if w < 4 or h < 4:
        return (w - 1) * 0.5, (h - 1) * 0.5
    return _find_iris(_box_blur3(gray), mask)


def detect_pupil_center(
    patch_bgr: np.ndarray,
    mask: np.ndarray | None = None,
) -> tuple[float, float]:
    """Always returns a center in patch coordinates (never None)."""
    if patch_bgr.size == 0:
        return 0.0, 0.0
    h, w = patch_bgr.shape[:2]
    if h < 1 or w < 1:
        return 0.0, 0.0
    if h < 4 or w < 4:
        return (w - 1) * 0.5, (h - 1) * 0.5
    gray = grayscale_bgr(patch_bgr)
    if mask is None:
        mask_u8 = np.ones((h, w), dtype=np.uint8)
    else:
        mask_u8 = mask.astype(np.uint8, copy=False)
        if mask_u8.shape != (h, w):
            return (w - 1) * 0.5, (h - 1) * 0.5
    cx, cy = _detect(gray, mask_u8)
    return float(cx), float(cy)
