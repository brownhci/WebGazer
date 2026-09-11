"""
Viewport size features available at inference via window.innerWidth / innerHeight.

We deliberately exclude physical diagonal (cm) — not observable at runtime.
"""

from __future__ import annotations

# Reference resolution for stable scaling across datasets (1080p baseline)
REFERENCE_WIDTH = 1920.0
REFERENCE_HEIGHT = 1080.0

SCREEN_FEATURE_NAMES = ("screen_w_norm", "screen_h_norm")


def screen_input_features(screen_w: float, screen_h: float) -> dict[str, float]:
    """Normalize pixel viewport size for the MLP (same transform at train and inference)."""
    w = max(float(screen_w), 1.0)
    h = max(float(screen_h), 1.0)
    return {
        "screen_w_norm": w / REFERENCE_WIDTH,
        "screen_h_norm": h / REFERENCE_HEIGHT,
    }


def append_screen_features(row: dict) -> dict | None:
    """Add screen_* columns to a sample dict; return None if viewport size is missing."""
    w = row.get("screen_w")
    h = row.get("screen_h")
    if w is None or h is None or (isinstance(w, float) and w != w):
        return None
    try:
        w_f, h_f = float(w), float(h)
    except (TypeError, ValueError):
        return None
    if w_f <= 0 or h_f <= 0:
        return None
    row = dict(row)
    row.update(screen_input_features(w_f, h_f))
    return row
