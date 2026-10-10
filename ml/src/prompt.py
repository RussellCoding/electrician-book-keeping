"""The one prompt shared by data generation, training and inference.

Training and serving must use the exact same system prompt, so everything
that talks to a model builds its messages here.
"""

from __future__ import annotations

import json

from .pricing import load_catalog
from .scope import Scope


def catalog_block() -> str:
    # Units are implied (WIRE- parts are feet, everything else each) to keep the prompt short.
    return "\n".join(f"{sku}: {p['description']}" for sku, p in load_catalog().items())


SYSTEM = """You scope electrical jobs for a small residential and light-commercial electrical contractor in the US.
Given a job description, reply with ONLY a JSON object with these keys:
- job_kind: one of installation, repair, maintenance, inspection, upgrade
- summary: one plain sentence
- tasks: list of {{name, labor_hours, crew_size}}; labor_hours are hours per person for that task, including setup, cleanup and testing
- materials: list of {{sku, quantity}} using ONLY skus from the parts list; WIRE- quantities are feet, everything else is a count
- permit_required: true if a typical US jurisdiction requires an electrical permit for this work
- assumptions: short list of what you assumed when the description was vague (access, distances, existing conditions)
Do not include prices.

Rules:
- Every new circuit has its own breaker of the right size and pole count, and every part a task installs is in materials.
- Cable fits the use: gauge matches the breaker; 3-way switching and interconnected alarms need a cable with an extra conductor; equipment grounds in conduit are THHN, not grounding electrode conductor.
- Conduit and fittings match in size and type. THHN footage counts every conductor in the run plus about 10% slack.
- Every new device or fixture has a box, and a plate where needed. List fixtures and equipment unless the customer supplies them (then say so in assumptions).
- List nothing the job doesn't use (no conduit for work inside a panel, no staples or wire nuts when no cable is run or spliced).
- Ground rods and grounding electrode conductor only when the job adds or replaces a grounding electrode system.
- labor_hours are what a competent journeyman would typically bid: not padded, not best case.
- Use plain ASCII text.

Parts list:
{catalog}"""


def system_prompt() -> str:
    return SYSTEM.format(catalog=catalog_block())


def messages(description: str) -> list[dict]:
    return [
        {"role": "system", "content": system_prompt()},
        {"role": "user", "content": description},
    ]


def training_example(description: str, scope: Scope) -> dict:
    return {
        "messages": [
            *messages(description),
            {"role": "assistant", "content": json.dumps(scope.model_dump(), separators=(",", ":"))},
        ]
    }


def parse_reply(text: str) -> Scope:
    """Parse a model reply, tolerating code fences or text around the JSON."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object in reply")
    return Scope.model_validate_json(text[start : end + 1])
