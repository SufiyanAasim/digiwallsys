import os

import pandas as pd
import pytest

from data_cleaning.preprocess import clean_transactions, load_fixture, monthly_spend

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_transactions.csv")


@pytest.fixture
def raw_frame():
    return load_fixture(FIXTURE_PATH)


def test_load_fixture_fills_missing_category(raw_frame):
    assert (raw_frame["category"] == "Uncategorized").sum() == 1


def test_clean_transactions_drops_non_positive_amounts(raw_frame):
    dirty = pd.concat(
        [raw_frame, pd.DataFrame([{"transactionid": 999, "userid": 1, "amount": -5, "category": "Bills", "timestamp": pd.Timestamp("2026-01-01", tz="UTC"), "currency": "USD"}])],
        ignore_index=True,
    )
    cleaned = clean_transactions(dirty)
    assert (cleaned["amount"] > 0).all()
    assert 999 not in cleaned["transactionid"].values


def test_monthly_spend_sums_by_month_for_one_user(raw_frame):
    cleaned = clean_transactions(raw_frame)
    monthly = monthly_spend(cleaned, user_id=1)
    assert len(monthly) == 6  # Jan through Jun in the fixture
    january = monthly[monthly.index == pd.Timestamp("2026-01-01", tz="UTC")].iloc[0]
    assert january == pytest.approx(120.50 + 45.00 + 300.00)


def test_monthly_spend_is_empty_for_unknown_user(raw_frame):
    cleaned = clean_transactions(raw_frame)
    monthly = monthly_spend(cleaned, user_id=9999)
    assert monthly.empty
