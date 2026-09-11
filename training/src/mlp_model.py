"""MLP for gaze regression: FaceMesh features + viewport size → (x, y) in [0, 1]."""

from __future__ import annotations

import torch
import torch.nn as nn


class GazeMLP(nn.Module):
    """
    Fully-connected network for cross-user gaze without per-user calibration.

    Deeper stacks (4 hidden layers) approximate composed geometric relations
    (head rotation × iris offset × viewport scaling) better than a single layer.
    """

    def __init__(
        self,
        input_dim: int,
        hidden_dims: list[int],
        dropout: float = 0.25,
    ) -> None:
        super().__init__()
        layers: list[nn.Module] = []
        prev = input_dim
        for i, h in enumerate(hidden_dims):
            layers.append(nn.Linear(prev, h))
            layers.append(nn.LayerNorm(h))
            layers.append(nn.GELU())
            if dropout > 0:
                layers.append(nn.Dropout(dropout if i < len(hidden_dims) - 1 else dropout / 2))
            prev = h
        self.backbone = nn.Sequential(*layers)
        self.head = nn.Linear(prev, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.sigmoid(self.head(self.backbone(x)))
