#!/usr/bin/env python
"""Runs the analytics pipeline for one user and writes a report to
analytics/output/<user-id>/. See analytics/README.md before running this
against a real database.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from analysis.category_breakdown import category_breakdown  # noqa: E402
from analysis.spend_trends import moving_average, summarize  # noqa: E402
from data_cleaning.preprocess import clean_transactions, load_fixture, monthly_spend  # noqa: E402
from models.forecast import forecast_next_month  # noqa: E402
from visualization.charts import save_category_breakdown_chart, save_monthly_spend_chart  # noqa: E402

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "sample_transactions.csv")


def load_data(use_fixture, user_id, currency):
    if use_fixture:
        return load_fixture(FIXTURE_PATH)
    # Imported lazily: importing psycopg2 at module load would make the
    # --fixture path (and the test suite) require a Postgres driver it never
    # actually uses.
    from data_collection.db_reader import fetch_transactions

    return fetch_transactions(user_id=user_id, currency=currency)


def run(user_id, use_fixture=False, output_dir=None, currency="USD"):
    currency = currency.upper()
    raw = load_data(use_fixture, user_id, currency)
    frame = clean_transactions(raw)

    monthly = monthly_spend(frame, user_id, currency)
    trend = moving_average(monthly)
    breakdown = category_breakdown(frame, user_id, currency)
    forecast = forecast_next_month(monthly)
    stats = summarize(monthly)

    out_dir = output_dir or os.path.join(os.path.dirname(__file__), "output", str(user_id))
    os.makedirs(out_dir, exist_ok=True)

    monthly.rename("amount").to_csv(os.path.join(out_dir, "monthly_spend.csv"))
    breakdown.to_csv(os.path.join(out_dir, "category_breakdown.csv"), index=False)
    with open(os.path.join(out_dir, "forecast.csv"), "w") as handle:
        handle.write("metric,value\n")
        for key, value in {**stats, **{f"forecast_{k}": v for k, v in forecast.items()}}.items():
            handle.write(f"{key},{value}\n")

    save_monthly_spend_chart(monthly, trend, os.path.join(out_dir, "monthly_spend.png"))
    save_category_breakdown_chart(breakdown, os.path.join(out_dir, "category_breakdown.png"))

    print(f"User {user_id} ({currency}): {stats}")
    print(f"Next-month forecast: {forecast}")
    print(f"Report written to {out_dir}")
    return {"stats": stats, "forecast": forecast, "output_dir": out_dir}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", type=int, required=True, help="digiwallsys users.userid to report on")
    parser.add_argument("--fixture", action="store_true", help="Use the bundled sample data instead of a live database")
    parser.add_argument("--output-dir", help="Override the default analytics/output/<user-id> directory")
    parser.add_argument(
        "--currency",
        default=os.environ.get("ANALYTICS_CURRENCY", "USD"),
        type=lambda value: value.upper(),
        choices=["USD", "EUR", "GBP", "PKR", "AED", "CAD", "AUD", "JPY"],
        help="Report one wallet currency; currencies are never summed together",
    )
    args = parser.parse_args()
    run(args.user_id, use_fixture=args.fixture, output_dir=args.output_dir, currency=args.currency)


if __name__ == "__main__":
    main()
