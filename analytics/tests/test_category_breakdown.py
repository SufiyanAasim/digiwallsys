import os

import pandas as pd
import pytest

from analysis.category_breakdown import category_breakdown
from data_cleaning.preprocess import clean_transactions, load_fixture

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_transactions.csv")


@pytest.fixture
def cleaned_frame():
    return clean_transactions(load_fixture(FIXTURE_PATH))


def test_category_breakdown_shares_sum_to_100(cleaned_frame):
    breakdown = category_breakdown(cleaned_frame, user_id=1)
    assert breakdown["share_pct"].sum() == pytest.approx(100.0, abs=0.2)


def test_category_breakdown_sorted_highest_first(cleaned_frame):
    breakdown = category_breakdown(cleaned_frame, user_id=1)
    totals = breakdown["total"].tolist()
    assert totals == sorted(totals, reverse=True)


def test_category_breakdown_includes_uncategorized(cleaned_frame):
    breakdown = category_breakdown(cleaned_frame, user_id=1)
    assert "Uncategorized" in breakdown["category"].values


def test_category_breakdown_empty_for_unknown_user(cleaned_frame):
    breakdown = category_breakdown(cleaned_frame, user_id=9999)
    assert breakdown.empty


def test_category_breakdown_never_combines_currencies(cleaned_frame):
    expected = category_breakdown(cleaned_frame, 1, "USD")["total"].sum()
    extra = cleaned_frame.iloc[[0]].copy()
    extra["currency"] = "EUR"
    extra["amount"] = 9999
    mixed = pd.concat([cleaned_frame, extra], ignore_index=True)
    assert category_breakdown(mixed, 1, "USD")["total"].sum() == pytest.approx(expected)
