"""Dataset loading helpers."""

from __future__ import annotations

import pandas as pd
from sklearn.model_selection import train_test_split

from train_mlp import all_feature_names


def load_features(features_path) -> pd.DataFrame:
    df = pd.read_parquet(features_path)
    required = ["label_x", "label_y", *all_feature_names()]
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Extracted parquet missing columns: {missing_cols}")
    return df.dropna(subset=required)


def split_by_dataset(df: pd.DataFrame, config: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    train_cfg = config["training"]
    test_size = train_cfg["test_size"]
    seed = train_cfg["random_seed"]
    mode = train_cfg.get("split_mode", "by_dataset")

    if mode == "pooled":
        train_df, val_df = train_test_split(
            df, test_size=test_size, random_state=seed
        )
        return train_df.copy(), val_df.copy()

    # by_dataset: GazeT → train, EOTT → val (legacy)
    train_df = df[df["dataset"] == "gazet"].copy()
    val_df = df[df["dataset"] == "eott"].copy()
    if val_df.empty:
        train_df, val_df = train_test_split(
            train_df, test_size=test_size, random_state=seed
        )
    return train_df, val_df
