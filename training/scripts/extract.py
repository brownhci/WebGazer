#!/usr/bin/env python3
"""
For each sample in GazeT (images) and EOTT (video frames):
  - run MediaPipe Face Mesh (478 landmarks + iris)
  - compute the retained key points and regression feature vector
  - write training/data/processed/extracted.parquet (gitignored)
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import pandas as pd
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from config_utils import load_config, resolve_path  # noqa: E402
from datasets import build_eott_manifest, build_gazet_manifest  # noqa: E402
from eott_labels import find_recording_start_ms, label_for_frame, load_tobii_samples  # noqa: E402
from facemesh_extractor import FaceMeshExtractor  # noqa: E402
from features import FEATURE_NAMES_BOTH  # noqa: E402
from screen_context import SCREEN_FEATURE_NAMES, append_screen_features  # noqa: E402


def _mirror_label_x(label_x: float) -> float:
    return 1.0 - float(label_x)


def _row_from_extraction(
    base: dict,
    result,
    face_feature_names: list[str],
    *,
    flip_horizontal: bool,
) -> dict | None:
    out = dict(base)
    if flip_horizontal:
        lx = out.get("label_x")
        if lx is not None and math.isfinite(float(lx)):
            out["label_x"] = _mirror_label_x(lx)
    for i, name in enumerate(face_feature_names):
        out[name] = float(result.features[i])
    return append_screen_features(out)


def _process_gazet_image(
    row: pd.Series,
    extractor: FaceMeshExtractor,
    feat_cfg: dict,
    feature_names: list[str],
    flip_horizontal: bool,
) -> dict | None:
    path = Path(row["image_path"])
    if not path.is_file():
        return None
    result = extractor.extract_from_path(
        path,
        track_eye=feat_cfg["track_eye"],
        include_head_pose=feat_cfg["include_head_pose"],
        include_scale_proxies=feat_cfg["include_scale_proxies"],
        flip_horizontal=flip_horizontal,
    )
    if result is None:
        return None
    return _row_from_extraction(
        row.to_dict(), result, feature_names, flip_horizontal=flip_horizontal
    )


def _process_eott_video(
    row: pd.Series,
    extractor: FaceMeshExtractor,
    feat_cfg: dict,
    feature_names: list[str],
    stride: int,
    flip_horizontal: bool,
) -> list[dict]:
    video_path = Path(row["image_path"])
    if not video_path.is_file():
        return []

    participant_dir = video_path.parent
    tobii = load_tobii_samples(row["tobii_path"]) if row.get("tobii_path") else []
    if not tobii:
        return []

    recording_start_ms = find_recording_start_ms(participant_dir, video_path)
    if recording_start_ms is None:
        return []

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    results: list[dict] = []
    frame_i = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_i % stride != 0:
            frame_i += 1
            continue

        frame_epoch_ms = recording_start_ms + int((frame_i / fps) * 1000)
        label = label_for_frame(tobii, frame_epoch_ms)
        if label is None:
            frame_i += 1
            continue
        lx, ly = label

        mesh = extractor.extract_from_bgr(
            frame,
            track_eye=feat_cfg["track_eye"],
            include_head_pose=feat_cfg["include_head_pose"],
            include_scale_proxies=feat_cfg["include_scale_proxies"],
            flip_horizontal=flip_horizontal,
        )
        if mesh is not None:
            base = row.to_dict()
            base["source_video"] = str(video_path)
            base["frame_index"] = frame_i
            base["label_x"] = lx
            base["label_y"] = ly
            base["label_space"] = "normalized_viewport"
            results.append(
                _row_from_extraction(base, mesh, feature_names, flip_horizontal=flip_horizontal)
            )

        frame_i += 1

    cap.release()
    return results


def build_manifest(config: dict) -> pd.DataFrame:
    parts: list[pd.DataFrame] = []
    paths = config["paths"]

    if config["datasets"]["gazet"]["enabled"]:
        gazet_raw = resolve_path(config, "gazet_raw")
        if gazet_raw.exists():
            manifest_path = resolve_path(config, "gazet_manifest")
            parts.append(build_gazet_manifest(gazet_raw, manifest_path))

    if config["datasets"]["eott"]["enabled"]:
        eott_raw = resolve_path(config, "eott_raw")
        if eott_raw.exists():
            tasks = config["datasets"]["eott"].get("tasks") or None
            manifest_path = resolve_path(config, "eott_manifest")
            parts.append(build_eott_manifest(eott_raw, manifest_path, tasks=tasks))

    if not parts:
        raise SystemExit(
            "No raw data found. Run: python scripts/download_datasets.py --all"
        )
    return pd.concat(parts, ignore_index=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract FaceMesh features from raw data")
    parser.add_argument("--output", type=Path, help="Output parquet path")
    args = parser.parse_args()

    config = load_config()
    feat_cfg = config["features"]
    output = args.output or resolve_path(config, "extracted")
    output.parent.mkdir(parents=True, exist_ok=True)

    manifest = build_manifest(config)
    feature_names = FEATURE_NAMES_BOTH
    model_feature_names = feature_names + list(SCREEN_FEATURE_NAMES)
    rows_out: list[dict] = []
    stride = config["extraction"]["eott_frame_stride"]
    flip_horizontal = bool(config["extraction"].get("flip_horizontal", False))
    stats = {"gazet_ok": 0, "gazet_skip": 0, "eott_ok": 0, "eott_skip": 0}

    with FaceMeshExtractor() as extractor:
        for _, row in tqdm(manifest.iterrows(), total=len(manifest), desc="extract"):
            if row["dataset"] == "gazet":
                out = _process_gazet_image(
                    row, extractor, feat_cfg, feature_names, flip_horizontal
                )
                if out:
                    rows_out.append(out)
                    stats["gazet_ok"] += 1
                else:
                    stats["gazet_skip"] += 1
            elif row["dataset"] == "eott":
                batch = _process_eott_video(
                    row, extractor, feat_cfg, feature_names, stride, flip_horizontal
                )
                stats["eott_ok"] += len(batch)
                if not batch:
                    stats["eott_skip"] += 1
                rows_out.extend(batch)

    if not rows_out:
        raise SystemExit("No features extracted — check raw data and face detection.")

    df = pd.DataFrame(rows_out)
    df = df.dropna(subset=["label_x", "label_y", *SCREEN_FEATURE_NAMES])

    schema = {
        "face_feature_names": feature_names,
        "model_feature_names": model_feature_names,
        "n_samples": len(df),
        "by_dataset": df.groupby("dataset").size().to_dict(),
        "stats": stats,
    }
    df.to_parquet(output, index=False)
    schema_path = output.with_suffix(".schema.json")
    with schema_path.open("w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)

    print(f"Extracted {len(df)} samples → {output}")
    print(f"Schema → {schema_path}")
    print(json.dumps(schema, indent=2))


if __name__ == "__main__":
    main()
