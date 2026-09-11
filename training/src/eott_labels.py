"""
EOTT label loading: Tobii gaze in normalized screen coords [0,1]².

Coordinate systems
------------------
GazeT (relative_x, relative_y):
  0 = left / top of screen, 1 = right / bottom — click position at capture time.

EOTT Tobii (gaze_point_on_display_area):
  Active Display Coordinate System — same convention (Tobii SDK).

EOTT mouse (clientX, clientY) — NOT used here:
  Absolute CSS pixels on the screen, not normalized. Would require
  division by windowInnerWidth/Height from the same log event.

This module syncs Tobii samples to video frames via interaction-log recording
start timestamps (same approach as www/data/src/webgazerExtractServer.py).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class TobiiSample:
    timestamp_ms: int
    label_x: float
    label_y: float


def normalize_tobii_gaze(left_valid: bool, right_valid: bool, row: dict) -> tuple[float, float] | None:
    """Average both eyes when valid (matches official EOTT extractor)."""
    if left_valid and right_valid:
        lx, ly = row["left_gaze_point_on_display_area"]
        rx, ry = row["right_gaze_point_on_display_area"]
        return (lx + rx) / 2.0, (ly + ry) / 2.0
    if right_valid:
        return tuple(row["right_gaze_point_on_display_area"])
    if left_valid:
        return tuple(row["left_gaze_point_on_display_area"])
    return None


def load_tobii_samples(tobii_path: Path | str) -> list[TobiiSample]:
    samples: list[TobiiSample] = []
    with open(tobii_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            left_ok = row.get("left_gaze_point_validity") == 1
            right_ok = row.get("right_gaze_point_validity") == 1
            coords = normalize_tobii_gaze(left_ok, right_ok, row)
            if coords is None:
                continue
            gx, gy = coords
            if gx < 0 or gy < 0:
                continue

            # Prefer true_time (seconds); fall back to system_time_stamp (µs)
            if "true_time" in row:
                ts_ms = int(float(row["true_time"]) * 1000)
            else:
                ts_ms = int(row["system_time_stamp"] / 1000)

            samples.append(TobiiSample(ts_ms, float(gx), float(gy)))

    samples.sort(key=lambda s: s.timestamp_ms)
    return samples


def _session_string_to_video_name(session_string: str) -> str:
    """Convert WebGazer sessionString to on-disk video filename."""
    return session_string.replace("/", "-") + ".webm"


def _interaction_log_path(participant_dir: Path, video_path: Path) -> Path | None:
    """EOTT stores browser events in {sessionTimestamp}.json (see www/data/src/participant.py)."""
    m = re.match(r"(\d+)_", video_path.name)
    if not m:
        return None
    candidate = participant_dir / f"{m.group(1)}.json"
    return candidate if candidate.is_file() else None


def find_recording_start_ms(participant_dir: Path, video_path: Path) -> int | None:
    """
    Find Unix epoch (ms) when this webcam video started recording.
    Matches sessionString → filename in the participant JSON interaction log.
    """
    log_path = _interaction_log_path(participant_dir, video_path)
    if log_path is None:
        return None

    target_name = video_path.name
    with log_path.open(encoding="utf-8") as f:
        events = json.load(f)

    for ev in events:
        if ev.get("type") != "recording start":
            continue
        session_string = str(ev.get("sessionString") or ev.get("sessionId", ""))
        if _session_string_to_video_name(session_string) == target_name:
            return int(ev["epoch"])

    return None


def label_for_frame(
    tobii: list[TobiiSample],
    frame_epoch_ms: int,
) -> tuple[float, float] | None:
    """Pick Tobii sample closest in time to the video frame."""
    if not tobii:
        return None

    best = min(tobii, key=lambda s: abs(s.timestamp_ms - frame_epoch_ms))
    if abs(best.timestamp_ms - frame_epoch_ms) > 100:  # >100 ms → unreliable sync
        return None
    return best.label_x, best.label_y
