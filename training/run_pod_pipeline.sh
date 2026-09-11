#!/usr/bin/env bash
# Full training pipeline for RunPod (logs to logs/pipeline.log)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs data/processed checkpoints

log() { echo "[$(date -Iseconds)] $*" | tee -a logs/pipeline.log; }

if [[ ! -d .venv ]]; then
  log "=== create venv ==="
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

log "=== pip install ==="
pip install -q -r requirements.txt
python3 -c "import torch; import mediapipe; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())"

log "=== download EOTT ==="
python3 scripts/download_datasets.py --eott 2>&1 | tee -a logs/download.log

if [[ -n "${GAZET_SOURCE:-}" ]]; then
  log "=== download GazeT from GAZET_SOURCE ==="
  python3 scripts/download_datasets.py --gazet --gazet-source "$GAZET_SOURCE" 2>&1 | tee -a logs/download_gazet.log
else
  log "WARN: GAZET_SOURCE not set — skipping GazeT (train will use EOTT split fallback only if GazeT missing)"
fi

log "=== extract features ==="
python3 scripts/extract.py 2>&1 | tee -a logs/extract.log

log "=== train MLP ==="
python3 scripts/train.py 2>&1 | tee -a logs/train.log

log "=== DONE ==="
ls -la checkpoints/ data/processed/
