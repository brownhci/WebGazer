from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def load_config(path: Path | None = None) -> dict:
    config_path = path or (ROOT / "config.yaml")
    with config_path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_path(config: dict, key: str) -> Path:
    return ROOT / config["paths"][key]
