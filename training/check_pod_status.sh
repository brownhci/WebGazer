#!/usr/bin/env bash
# Quick status on RunPod pipeline
ssh -o BatchMode=yes root@64.247.206.22 -p 47800 -i ~/.ssh/id_ed25519 <<'REMOTE'
cd /workspace/WebGazer/training
echo "=== $(date -Iseconds) ==="
pgrep -af 'run_pod|download|extract|train' | grep -v grep || echo "(no active pipeline process)"
echo "--- pipeline.log (last 5) ---"
tail -5 logs/pipeline.log 2>/dev/null
echo "--- download (last 1 line) ---"
tail -1 logs/download.log 2>/dev/null | tr '\r' '\n' | tail -1
echo "--- disk ---"
du -sh data data/_downloads data/eott/raw data/gazet/raw data/processed checkpoints 2>/dev/null
df -h /workspace | tail -1
echo "--- artifacts ---"
ls -la checkpoints/ data/processed/*.parquet 2>/dev/null || true
REMOTE
