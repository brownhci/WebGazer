#!/usr/bin/env python3
"""Export gaze_mlp.pt to a JSON bundle for browser inference."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch


def _tensor_to_list(t: torch.Tensor) -> list:
    return t.detach().cpu().tolist()


def export_checkpoint(pt_path: Path, out_path: Path) -> None:
    ckpt = torch.load(pt_path, map_location="cpu", weights_only=True)
    state = ckpt["state_dict"]

    layers: list[dict] = []
    i = 0
    while f"backbone.{i}.weight" in state:
        w = state[f"backbone.{i}.weight"]
        b = state[f"backbone.{i}.bias"]
        layers.append(
            {
                "type": "linear",
                "weight": _tensor_to_list(w),
                "bias": _tensor_to_list(b),
            }
        )
        ln_i = i + 1
        layers.append(
            {
                "type": "layernorm",
                "weight": _tensor_to_list(state[f"backbone.{ln_i}.weight"]),
                "bias": _tensor_to_list(state[f"backbone.{ln_i}.bias"]),
            }
        )
        i += 4  # Linear, LayerNorm, GELU, Dropout

    layers.append(
        {
            "type": "linear",
            "weight": _tensor_to_list(state["head.weight"]),
            "bias": _tensor_to_list(state["head.bias"]),
        }
    )

    bundle = {
        "input_dim": ckpt["input_dim"],
        "hidden_dims": ckpt["hidden_dims"],
        "dropout": ckpt.get("dropout", 0.0),
        "feature_names": ckpt["feature_names"],
        "scaler_mean": ckpt["scaler_mean"],
        "scaler_scale": ckpt["scaler_scale"],
        "layers": layers,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(bundle, f)
    print(f"Exported {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=Path("checkpoints/gaze_mlp.pt"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("../src/models/gaze_mlp.json"),
    )
    args = parser.parse_args()
    export_checkpoint(args.checkpoint, args.output)


if __name__ == "__main__":
    main()
