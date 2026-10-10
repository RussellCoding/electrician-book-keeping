# Job scoper model

A small open model, fine-tuned to turn an electrical job description into a scope, plus a pricing engine that turns the scope into a job budget and a customer price.

```
"200A panel upgrade, 1960s house"
        │
  fine-tuned model ──► scope: tasks + labor hours, parts + quantities, permit yes/no
        │
  pricing engine   ──► budget (wage × burden + overhead + parts cost + permit)
                       customer price (bill rate + marked-up parts + permit + tax)
```

The model never produces dollar amounts. Prices change monthly and differ by city, so they come from data:

| Number | Source |
|---|---|
| Wage cost per hour | Shop setting, or BLS OEWS electrician mean wage for the shop's metro area |
| Part unit prices | The shop's supplier prices (`catalog/prices.csv`), adjusted for drift since their `as_of` month with BLS Producer Price Indexes |
| Bill rate, burden, overhead, markup, tax, permit fee | Shop settings (`catalog/shop.json`) |
| Labor hours, parts, quantities | The model (an estimate; labeled as one) |

Parts without a supplier price are reported as missing, not guessed.

## Training data is synthetic

Examples are written by a larger "teacher" model (`src/generate.py`): a job description in a realistic voice plus the scope an experienced electrician would plan. Every row is marked `synthetic: true` with the teacher's name. The eval set is a held-out slice of the same data, so its scores measure how well the student copies the teacher. Hand-checked real jobs should be added to the test set before quoting accuracy.

## Run it

```bash
pip install -r requirements.txt

# 1. Real data: electrician wages (national + metros) and parts price indexes -> data/bls.json
python -m src.bls --metro 0012420

# 2. Shop settings and supplier prices (both gitignored)
cp catalog/shop.example.json catalog/shop.json
cp catalog/prices.example.csv catalog/prices.csv   # fill unit_price from a supplier quote

# 3. Synthetic data from any OpenAI-compatible API. Keys go in ml/.env (copy .env.example; gitignored).
#    On Groq's free tier (200K tokens/day for gpt-oss-120b, ~3.5K tokens per example) that's
#    ~55 examples a day: run this once a day. It resumes where it stopped and quits cleanly
#    when the daily limit is hit. --review adds a second checking pass (better, ~2x tokens).
python -m src.generate --n 60

# 4. Split into data/sft/{train,val,test}.jsonl
python -m src.build_sft

# 5. Baseline: score an untuned model (e.g. via Ollama) before training
python -m src.evaluate predict --base-url http://localhost:11434/v1 --model qwen2.5:3b --out runs/base.jsonl
python -m src.evaluate score runs/base.jsonl

# 6. Train on Kaggle: upload data/sft/ as a private dataset, import notebooks/train_kaggle.ipynb,
#    GPU T4 x2, Internet on, run all. Download runs/finetuned.jsonl and the GGUF from the output.
python -m src.evaluate score runs/finetuned.jsonl

# 7. Price a scope
python -m src.quote --example 0
```

## Files

- `src/scope.py`: the scope schema (pydantic). The contract between model and pricing.
- `src/prompt.py`: the one system prompt used for generation, training and inference.
- `src/pricing.py`, `src/quote.py`: budget and customer price.
- `src/bls.py`: BLS OEWS wages and PPI series (`catalog/ppi_series.json`).
- `src/generate.py`, `src/build_sft.py`: synthetic data and train/val/test split.
- `src/evaluate.py`: JSON validity, catalog SKUs, materials F1, quantity and labor-hour error, permit and job-kind accuracy.
- `notebooks/train_kaggle.ipynb`: Unsloth QLoRA fine-tune, test-set predictions, LoRA + GGUF export.
- `catalog/parts.csv`: parts the model may pick from (no prices).
