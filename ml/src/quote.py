"""Price a scope from the command line.

    python -m src.quote scope.json
    python -m src.quote --example 3       # the 3rd row of data/synthetic/raw.jsonl
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .pricing import quote
from .scope import Scope

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scope", type=Path, nargs="?")
    ap.add_argument("--example", type=int)
    args = ap.parse_args()

    if args.example is not None:
        row = json.loads((ROOT / "data" / "synthetic" / "raw.jsonl").read_text(encoding="utf-8").splitlines()[args.example])
        print(row["description"], "\n")
        scope = Scope.model_validate(row["scope"])
    else:
        scope = Scope.model_validate_json(args.scope.read_text(encoding="utf-8"))

    q = quote(scope)
    wage = f"${q.wage_rate:.2f}/h wage" if q.wage_rate is not None else "no wage data"
    print(f"Labor: {q.labor_hours} h at {wage} ({q.wage_source})")
    for line in q.lines:
        print(f"  {line.quantity:>7g} {line.unit:<4} {line.description:<55} cost ${line.cost:>9.2f}  price ${line.price:>9.2f}")
    if q.missing_prices:
        print(f"  no supplier price: {', '.join(q.missing_prices)}")
    print()
    tag = "" if q.complete else "  (PARTIAL, see notes)"
    if q.budget is not None:
        print(f"Job budget (your cost):  ${q.budget:,.2f}  = labor ${q.labor_cost:,.2f} + overhead ${q.overhead_cost:,.2f} + parts ${q.material_cost:,.2f} + permit ${q.permit_cost:,.2f}{tag}")
    else:
        print("Job budget (your cost):  unknown (no wage data)")
    print(f"Customer price:          ${q.customer_price:,.2f}  = labor ${q.labor_price:,.2f} + parts ${q.material_price:,.2f} + permit ${q.permit_cost:,.2f} + tax ${q.tax:,.2f}{tag}")
    if q.margin is not None:
        print(f"Margin before tax:       {q.margin:.1%}{tag}")
    for n in q.notes:
        print(f"note: {n}")


if __name__ == "__main__":
    main()
