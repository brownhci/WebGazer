#!/usr/bin/env python3
"""
Train gaze MLP (FaceMesh features + viewport size → normalized screen position).

Designed for cross-user use without per-session calibration.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from config_utils import load_config, resolve_path  # noqa: E402
from train_mlp import save_checkpoint, train_mlp  # noqa: E402
from train_utils import load_features, split_by_dataset  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Train gaze MLP")
    parser.add_argument("--input", type=Path, help="Extracted parquet from extract.py")
    args = parser.parse_args()

    config = load_config()
    extracted_path = args.input or resolve_path(config, "extracted")
    ckpt_dir = resolve_path(config, "checkpoints")

    if not extracted_path.exists():
        raise SystemExit(f"Missing extracted data: {extracted_path}\nRun: python scripts/extract.py")

    df = load_features(extracted_path)
    train_df, val_df = split_by_dataset(df, config)
    mlp_cfg = config["mlp"]

    result = train_mlp(
        train_df,
        val_df,
        hidden_dims=mlp_cfg["hidden_dims"],
        dropout=mlp_cfg["dropout"],
        lr=mlp_cfg["lr"],
        weight_decay=mlp_cfg["weight_decay"],
        batch_size=min(mlp_cfg["batch_size"], max(len(train_df), 1)),
        max_epochs=mlp_cfg["max_epochs"],
        patience=mlp_cfg["patience"],
        seed=config["training"]["random_seed"],
    )

    save_checkpoint(result, ckpt_dir, config)

    metrics = {
        **result.metrics,
        "feature_names": result.feature_names,
        "n_train": len(train_df),
        "n_val": len(val_df),
        "model": "mlp",
    }
    with (ckpt_dir / "metrics.json").open("w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))
    print(f"\nModel saved to {ckpt_dir}/gaze_mlp.pt")


if __name__ == "__main__":
    main()
