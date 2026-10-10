"""Score a model's scopes against the test set.

Get predictions from any OpenAI-compatible endpoint (a base model for the
baseline, or the fine-tuned model served by Ollama):

    python -m src.evaluate predict --base-url http://localhost:11434/v1 --model qwen2.5:3b --out runs/base.jsonl
    python -m src.evaluate score runs/base.jsonl

The Kaggle notebook writes the same predictions format, so its output can be
scored here too. Remember the test set is synthetic: these numbers say how well
the model copies the teacher, not how close it is to real jobs. Add real,
hand-checked jobs to the test set before quoting accuracy.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
from pathlib import Path

import requests

from .pricing import load_catalog
from .prompt import messages, parse_reply
from .scope import Scope, consistency_issues, validate_skus

ROOT = Path(__file__).resolve().parent.parent
TEST = ROOT / "data" / "sft" / "test.jsonl"


def load_test(path: Path = TEST) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        ex = json.loads(line)
        msgs = ex["messages"]
        rows.append({"id": ex["id"], "description": msgs[1]["content"], "reference": json.loads(msgs[2]["content"])})
    return rows


def predict(base_url: str, model: str, out: Path, api_key: str | None) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    with open(out, "w", encoding="utf-8") as f:
        for i, row in enumerate(load_test()):
            r = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                json={"model": model, "messages": messages(row["description"]), "temperature": 0},
                headers=headers,
                timeout=300,
            )
            r.raise_for_status()
            reply = r.json()["choices"][0]["message"]["content"]
            f.write(json.dumps({"id": row["id"], "reply": reply}) + "\n")
            print(f"{i + 1} done", end="\r")
    print(f"\nwrote {out}")


def ape(pred: float, ref: float) -> float:
    return abs(pred - ref) / ref if ref else 0.0


def score(pred_path: Path) -> dict:
    test = {r["id"]: r for r in load_test()}
    preds = [json.loads(l) for l in pred_path.read_text(encoding="utf-8").splitlines()]
    known = set(load_catalog())

    n = len(preds)
    parsed = sku_ok = consistent = permit_ok = kind_ok = 0
    hours_ape: list[float] = []
    f1s: list[float] = []
    qty_close: list[float] = []
    for p in preds:
        ref = Scope.model_validate(test[p["id"]]["reference"])
        try:
            got = parse_reply(p["reply"])
        except Exception:
            f1s.append(0.0)
            continue
        parsed += 1
        sku_ok += not validate_skus(got, known)
        consistent += not consistency_issues(got)
        permit_ok += got.permit_required == ref.permit_required
        kind_ok += got.job_kind == ref.job_kind
        hours_ape.append(ape(got.total_labor_hours(), ref.total_labor_hours()))

        ref_q = {m.sku: m.quantity for m in ref.materials}
        got_q = {m.sku: m.quantity for m in got.materials}
        hit = set(ref_q) & set(got_q)
        prec = len(hit) / len(got_q) if got_q else float(not ref_q)
        rec = len(hit) / len(ref_q) if ref_q else float(not got_q)
        f1s.append(2 * prec * rec / (prec + rec) if prec + rec else 0.0)
        qty_close += [float(ape(got_q[s], ref_q[s]) <= 0.25) for s in hit]

    def pct(x: float) -> float:
        return round(100 * x, 1)

    return {
        "examples": n,
        "valid_json_and_schema_%": pct(parsed / n) if n else 0,
        "all_skus_in_catalog_%": pct(sku_ok / parsed) if parsed else 0,
        "tasks_and_parts_consistent_%": pct(consistent / parsed) if parsed else 0,
        "materials_f1_%": pct(statistics.mean(f1s)) if f1s else 0,
        "quantity_within_25%_%": pct(statistics.mean(qty_close)) if qty_close else 0,
        "labor_hours_median_error_%": pct(statistics.median(hours_ape)) if hours_ape else None,
        "labor_hours_within_25%_%": pct(statistics.mean(e <= 0.25 for e in hours_ape)) if hours_ape else 0,
        "permit_correct_%": pct(permit_ok / parsed) if parsed else 0,
        "job_kind_correct_%": pct(kind_ok / parsed) if parsed else 0,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("predict")
    p.add_argument("--base-url", required=True)
    p.add_argument("--model", required=True)
    p.add_argument("--out", type=Path, required=True)
    s = sub.add_parser("score")
    s.add_argument("predictions", type=Path)
    args = ap.parse_args()
    if args.cmd == "predict":
        predict(args.base_url, args.model, args.out, os.environ.get("EVAL_API_KEY"))
    else:
        print(json.dumps(score(args.predictions), indent=2))


if __name__ == "__main__":
    main()
