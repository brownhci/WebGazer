# Entraînement offline WebGazer

Pipeline en 3 scripts. Modèle : **MLP** (sans calibration utilisateur visée).

## Entrées du modèle (16 dimensions)

| Groupe | Features |
|--------|----------|
| FaceMesh | 14 features (iris, pose tête, EAR, échelle) |
| Viewport | `screen_w_norm`, `screen_h_norm` (= pixels / 1920, / 1080) |

À l'inférence : `window.innerWidth`, `window.innerHeight` — **pas de diagonale physique**.

## Architecture MLP (configurable dans `config.yaml`)

```
16 → 256 → 128 → 64 → 32 → 2 (sigmoid)
```

4 couches cachées pour approximer les interactions géométriques non-linéaires (pose × iris × viewport). Early stopping sur la validation EOTT (Tobii).

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
