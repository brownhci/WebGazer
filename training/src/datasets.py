"""Build unified manifest tables from GazeT and EOTT raw data."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

from eott_screen import load_participant_characteristics, resolve_eott_viewport

GAZET_IMAGE_COLS = {
    "relative_x": "label_x",
    "relative_y": "label_y",
    "task_id": "session_id",
    "step": "frame_id",
}


def build_gazet_manifest(raw_dir: Path, output: Path) -> pd.DataFrame:
    raw_dir = Path(raw_dir)
    if not raw_dir.exists():
        raise FileNotFoundError(
            f"GazeT raw directory not found: {raw_dir}\n"
            "Request access: https://github.com/mirmashel/gazet_dataset"
        )

    meta_candidates = list(raw_dir.rglob("metadata.*")) + list(raw_dir.rglob("*.jsonl"))
    meta_path = next(
        (p for p in meta_candidates if p.suffix in {".csv", ".parquet", ".jsonl", ".json"}),
        None,
    )

    rows: list[dict] = []
    if meta_path is not None:
        if meta_path.suffix == ".csv":
            meta = pd.read_csv(meta_path)
        elif meta_path.suffix == ".parquet":
            meta = pd.read_parquet(meta_path)
        elif meta_path.suffix == ".jsonl":
            meta = pd.read_json(meta_path, lines=True)
        else:
            with meta_path.open(encoding="utf-8") as f:
                meta = pd.DataFrame(json.load(f))

        meta = meta.rename(columns={k: v for k, v in GAZET_IMAGE_COLS.items() if k in meta.columns})
        for _, row in meta.iterrows():
            img_path = _resolve_gazet_image(raw_dir, row)
            if img_path is None:
                continue
            split = str(row.get("split", "train"))
            rows.append(
                {
                    "dataset": "gazet",
                    "split": split,
                    "image_path": str(img_path),
                    "label_x": float(row.get("label_x", row.get("relative_x", 0))),
                    "label_y": float(row.get("label_y", row.get("relative_y", 0))),
                    "label_space": "normalized_viewport",
                    "subject_id": str(row.get("task_id", row.get("session_id", "unknown"))),
                    "label_source": "click",
                    "screen_w": _to_int(row.get("screen_size_x", row.get("screen_w"))),
                    "screen_h": _to_int(row.get("screen_size_y", row.get("screen_h"))),
                }
            )
    else:
        for img in sorted(raw_dir.rglob("*")):
            if img.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                rows.append(
                    {
                        "dataset": "gazet",
                        "split": "train",
                        "image_path": str(img),
                        "label_x": float("nan"),
                        "label_y": float("nan"),
                        "subject_id": img.parent.name,
                        "label_source": "click",
                        "screen_w": None,
                        "screen_h": None,
                    }
                )

    df = pd.DataFrame(rows)
    output.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output, index=False)
    return df


def _resolve_gazet_image(raw_dir: Path, row: pd.Series) -> Path | None:
    task_id = row.get("task_id", row.get("session_id"))
    step = row.get("step", row.get("frame_id"))
    if pd.notna(task_id) and pd.notna(step):
        for base in (raw_dir, raw_dir / "dataset"):
            candidate = base / "images" / str(task_id) / str(step)
            if candidate.is_file():
                return candidate

    for key in ("image_path", "path", "filename", "step"):
        if key in row and pd.notna(row[key]):
            p = Path(str(row[key]))
            if p.is_file():
                return p
            candidate = raw_dir / p
            if candidate.is_file():
                return candidate
            found = list(raw_dir.rglob(p.name))
            if found:
                return found[0]
    return None


def build_eott_manifest(raw_dir: Path, output: Path, tasks: list[str] | None = None) -> pd.DataFrame:
    raw_dir = Path(raw_dir)
    if not raw_dir.exists():
        raise FileNotFoundError(
            f"EOTT raw directory not found: {raw_dir}\n"
            "Download: https://webgazer.cs.brown.edu/data/WebGazerETRA2018Dataset_Release20180420.zip"
        )

    rows: list[dict] = []
    task_filter = set(tasks) if tasks else None
    participant_chars = load_participant_characteristics(raw_dir)

    for participant_dir in sorted(raw_dir.glob("P_*")):
        if not participant_dir.is_dir():
            continue
        subject_id = participant_dir.name
        tobii_path = participant_dir / f"{subject_id}.txt"
        tobii_samples = _load_tobii(tobii_path) if tobii_path.exists() else []

        for video in sorted(participant_dir.glob("*")):
            if video.suffix.lower() not in {".mp4", ".webm"}:
                continue
            task = _eott_task_name(video.name)
            if task_filter and task not in task_filter:
                continue
            viewport = resolve_eott_viewport(participant_dir, video, participant_chars)
            sw, sh = (viewport if viewport else (None, None))
            rows.append(
                {
                    "dataset": "eott",
                    "split": "val",
                    "image_path": str(video),
                    "label_x": float("nan"),
                    "label_y": float("nan"),
                    "label_space": "normalized_viewport",
                    "subject_id": subject_id,
                    "label_source": "tobii",
                    "screen_w": sw,
                    "screen_h": sh,
                    "task": task,
                    "tobii_path": str(tobii_path) if tobii_path.exists() else None,
                    "tobii_sample_count": len(tobii_samples),
                }
            )

    df = pd.DataFrame(rows)
    output.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output, index=False)
    return df


def _eott_task_name(filename: str) -> str:
    m = re.search(r"-study-(.+?)\.(mp4|webm)$", filename, re.I)
    if m:
        return m.group(1).replace("-", "_")
    return Path(filename).stem


def _load_tobii(path: Path) -> list[dict]:
    samples = []
    with path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or not line.startswith("{"):
                continue
            try:
                samples.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return samples


def _to_int(val) -> int | None:
    if val is None or (isinstance(val, float) and val != val):
        return None
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return None
