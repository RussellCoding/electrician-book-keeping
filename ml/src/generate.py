"""Generate synthetic training examples with a larger "teacher" model.

    python -m src.generate --n 2000

The teacher is any OpenAI-compatible chat API, set with TEACHER_BASE_URL,
TEACHER_API_KEY and TEACHER_MODEL (e.g. Groq, OpenRouter, or a local Ollama at
http://localhost:11434/v1). Each example is a job description plus a Scope
(tasks, labor hours, parts and quantities). No prices are generated: those come
from pricing.py. Every row is marked synthetic with the teacher model's name.

Check the teacher model's license and the provider's terms allow using outputs
to train another model before running this at scale.
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import random
import threading
import time
from pathlib import Path

import requests
from pydantic import ValidationError

from .pricing import load_catalog
from .prompt import parse_reply, system_prompt
from .scope import Scope, consistency_issues, validate_skus

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "synthetic" / "raw.jsonl"

JOBS = [
    ("upgrade", "100A to 200A service and panel upgrade"),
    ("upgrade", "replace a Federal Pacific or Zinsco panel"),
    ("installation", "add a 100A subpanel in a detached garage or shop"),
    ("installation", "Level 2 EV charger circuit (hardwired charger or 14-50 outlet)"),
    ("installation", "add recessed lights to a room"),
    ("installation", "install a ceiling fan where there is only a light"),
    ("installation", "add outlets to a room or garage"),
    ("installation", "dedicated circuit for a new appliance (microwave, dishwasher, mini-split, dryer, range)"),
    ("installation", "generator interlock and inlet"),
    ("installation", "hot tub or spa circuit with disconnect"),
    ("installation", "kitchen remodel rough-in and trim"),
    ("installation", "bathroom remodel: vanity light, exhaust fan, GFCI"),
    ("installation", "outdoor outlet or motion floodlights"),
    ("installation", "low-voltage landscape lighting"),
    ("installation", "under-cabinet lighting"),
    ("installation", "whole-house surge protector"),
    ("installation", "hardwired smoke and CO alarms throughout the house"),
    ("installation", "basement finish wiring"),
    ("installation", "shop lighting with LED wraparound fixtures"),
    ("repair", "dead outlets or a tripping circuit, troubleshoot and fix"),
    ("repair", "replace damaged service mast or weatherhead after storm"),
    ("repair", "replace scorched receptacle or loose neutral"),
    ("repair", "breaker that won't reset"),
    ("repair", "flickering lights throughout the house"),
    ("maintenance", "replace all receptacles and switches in an older home"),
    ("maintenance", "swap ungrounded outlets for GFCI protection"),
    ("maintenance", "panel tune-up: torque lugs, label circuits, check for overheating"),
    ("inspection", "pre-sale home electrical inspection"),
    ("inspection", "insurance-required panel and wiring evaluation"),
    ("upgrade", "partial rewire of knob-and-tube circuits"),
    ("upgrade", "add AFCI protection to bedroom circuits"),
    ("upgrade", "convert fluorescent fixtures in a small office to LED"),
]
HOMES = [
    "1920s house with plaster walls",
    "1950s ranch on a crawlspace",
    "1960s split-level",
    "1970s house with an unfinished basement",
    "1990s two-story with attic access",
    "2010s house on a slab",
    "small retail storefront",
    "duplex rental unit",
    "mobile home",
    "detached garage",
]
VOICES = [
    "a homeowner texting, short and vague, no trade terms",
    "a homeowner email with lots of detail and some wrong guesses",
    "an electrician's quick notes from a walkthrough, using trade shorthand",
    "a property manager's work order",
    "a voicemail transcript, run-on sentences",
    "a general contractor's scope line in a bid request",
]

INSTRUCTIONS = """Write one realistic job request and the scope an experienced electrician would plan for it.

Job type: {job}
Building: {home}
Written as: {voice}
Detail: {detail}

Reply with ONLY a JSON object: {{"description": "...", "scope": {{...}}}}
- description: the request as that person would write it (1-6 sentences). It may leave out distances or conditions.
- scope: follows the format, rules and parts list in the system message. Before answering, check the scope against every rule and fix it. Quantities should match the description; when the description is vague, pick typical values and say so in assumptions.
- If the building or detail doesn't fit this job type, adapt sensibly (e.g. a business owner instead of a homeowner) or ignore that detail. Never invent work just to use a detail."""

# Jobs that don't run new wire; wiring details below make no sense for them.
NO_NEW_WIRING = {
    "whole-house surge protector",
    "panel tune-up: torque lugs, label circuits, check for overheating",
    "pre-sale home electrical inspection",
    "insurance-required panel and wiring evaluation",
    "replace all receptacles and switches in an older home",
    "swap ungrounded outlets for GFCI protection",
    "add AFCI protection to bedroom circuits",
    "breaker that won't reset",
    "replace a Federal Pacific or Zinsco panel",
}
WIRING_DETAILS = [
    "panel is on the opposite side of the house from the work",
    "panel is close to the work",
    "walls are finished, so fishing wire is required",
    "work area is open framing",
]
DETAILS = [
    "customer wants it done in one day",
    "two separate requests in one message",
    "the description gets a technical detail wrong",
    "mentions a budget concern",
    "",
]

_lock = threading.Lock()

_ASCII = str.maketrans({"‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "‘": "'", "’": "'",
                        "“": '"', "”": '"', "≈": "~", "×": "x", "°": " deg", "…": "...", " ": " "})


def ascii_text(s: str) -> str:
    return s.translate(_ASCII).encode("ascii", "ignore").decode()


def clean_scope(scope: Scope, kind: str) -> Scope:
    data = scope.model_dump()
    data["job_kind"] = kind  # the spec decides the kind; the teacher labels it inconsistently
    data["summary"] = ascii_text(data["summary"])
    data["assumptions"] = [ascii_text(a) for a in data["assumptions"]]
    for t in data["tasks"]:
        t["name"] = ascii_text(t["name"])
    return Scope.model_validate(data)


REVIEW = """You are a master electrician checking a scope before it goes to a customer.

Job request:
{description}

Draft scope:
{scope}

Check it against this list and fix anything wrong:
- Every new circuit has its own breaker of the right size and pole count.
- Cable and wire types fit the use: right gauge for the breaker, right conductor count (e.g. 3-way switching and interconnected alarms need a cable with an extra conductor), equipment grounds in conduit are THHN conductors, not grounding electrode conductor.
- Every new device or fixture has a box, and a plate where one is needed. Fixtures and equipment are listed unless the customer supplies them; if so, say so in assumptions.
- Nothing is listed that the job doesn't need (no staples or wire nuts on jobs that don't use them, no conduit for work inside a panel).
- Quantities match the description and the assumptions.
- Labor hours are what a competent journeyman would typically bid: not padded, not best case.
- permit_required matches what a typical US jurisdiction requires for this work.

Reply with ONLY the corrected scope JSON (same format), even if nothing changed."""

_pace_lock = threading.Lock()
_daily_limit_hit = threading.Event()
_tokens_used = 0


def _seconds(value: str | None) -> float:
    """Parse Groq-style durations like '17.25s', '1m2.3s', '850ms'."""
    if not value:
        return 0.0
    total, num = 0.0, ""
    i = 0
    while i < len(value):
        c = value[i]
        if c.isdigit() or c == ".":
            num += c
        elif value.startswith("ms", i):
            total += float(num or 0) / 1000; num = ""; i += 1
        elif c in "hms":
            total += float(num or 0) * {"h": 3600, "m": 60, "s": 1}[c]; num = ""
        i += 1
    return total


def chat(messages: list[dict], temperature: float) -> str:
    global _tokens_used
    base = os.environ["TEACHER_BASE_URL"].rstrip("/")
    headers = {"Authorization": f"Bearer {os.environ.get('TEACHER_API_KEY', '')}"}
    body = {
        "model": os.environ["TEACHER_MODEL"],
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    if os.environ.get("TEACHER_REASONING_EFFORT"):
        body["reasoning_effort"] = os.environ["TEACHER_REASONING_EFFORT"]
    for attempt in range(20):
        with _pace_lock:
            r = requests.post(f"{base}/chat/completions", json=body, headers=headers, timeout=180)
            # Stay under the per-minute token limit instead of bouncing off it.
            remaining = r.headers.get("x-ratelimit-remaining-tokens")
            if remaining is not None and int(remaining) < 4000:
                time.sleep(_seconds(r.headers.get("x-ratelimit-reset-tokens")) + 0.5)
        if r.status_code == 429 or r.status_code >= 500:
            wait = float(r.headers.get("retry-after") or min(2**attempt * 5, 60))
            if wait > 600:
                _daily_limit_hit.set()
                raise RuntimeError(f"daily limit reached (retry in {wait / 3600:.1f} h); run again later to continue")
            time.sleep(wait)
            continue
        r.raise_for_status()
        data = r.json()
        _tokens_used += data.get("usage", {}).get("total_tokens", 0)
        return data["choices"][0]["message"]["content"]
    raise RuntimeError("teacher kept rate-limiting; try again later")


def check(scope: Scope, known: set[str]) -> list[str]:
    return [f"unknown sku {s}" for s in validate_skus(scope, known)] + consistency_issues(scope)


def draft(spec: dict, kind: str, known: set[str]) -> tuple[str, Scope] | None:
    msgs = [
        {"role": "system", "content": system_prompt()},
        {"role": "user", "content": INSTRUCTIONS.format(**spec)},
    ]
    for _ in range(3):
        text = chat(msgs, temperature=0.9)
        try:
            obj = json.loads(text[text.find("{") : text.rfind("}") + 1])
            description = ascii_text(str(obj["description"]).strip())
            scope = clean_scope(parse_reply(json.dumps(obj["scope"])), kind)
        except (ValueError, KeyError, TypeError, ValidationError) as e:
            msgs += [{"role": "assistant", "content": text}, {"role": "user", "content": f"Invalid: {e}. Reply with corrected JSON only."}]
            continue
        problems = check(scope, known)
        if problems:
            msgs += [{"role": "assistant", "content": text}, {"role": "user", "content": f"Fix these: {'; '.join(problems)}. Use only skus from the parts list. Reply with corrected JSON only."}]
            continue
        return description, scope
    return None


def review(description: str, scope: Scope, kind: str, known: set[str]) -> Scope | None:
    msgs = [
        {"role": "system", "content": system_prompt()},
        {"role": "user", "content": REVIEW.format(description=description, scope=json.dumps(scope.model_dump(), indent=1))},
    ]
    for _ in range(3):
        text = chat(msgs, temperature=0.2)
        try:
            reviewed = clean_scope(parse_reply(text), kind)
        except (ValueError, ValidationError) as e:
            msgs += [{"role": "assistant", "content": text}, {"role": "user", "content": f"Invalid: {e}. Reply with corrected JSON only."}]
            continue
        problems = check(reviewed, known)
        if problems:
            msgs += [{"role": "assistant", "content": text}, {"role": "user", "content": f"Fix these: {'; '.join(problems)}. Reply with corrected JSON only."}]
            continue
        return reviewed
    return None


def make_one(seed: int, known: set[str], do_review: bool) -> dict | None:
    if _daily_limit_hit.is_set():
        return None
    rng = random.Random(seed)
    kind, job = rng.choice(JOBS)
    details = DETAILS if job in NO_NEW_WIRING else DETAILS + WIRING_DETAILS
    spec = {"job": job, "home": rng.choice(HOMES), "voice": rng.choice(VOICES), "detail": rng.choice(details) or "none"}
    first = draft(spec, kind, known)
    if first is None:
        return None
    description, scope = first
    reviewed = review(description, scope, kind, known) if do_review else scope
    if reviewed is None:
        return None
    return {
        "id": hashlib.sha1(description.encode()).hexdigest()[:12],
        "synthetic": True,
        "teacher_model": os.environ["TEACHER_MODEL"],
        "reviewed": do_review,
        "seed": seed,
        "spec": {"kind": kind, **spec},
        "description": description,
        "scope": reviewed.model_dump(),
        **({"draft_scope": scope.model_dump()} if do_review else {}),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--n", type=int, default=50)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--review", action="store_true", help="second teacher pass that checks the scope (about 2x tokens)")
    ap.add_argument("--start-seed", type=int, default=None, help="default: continue after the last seed in raw.jsonl")
    args = ap.parse_args()

    known = set(load_catalog())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    last_seed = -1
    if OUT.exists():
        for line in OUT.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            seen.add(row["id"])
            last_seed = max(last_seed, row["seed"])
    start = args.start_seed if args.start_seed is not None else last_seed + 1

    ok = failed = 0
    with cf.ThreadPoolExecutor(args.workers) as pool, open(OUT, "a", encoding="utf-8") as f:
        futures = [pool.submit(make_one, s, known, args.review) for s in range(start, start + args.n)]
        for fut in cf.as_completed(futures):
            try:
                row = fut.result()
            except Exception as e:  # keep going; one bad request shouldn't lose the batch
                print(f"error: {e}")
                row = None
            if row is None or row["id"] in seen:
                failed += 1
                continue
            with _lock:
                seen.add(row["id"])
                f.write(json.dumps(row) + "\n")
                f.flush()
            ok += 1
            if ok % 25 == 0:
                print(f"{ok} written, {failed} failed")
    if _daily_limit_hit.is_set():
        print("stopped early: daily token limit reached. Run again after it resets (midnight UTC) to continue.")
    print(f"done: {ok} written, {failed} failed, {_tokens_used:,} tokens ({_tokens_used // max(ok, 1):,} per example) -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
