"""Resolve EOTT viewport size (pixels) per participant or session."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

# Documented defaults when Participant_Characteristics is unavailable
EOTT_DEFAULTS = {
    "Laptop": (1440, 900),
    "PC": (1920, 1200),
}


def load_participant_characteristics(eott_raw: Path) -> dict[str, tuple[int, int]]:
    """
    Parse Participant_Characteristics spreadsheet at dataset root.

    Returns {P_X: (width_px, height_px)}.
    """
    eott_raw = Path(eott_raw)
    mapping: dict[str, tuple[int, int]] = {}

    for pattern in ("Participant_Characteristics*", "participant_characteristics*"):
        for path in eott_raw.glob(pattern):
            if path.suffix.lower() in {".csv", ".tsv"}:
                mapping.update(_parse_chars_csv(path))
            elif path.suffix.lower() in {".xlsx", ".xls"}:
                try:
                    import pandas as pd

                    df = pd.read_excel(path)
                    mapping.update(_parse_chars_dataframe(df))
                except ImportError:
                    pass
    return mapping


def _parse_chars_csv(path: Path) -> dict[str, tuple[int, int]]:
    out: dict[str, tuple[int, int]] = {}
    with path.open(encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = _find_participant_id(row)
            wh = _find_width_height(row)
            if pid and wh:
                out[pid] = wh
    return out


def _parse_chars_dataframe(df) -> dict[str, tuple[int, int]]:
    out: dict[str, tuple[int, int]] = {}
    cols = {c.lower(): c for c in df.columns}
    for _, row in df.iterrows():
        row_d = {cols.get(k, k): v for k, v in row.items()}
        pid = _find_participant_id(row_d)
        wh = _find_width_height(row_d)
        if pid and wh:
            out[pid] = wh
    return out


def _find_participant_id(row: dict) -> str | None:
    for key in row:
        kl = key.lower()
        if "participant" in kl or kl in {"p_id", "id", "folder"}:
            val = str(row[key]).strip()
            if re.fullmatch(r"P_\d+", val):
                return val
            if val.isdigit():
                return f"P_{val}"
    return None


def _find_width_height(row: dict) -> tuple[int, int] | None:
    w = h = None
    for key, val in row.items():
        kl = key.lower()
        if "display width" in kl or kl == "width (pixels)":
            w = int(float(val))
        if "display height" in kl or kl == "height (pixels)":
            h = int(float(val))
        if "setting" in kl and w is None:
            setting = str(val).strip()
            if setting in EOTT_DEFAULTS:
                return EOTT_DEFAULTS[setting]
    if w and h:
        return w, h
    return None


def viewport_from_interaction_log(participant_dir: Path, video_name: str) -> tuple[int, int] | None:
    """Median windowInnerWidth/Height during the session matching this video."""
    prefix = video_name.split("_-study-")[0] if "_-study-" in video_name else ""
    widths: list[int] = []
    heights: list[int] = []

    for log_path in participant_dir.glob("*.txt"):
        if re.fullmatch(r"P_\d+", log_path.stem):
            continue
        with log_path.open(encoding="utf-8", errors="replace") as f:
            for line in f:
                if not line.strip().startswith("{"):
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if prefix and prefix not in str(ev.get("sessionId", "")):
                    continue
                w = ev.get("windowInnerWidth")
                h = ev.get("windowInnerHeight")
                if w and h:
                    widths.append(int(w))
                    heights.append(int(h))

    if not widths:
        return None
    widths.sort()
    heights.sort()
    mid = len(widths) // 2
    return widths[mid], heights[mid]


def resolve_eott_viewport(
    participant_dir: Path,
    video_path: Path,
    participant_chars: dict[str, tuple[int, int]],
) -> tuple[int, int] | None:
    subject_id = participant_dir.name
    if subject_id in participant_chars:
        return participant_chars[subject_id]
    from_log = viewport_from_interaction_log(participant_dir, video_path.name)
    if from_log:
        return from_log
    return None
