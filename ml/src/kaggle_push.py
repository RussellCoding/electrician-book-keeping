"""Upload data/sft/ to a private Kaggle dataset and run the training notebook on Kaggle.

    python -m src.kaggle_push data       # create or update the dataset
    python -m src.kaggle_push train      # push and run notebooks/train_kaggle.ipynb on a GPU
    python -m src.kaggle_push status     # is the run done?
    python -m src.kaggle_push output     # download runs/ and the model to kaggle_output/

Needs the Kaggle CLI logged in (~/.kaggle). Everything is created private.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGE = ROOT / "data" / "kaggle"
DATASET_SLUG = "electrocrm-job-scoper-sft"
KERNEL_SLUG = "electrocrm-job-scoper-train"


def kaggle(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    print("$ kaggle", " ".join(args))
    # The Kaggle CLI prints emoji; without UTF-8 it crashes mid-download on Windows.
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    r = subprocess.run(["kaggle", *args], capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    print((r.stdout + r.stderr).strip())
    if check and r.returncode != 0:
        sys.exit(r.returncode)
    return r


def username() -> str:
    out = kaggle("config", "view").stdout
    for line in out.splitlines():
        if "username" in line:
            return line.split(":", 1)[1].strip()
    sys.exit("Kaggle username not found; check ~/.kaggle credentials")


def push_data(user: str) -> None:
    src = ROOT / "data" / "sft"
    dest = STAGE / "dataset"
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    for name in ("train.jsonl", "val.jsonl", "test.jsonl"):
        shutil.copy(src / name, dest / name)
    (dest / "dataset-metadata.json").write_text(
        json.dumps({"title": "ElectroCRM job scoper SFT (synthetic)", "id": f"{user}/{DATASET_SLUG}", "licenses": [{"name": "other"}]}, indent=1),
        encoding="utf-8",
    )
    exists = kaggle("datasets", "status", f"{user}/{DATASET_SLUG}", check=False).returncode == 0
    if exists:
        kaggle("datasets", "version", "-p", str(dest), "-m", "update training data")
    else:
        kaggle("datasets", "create", "-p", str(dest))  # private unless --public is passed


def push_train(user: str) -> None:
    dest = STAGE / "kernel"
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    shutil.copy(ROOT / "notebooks" / "train_kaggle.ipynb", dest / "train_kaggle.ipynb")
    (dest / "kernel-metadata.json").write_text(
        json.dumps(
            {
                "id": f"{user}/{KERNEL_SLUG}",
                "title": KERNEL_SLUG,
                "code_file": "train_kaggle.ipynb",
                "language": "python",
                "kernel_type": "notebook",
                "is_private": True,
                "enable_gpu": True,
                "enable_internet": True,
                "dataset_sources": [f"{user}/{DATASET_SLUG}"],
                "competition_sources": [],
                "kernel_sources": [],
            },
            indent=1,
        ),
        encoding="utf-8",
    )
    kaggle("kernels", "push", "-p", str(dest))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["data", "train", "status", "output"])
    args = ap.parse_args()
    user = username()
    if args.cmd == "data":
        push_data(user)
    elif args.cmd == "train":
        push_train(user)
    elif args.cmd == "status":
        kaggle("kernels", "status", f"{user}/{KERNEL_SLUG}")
    else:
        out = ROOT / "kaggle_output"
        out.mkdir(exist_ok=True)
        kaggle("kernels", "output", f"{user}/{KERNEL_SLUG}", "-p", str(out))


if __name__ == "__main__":
    main()
