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
    wage_rate: float
    wage_source: str
    labor_cost: float
    overhead_cost: float
    material_cost: float
    permit_cost: float
    budget: float
    labor_price: float
    material_price: float
    subtotal: float
    tax: float
    customer_price: float
    margin: float
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


def ppi_factor(bls: dict | None, category: str, as_of: str) -> float:
    """Price-index change from the supplier price's month to the latest month."""
    if not bls:
        return 1.0
    values: dict[str, float] = bls["ppi"].get(category, {}).get("values", {})
    if not values or as_of not in values:
        return 1.0
    newest = max(values)
    return values[newest] / values[as_of]


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
        wage = 0.0
        notes.append("No wage data: set wage_cost_per_hour in shop.json or run src.bls.")
    labor_cost = hours * wage * (1 + shop.labor_burden)
    overhead_cost = hours * shop.overhead_per_labor_hour

    lines: list[PricedLine] = []
    missing: list[str] = []
    for m in scope.materials:
        part = catalog.get(m.sku)
        price_row = prices.get(m.sku)
        if part is None or price_row is None:
            missing.append(m.sku)
            continue
        factor = ppi_factor(bls, part["category"], price_row.get("as_of", ""))
        unit_cost = float(price_row["unit_price"]) * factor
        cost = unit_cost * m.quantity
        lines.append(
            PricedLine(
                sku=m.sku,
                description=part["description"],
                quantity=m.quantity,
                unit=part["unit"],
                unit_cost=money(unit_cost),
                ppi_factor=round(factor, 4),
                cost=money(cost),
                price=money(cost * (1 + shop.material_markup)),
            )
        )
    if missing:
        notes.append(f"{len(missing)} part(s) have no supplier price; totals exclude them.")

    material_cost = sum(l.cost for l in lines)
    material_price = sum(l.price for l in lines)
    permit_cost = shop.permit_fee if scope.permit_required else 0.0

    labor_price = hours * shop.bill_rate
    subtotal = labor_price + material_price + permit_cost
    if subtotal < shop.minimum_charge:
        notes.append(f"Raised to the shop minimum charge of {shop.minimum_charge:.2f}.")
        labor_price += shop.minimum_charge - subtotal
        subtotal = shop.minimum_charge
    taxable = material_price if shop.tax_materials_only else subtotal
    tax = taxable * shop.tax_rate

    budget = labor_cost + overhead_cost + material_cost + permit_cost
    return Quote(
        labor_hours=round(hours, 2),
        wage_rate=wage,
        wage_source=wage_source,
        labor_cost=money(labor_cost),
        overhead_cost=money(overhead_cost),
        material_cost=money(material_cost),
        permit_cost=money(permit_cost),
        budget=money(budget),
        labor_price=money(labor_price),
        material_price=money(material_price),
        subtotal=money(subtotal),
        tax=money(tax),
        customer_price=money(subtotal + tax),
        margin=round((subtotal - budget) / subtotal, 4) if subtotal else 0.0,
        lines=lines,
        missing_prices=missing,
        notes=notes,
    )
