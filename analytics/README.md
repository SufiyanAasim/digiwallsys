# Analytics

A standalone, offline analysis pipeline over the existing PostgreSQL database:
monthly spend trends, category breakdowns, and a simple next-month spend
forecast per user. It is separate from `src/backend` and `src/mobile` on
purpose — nothing here is imported by, or reachable from, the running API or
app. It is a tool a developer or admin runs locally against a copy of the
data, the way `queueless`'s `analytics/` folder works.

## Why Python here and nowhere else

The rest of the project is JavaScript because the work is CRUD plus a
transactional ledger — Express and `pg` are a good fit, and splitting that
across languages would only add a second toolchain for no gain. This folder
is different: it's a data-analysis job (aggregation, a trend line, a
regression), which is exactly what `pandas`/`scikit-learn` are for and what
Node has no comparably mature ecosystem for.

## Safety boundaries

- **Read-only.** `data_collection/db_reader.py` opens every connection with
  `default_transaction_read_only=on` at the Postgres session level — not just
  by convention, but enforced by Postgres itself. Every query in this
  pipeline is a `SELECT`; there is no code path that can `INSERT`, `UPDATE`,
  or `DELETE`.
- **No secrets in the repo.** The database URL comes from the `DATABASE_URL`
  environment variable (the same one `src/backend` uses) or a local
  `analytics/.env`, which is gitignored. Point it at a read-only replica or a
  role with `SELECT`-only grants in any shared environment.
- **No PII in output.** Reports aggregate by `userid`; nothing here resolves
  a name or email. Charts and CSVs are written to `analytics/output/`, which
  is gitignored — nothing generated here is committed.

## Layout

| Path | Purpose |
| --- | --- |
| `data_collection/db_reader.py` | Read-only Postgres queries against `transactions`, `wallet`, `budget_categories` |
| `data_cleaning/preprocess.py` | Raw rows -> a monthly per-user spend series (pandas) |
| `analysis/spend_trends.py` | Moving average and month-over-month growth |
| `analysis/category_breakdown.py` | Spend share by `transactions.category` |
| `models/forecast.py` | Linear-regression forecast of next month's spend from trailing months |
| `visualization/charts.py` | Saves trend/category charts as PNGs |
| `run_pipeline.py` | Wires the above together for one user or all users |
| `tests/` | Unit tests against fixture data — no database required |
| `fixtures/sample_transactions.csv` | Synthetic data the tests and a `--fixture` pipeline run use |

## Running it

```bash
cd analytics
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

# Against the real database (read-only):
export DATABASE_URL=postgresql://user:pass@host:5432/digiwallsys
python run_pipeline.py --user-id 1

# Against the bundled fixture, no database needed:
python run_pipeline.py --fixture --user-id 1
```

Output lands in `analytics/output/<userid>/`: `monthly_spend.csv`,
`category_breakdown.csv`, `forecast.csv`, and two PNG charts.

## Tests

```bash
cd analytics
pip install -r requirements.txt
pytest
```

Tests exercise `data_cleaning`, `analysis`, and `models` against the fixture
CSV. There is no PostgreSQL integration test here — verifying
`data_collection/db_reader.py` against a real database has not been done in
this environment (no local PostgreSQL instance was available); the read-only
enforcement and query shape have been reviewed but not run against a live
server. Confirm that step yourself before relying on it.

## Requirements for the forecast

`models/forecast.py` fits a straight line through the trailing months and
needs at least 3 months of history for a meaningful slope; with fewer it
falls back to the plain average of the months available and flags the
forecast as low-confidence.
