"""Train and evaluate the gaze MLP."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset

from features import FEATURE_NAMES_BOTH
from mlp_model import GazeMLP
from screen_context import SCREEN_FEATURE_NAMES


@dataclass
class TrainResult:
    model: GazeMLP
    scaler: StandardScaler
    feature_names: list[str]
    metrics: dict
    best_epoch: int


def all_feature_names() -> list[str]:
    return list(FEATURE_NAMES_BOTH) + list(SCREEN_FEATURE_NAMES)


def prepare_xy(
    df: pd.DataFrame,
    feature_names: list[str],
    scaler: StandardScaler | None = None,
    fit_scaler: bool = False,
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    x = df[feature_names].to_numpy(dtype=np.float64)
    y = df[["label_x", "label_y"]].to_numpy(dtype=np.float64)
    if fit_scaler:
        scaler = StandardScaler()
        x = scaler.fit_transform(x)
    elif scaler is not None:
        x = scaler.transform(x)
    else:
        scaler = StandardScaler()
    return x, y, scaler


def mae_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    err = y_pred - y_true
    mae_x = float(np.mean(np.abs(err[:, 0])))
    mae_y = float(np.mean(np.abs(err[:, 1])))
    mae_norm = float(np.mean(np.linalg.norm(err, axis=1)))
    return {"mae_x": mae_x, "mae_y": mae_y, "mae_norm": mae_norm, "n_samples": len(y_true)}


def train_mlp(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    *,
    hidden_dims: list[int],
    dropout: float,
    lr: float,
    weight_decay: float,
    batch_size: int,
    max_epochs: int,
    patience: int,
    seed: int,
    device: str | None = None,
) -> TrainResult:
    feature_names = all_feature_names()
    x_train, y_train, scaler = prepare_xy(train_df, feature_names, fit_scaler=True)

    dev = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
    model = GazeMLP(len(feature_names), hidden_dims, dropout=dropout).to(dev)

    x_t = torch.tensor(x_train, dtype=torch.float32)
    y_t = torch.tensor(y_train, dtype=torch.float32)
    loader = DataLoader(TensorDataset(x_t, y_t), batch_size=batch_size, shuffle=True)

    if len(val_df):
        x_val, y_val, _ = prepare_xy(val_df, feature_names, scaler=scaler)
        x_val_t = torch.tensor(x_val, dtype=torch.float32).to(dev)
        y_val_np = y_val
    else:
        x_val_t = None
        y_val_np = None

    torch.manual_seed(seed)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    loss_fn = nn.SmoothL1Loss()

    best_state = None
    best_val = float("inf")
    best_epoch = 0
    stale = 0
    history: dict[str, list] = {"train_loss": [], "val_mae_norm": []}

    for epoch in range(1, max_epochs + 1):
        model.train()
        epoch_loss = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(dev), yb.to(dev)
            opt.zero_grad()
            pred = model(xb)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()
            epoch_loss += loss.item() * len(xb)
        epoch_loss /= len(x_t)
        history["train_loss"].append(epoch_loss)

        if x_val_t is not None and y_val_np is not None:
            model.eval()
            with torch.no_grad():
                val_pred = model(x_val_t).cpu().numpy()
            val_mae = mae_metrics(y_val_np, val_pred)["mae_norm"]
            history["val_mae_norm"].append(val_mae)
            if val_mae < best_val:
                best_val = val_mae
                best_epoch = epoch
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                stale = 0
            else:
                stale += 1
                if stale >= patience:
                    break

    if best_state:
        model.load_state_dict(best_state)

    model.eval()
    with torch.no_grad():
        x_train_t = torch.tensor(
            prepare_xy(train_df, feature_names, scaler=scaler)[0], dtype=torch.float32
        ).to(dev)
        train_pred = model(x_train_t).cpu().numpy()
        val_pred = model(x_val_t).cpu().numpy() if x_val_t is not None else None

    metrics = {
        "train": mae_metrics(y_train, train_pred),
        "val": mae_metrics(y_val_np, val_pred) if val_pred is not None else {},
        "history": history,
        "best_epoch": best_epoch,
        "hidden_dims": hidden_dims,
    }
    return TrainResult(model, scaler, feature_names, metrics, best_epoch)


def save_checkpoint(result: TrainResult, ckpt_dir: Path, config: dict) -> None:
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": result.model.state_dict(),
            "input_dim": len(result.feature_names),
            "hidden_dims": config["mlp"]["hidden_dims"],
            "dropout": config["mlp"]["dropout"],
            "feature_names": result.feature_names,
            "scaler_mean": result.scaler.mean_.tolist(),
            "scaler_scale": result.scaler.scale_.tolist(),
            "output_activation": "linear",
        },
        ckpt_dir / "gaze_mlp.pt",
    )
