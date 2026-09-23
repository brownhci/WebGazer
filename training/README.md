# Entraînement offline WebGazer

Pipeline en 3 scripts. Modèle : **MLP** (sans calibration utilisateur visée).

## Entrées du modèle (21 dimensions)

| Groupe | Features |
|--------|----------|
| FaceMesh | 19 features (iris patch, MediaPipe 3D pose, proxys 2D, EAR, échelle) |
| Viewport | `screen_w_norm`, `screen_h_norm` (= pixels / 1920, / 1080) |

Pose tête : repère 3D construit sur le mesh MediaPipe (ligne des yeux × nez–menton) →
`head_yaw/pitch/roll` + offset nez/IPD (`head_tx/ty/tz`), **plus** proxys 2D.
Pas de template visage en mm / solvePnP.

À l'inférence : `window.innerWidth`, `window.innerHeight` — **pas de diagonale physique**.

## Architecture MLP (configurable dans `config.yaml`)

```
21 → 256 → 128 → 64 → 32 → 2 (linear)
```

Tête **linéaire** (plus de sigmoid) : les labels peuvent être légèrement hors `[0,1]` à l'entraînement ; l'UI clampe à l'affichage. Early stopping sur la validation EOTT (Tobii).

Après `train.py`, réexporterer pour le navigateur :

```bash
python scripts/export_mlp_json.py
```

Le JSON inclut `"output_activation": "linear"`. Les anciens bundles sans ce champ restent traités en `sigmoid`.

## Workflow

```bash
cd training && pip install -r requirements.txt

python scripts/download_datasets.py --eott
python scripts/download_datasets.py --gazet --gazet-source /path/gazet.zip

python scripts/extract.py
python scripts/train.py
```

Sortie : `checkpoints/gaze_mlp.pt`, `metrics.json`

## Données écran par dataset

| Dataset | Source viewport |
|---------|-----------------|
| GazeT | `screen_size_x/y` dans les métadonnées |
| EOTT | `Participant_Characteristics` ou médiane `windowInnerWidth/Height` dans les logs |

Les échantillons sans `screen_w/h` sont exclus.

## Sans calibration : attentes réalistes

Le MLP + GazeT (6,7k personnes) vise la généralisation cross-user, mais un eye-tracker **sans aucune calibration** reste difficile. Surveille `metrics.json` → `val.mae_norm` sur EOTT ; objectif typique < 0.05–0.08 en coords normalisées (~100 px sur 1920).

**Note runtime :** pupille dans les eye patches ; pose tête via repère 3D MediaPipe — extraction **et** inférence. Après un changement de features, ré-extraire + réentraîner.
