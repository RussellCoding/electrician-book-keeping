"""Turn a Scope into a job budget (what it costs the shop) and a customer price.

Every number comes from the shop's settings (catalog/shop.json), its supplier
price list (catalog/prices.csv) and BLS data (data/bls.json). Parts without a
price are listed as missing instead of guessed.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path

from .scope import Scope

ROOT = Path(__file__).resolve().parent.parent


def money(x: float) -> float:
    return round(x + 1e-9, 2)


@dataclass
class Shop:
    bill_rate: float
    labor_burden: float
    overhead_per_labor_hour: float
    material_markup: float
    tax_rate: float
    tax_materials_only: bool
    permit_fee: float
    minimum_charge: float
    wage_cost_per_hour: float | None = None
    metro_area: str | None = None


@dataclass
class PricedLine:
    sku: str
    description: str
    quantity: float
    unit: str
    unit_cost: float
    ppi_factor: float
    cost: float
    price: float


@dataclass
class Quote:
    labor_hours: float
    wage_rate: float | None
    wage_source: str
    labor_cost: float | None  # None when there's no wage data: no cost is better than a made-up one
    overhead_cost: float
    material_cost: float
    permit_cost: float
    budget: float | None
    labor_price: float
    material_price: float
    subtotal: float
    tax: float
    customer_price: float
    margin: float | None
    complete: bool  # False when a wage or any part price is missing; totals are then partial
    lines: list[PricedLine] = field(default_factory=list)
    missing_prices: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def load_catalog(root: Path = ROOT) -> dict[str, dict]:
    with open(root / "catalog" / "parts.csv", newline="", encoding="utf-8") as f:
        return {row["sku"]: row for row in csv.DictReader(f)}


def load_prices(root: Path = ROOT) -> dict[str, dict]:
    path = root / "catalog" / "prices.csv"
    if not path.exists():
        return {}
    with open(path, newline="", encoding="utf-8") as f:
        return {r["sku"]: r for r in csv.DictReader(f) if r.get("unit_price", "").strip()}


def load_shop(root: Path = ROOT) -> Shop:
    path = root / "catalog" / "shop.json"
    if not path.exists():
        path = root / "catalog" / "shop.example.json"
    data = {k: v for k, v in json.loads(path.read_text(encoding="utf-8")).items() if not k.startswith("_")}
    return Shop(**data)


def load_bls(root: Path = ROOT) -> dict | None:
    path = root / "data" / "bls.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def normalize_month(value: str) -> str | None:
    """'2026-8' or '2026-08' -> '2026-08'; anything else -> None."""
    try:
        year, month = value.strip().split("-")[:2]
        y, m = int(year), int(month)
    except ValueError:
        return None
    return f"{y:04d}-{m:02d}" if 1 <= m <= 12 else None


def ppi_factor(bls: dict | None, category: str, as_of: str) -> tuple[float, str | None]:
    """Price-index change from the supplier price's month to the latest month.
    Returns (factor, problem); factor is 1.0 with a problem when no adjustment was possible."""
    if not bls:
        return 1.0, "no BLS data (run src.bls)"
    values: dict[str, float] = bls["ppi"].get(category, {}).get("values", {})
    month = normalize_month(as_of)
    if month is None:
        return 1.0, f"as_of '{as_of}' is not YYYY-MM"
    if not values or month not in values:
        return 1.0, f"no {category} price index for {month}"
    return values[max(values)] / values[month], None


def wage_rate(shop: Shop, bls: dict | None) -> tuple[float | None, str]:
    if shop.wage_cost_per_hour is not None:
        return shop.wage_cost_per_hour, "shop setting"
    if bls:
        wages = bls["electrician_wages"]
        for area in filter(None, (shop.metro_area, "national")):
            w = wages.get(area)
            if w and "hourly_mean" in w:
                return w["hourly_mean"], f"BLS OEWS {w['year']} mean, area {area}"
    return None, "missing"


def quote(scope: Scope, shop: Shop | None = None, root: Path = ROOT) -> Quote:
    shop = shop or load_shop(root)
    catalog, prices, bls = load_catalog(root), load_prices(root), load_bls(root)
    notes: list[str] = ["Labor hours are a model estimate; review before sending."]

    hours = scope.total_labor_hours()
    wage, wage_source = wage_rate(shop, bls)
    if wage is None:
        notes.append("No wage data, so no budget or margin: set wage_cost_per_hour in shop.json or run src.bls.")
    labor_cost = money(hours * wage * (1 + shop.labor_burden)) if wage is not None else None
    overhead_cost = money(hours * shop.overhead_per_labor_hour)

    lines: list[PricedLine] = []
    missing: list[str] = []
    unadjusted: list[str] = []
    for m in scope.materials:
        part = catalog.get(m.sku)
        price_row = prices.get(m.sku)
        if part is None or price_row is None:
            missing.append(m.sku)
            continue
        factor, problem = ppi_factor(bls, part["category"], price_row.get("as_of", ""))
        if problem:
            unadjusted.append(f"{m.sku} ({problem})")
        unit_cost = float(price_row["unit_price"]) * factor
        cost = money(unit_cost * m.quantity)
        lines.append(
            PricedLine(
                sku=m.sku,
                description=part["description"],
                quantity=m.quantity,
                unit=part["unit"],
                unit_cost=money(unit_cost),
                ppi_factor=round(factor, 4),
                cost=cost,
                price=money(cost * (1 + shop.material_markup)),
            )
        )
    if missing:
        notes.append(f"PARTIAL: {len(missing)} part(s) have no supplier price and are left out of every total.")
    if unadjusted:
        notes.append("Supplier price not adjusted for inflation: " + "; ".join(unadjusted))

    # Round each component first, then add, so the shown parts always sum to the shown totals.
    material_cost = money(sum(l.cost for l in lines))
    material_price = money(sum(l.price for l in lines))
    permit_cost = money(shop.permit_fee if scope.permit_required else 0.0)

    labor_price = money(hours * shop.bill_rate)
    subtotal = money(labor_price + material_price + permit_cost)
    if subtotal < shop.minimum_charge:
        notes.append(f"Raised to the shop minimum charge of {shop.minimum_charge:.2f}.")
        labor_price = money(labor_price + shop.minimum_charge - subtotal)
        subtotal = money(shop.minimum_charge)
    taxable = material_price if shop.tax_materials_only else subtotal
    tax = money(taxable * shop.tax_rate)

    budget = money(labor_cost + overhead_cost + material_cost + permit_cost) if labor_cost is not None else None
    return Quote(
        labor_hours=round(hours, 2),
        wage_rate=wage,
        wage_source=wage_source,
        labor_cost=labor_cost,
        overhead_cost=overhead_cost,
        material_cost=material_cost,
        permit_cost=permit_cost,
        budget=budget,
        labor_price=labor_price,
        material_price=material_price,
        subtotal=subtotal,
        tax=tax,
        customer_price=money(subtotal + tax),
        margin=round((subtotal - budget) / subtotal, 4) if budget is not None and subtotal else None,
        complete=wage is not None and not missing,
        lines=lines,
        missing_prices=missing,
        notes=notes,
    )
