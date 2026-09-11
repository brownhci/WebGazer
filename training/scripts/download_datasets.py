#!/usr/bin/env python3
"""
Download GazeT and EOTT raw datasets into training/data/ (gitignored).

EOTT is fetched automatically from the official WebGazer release URL.
GazeT requires prior access approval — pass the archive URL or a local file path.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from config_utils import load_config, resolve_path  # noqa: E402

EOTT_DEFAULT_URL = (
    "https://webgazer.cs.brown.edu/data/WebGazerETRA2018Dataset_Release20180420.zip"
)
CHUNK_SIZE = 1024 * 1024


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"Already downloaded: {dest}")
        return

    print(f"Downloading {url}")
    print(f"  → {dest}")
    req = Request(url, headers={"User-Agent": "WebGazer-training/1.0"})
    with urlopen(req, timeout=60) as resp, dest.open("wb") as out:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        while True:
            chunk = resp.read(CHUNK_SIZE)
            if not chunk:
                break
            out.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded * 100 // total
                mb = downloaded / (1024 * 1024)
                total_mb = total / (1024 * 1024)
                print(f"\r  {mb:.0f}/{total_mb:.0f} MB ({pct}%)", end="", flush=True)
        print()


def _extract_zip(archive: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    marker = dest / ".extracted"
    if marker.exists():
        print(f"Already extracted: {dest}")
        return

    print(f"Extracting {archive.name} → {dest}")
    with zipfile.ZipFile(archive, "r") as zf:
        zf.extractall(dest)

    # EOTT zip nests P_* under a release folder — flatten if needed
    if not any(dest.glob("P_*")):
        for sub in dest.iterdir():
            if sub.is_dir() and any(sub.glob("P_*")):
                for item in sub.iterdir():
                    target = dest / item.name
                    if target.exists():
                        continue
                    shutil.move(str(item), str(target))
                break

    marker.write_text(archive.name, encoding="utf-8")
    print(f"Done. Participant folders: {len(list(dest.glob('P_*')))}")


def _extract_gazet(archive: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    marker = dest / ".extracted"
    if marker.exists():
        print(f"Already extracted: {dest}")
        return

    print(f"Extracting GazeT {archive.name} → {dest}")
    suffix = archive.suffix.lower()
    if suffix == ".zip":
        with zipfile.ZipFile(archive, "r") as zf:
            zf.extractall(dest)
    elif suffix in {".tar", ".gz", ".tgz", ".bz2", ".xz"}:
        shutil.unpack_archive(str(archive), str(dest))
    else:
        raise SystemExit(f"Unsupported GazeT archive format: {suffix}")

    marker.write_text(archive.name, encoding="utf-8")
    n_images = sum(
        1
        for p in dest.rglob("*")
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    print(f"Done. Images found: {n_images}")


def download_eott(config: dict, *, force: bool = False) -> Path:
    dl_cfg = config.get("download", {})
    url = dl_cfg.get("eott_url", EOTT_DEFAULT_URL)
    raw_dir = resolve_path(config, "eott_raw")
    cache_dir = resolve_path(config, "data_root") / "_downloads"
    archive = cache_dir / "eott.zip"

    if force and archive.exists():
        archive.unlink()
    if force and raw_dir.exists():
        shutil.rmtree(raw_dir)

    _download(url, archive)
    _extract_zip(archive, raw_dir)
    return raw_dir


def download_gazet(config: dict, source: str | Path, *, force: bool = False) -> Path:
    raw_dir = resolve_path(config, "gazet_raw")
    cache_dir = resolve_path(config, "data_root") / "_downloads"
    cache_dir.mkdir(parents=True, exist_ok=True)

    source_path = Path(source)
    if source_path.is_file():
        archive = source_path
    else:
        archive = cache_dir / "gazet.zip"
        if force and archive.exists():
            archive.unlink()
        if force and raw_dir.exists():
            shutil.rmtree(raw_dir)
        _download(str(source), archive)

    _extract_gazet(archive, raw_dir)
    return raw_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Download GazeT and EOTT datasets")
    parser.add_argument("--eott", action="store_true", help="Download EOTT (default if no flag)")
    parser.add_argument("--gazet", action="store_true", help="Download GazeT archive")
    parser.add_argument(
        "--gazet-source",
        type=str,
        default=os.environ.get("GAZET_DOWNLOAD_URL", ""),
        help="GazeT archive URL or local path (or env GAZET_DOWNLOAD_URL)",
    )
    parser.add_argument("--all", action="store_true", help="Download both datasets")
    parser.add_argument("--force", action="store_true", help="Re-download and re-extract")
    args = parser.parse_args()

    config = load_config()
    do_eott = args.all or args.eott or (not args.gazet)
    do_gazet = args.all or args.gazet

    if do_eott:
        download_eott(config, force=args.force)

    if do_gazet:
        if not args.gazet_source:
            raise SystemExit(
                "GazeT requires an archive URL or local file.\n"
                "  1. Request access: https://github.com/mirmashel/gazet_dataset\n"
                "  2. Run: python scripts/download_datasets.py --gazet "
                "--gazet-source /path/to/gazet.zip\n"
                "     or set GAZET_DOWNLOAD_URL"
            )
        download_gazet(config, args.gazet_source, force=args.force)

    if not do_eott and not do_gazet:
        parser.print_help()


if __name__ == "__main__":
    main()
