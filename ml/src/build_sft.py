"""Split data/synthetic/raw.jsonl into chat-format train/val/test files.

    python -m src.build_sft

The split is by a hash of the example id, so it's stable as more rows are
generated. Writes data/sft/{train,val,test}.jsonl.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

from .prompt import training_example
from .scope import Scope

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "synthetic" / "raw.jsonl"
OUT = ROOT / "data" / "sft"


def split_for(example_id: str) -> str:
    bucket = int(hashlib.sha1(example_id.encode()).hexdigest(), 16) % 100
    return "test" if bucket < 8 else "val" if bucket < 13 else "train"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = {name: open(OUT / f"{name}.jsonl", "w", encoding="utf-8") for name in ("train", "val", "test")}
    counts: Counter[str] = Counter()
    for line in RAW.read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        split = split_for(row["id"])
        example = training_example(row["description"], Scope.model_validate(row["scope"]))
        example["id"] = row["id"]
        example["synthetic"] = row["synthetic"]
        files[split].write(json.dumps(example) + "\n")
        counts[split] += 1
    for f in files.values():
        f.close()
    print(dict(counts))


if __name__ == "__main__":
    main()
