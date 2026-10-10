"""The structured scope the model produces from a job description.

The model only decides *what* the job needs (tasks, labor hours, parts and
quantities). Dollar amounts are never part of the model output: pricing.py
computes them from the shop's settings, its price list and BLS data.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

JobKind = Literal["installation", "repair", "maintenance", "inspection", "upgrade"]


class Task(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    labor_hours: float = Field(gt=0, le=200)
    crew_size: int = Field(default=1, ge=1, le=6)


class Material(BaseModel):
    sku: str
    quantity: float = Field(gt=0, le=5000)


class Scope(BaseModel):
    job_kind: JobKind
    summary: str = Field(min_length=5, max_length=200)
    tasks: list[Task] = Field(min_length=1, max_length=25)
    materials: list[Material] = Field(default_factory=list, max_length=60)
    permit_required: bool
    assumptions: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("materials")
    @classmethod
    def unique_skus(cls, v: list[Material]) -> list[Material]:
        skus = [m.sku for m in v]
        if len(skus) != len(set(skus)):
            raise ValueError("duplicate sku in materials")
        return v

    def total_labor_hours(self) -> float:
        """Person-hours: each task's hours times its crew size."""
        return sum(t.labor_hours * t.crew_size for t in self.tasks)


def validate_skus(scope: Scope, known: set[str]) -> list[str]:
    """Return SKUs in the scope that are not in the parts catalog."""
    return [m.sku for m in scope.materials if m.sku not in known]


def consistency_issues(scope: Scope) -> list[str]:
    """Cheap checks that tasks and parts agree. Used to reject bad synthetic
    examples and as an eval metric; not a substitute for an electrician's review."""
    skus = {m.sku for m in scope.materials}
    tasks = " ".join(t.name.lower() for t in scope.tasks)
    issues: list[str] = []

    if "breaker" in tasks and not any(s.startswith("BRK-") for s in skus):
        issues.append("a task installs a breaker but no BRK- part is listed")
    for kind in ("EMT", "PVC"):
        for s in skus:
            if s.startswith(f"COND-FIT-{kind}-"):
                size = s.removeprefix(f"COND-FIT-{kind}-")
                if not any(c.startswith(f"COND-{kind}-{size}") for c in skus):
                    issues.append(f"{s} has no matching {size} {kind} conduit")
            elif s.startswith(f"COND-{kind}-"):
                size = s.removeprefix(f"COND-{kind}-")
                if f"COND-FIT-{kind}-{size}" not in skus:
                    issues.append(f"{s} has no matching {kind} fittings (COND-FIT-{kind}-{size})")

    # Interconnected alarms and 3-way switching need a cable with an extra conductor.
    three_wire = any(s.startswith(("WIRE-NM-14-3", "WIRE-NM-12-3", "WIRE-NM-10-3", "WIRE-THHN-")) for s in skus)
    if not three_wire:
        if sum(m.quantity for m in scope.materials if m.sku == "DEV-SMOKE-HW") > 1:
            issues.append("interconnected smoke alarms need 3-conductor cable (e.g. WIRE-NM-14-3)")
        if "DEV-SW-3W" in skus and any(s.startswith("WIRE-") for s in skus):
            issues.append("3-way switches need 3-conductor cable between them (e.g. WIRE-NM-14-3)")

    # Single conductors (THHN) go in conduit, at least two per circuit, so their
    # total footage should be at least twice the conduit footage (10 ft sticks).
    qty = {m.sku: m.quantity for m in scope.materials}
    conduit_ft = 10 * sum(q for s, q in qty.items() if s.startswith(("COND-EMT-", "COND-PVC-")))
    thhn_ft = sum(q for s, q in qty.items() if s.startswith("WIRE-THHN-"))
    if thhn_ft and conduit_ft and thhn_ft < 1.8 * conduit_ft:
        issues.append(
            f"{thhn_ft:g} ft of THHN for {conduit_ft:g} ft of conduit; THHN is per conductor, "
            "so count every conductor in the run (e.g. 3 conductors x 30 ft + 10% = 99 ft)"
        )
    return issues
