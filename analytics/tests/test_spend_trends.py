import os

import pandas as pd
import pytest

from analysis.spend_trends import month_over_month_growth, moving_average, summarize
from data_cleaning.preprocess import clean_transactions, load_fixture, monthly_spend

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "sample_transactions.csv")


@pytest.fixture
def user1_monthly():
    frame = clean_transactions(load_fixture(FIXTURE_PATH))
    return monthly_spend(frame, user_id=1)


def test_moving_average_first_month_equals_itself(user1_monthly):
    trend = moving_average(user1_monthly, window=3)
    assert trend.iloc[0] == pytest.approx(user1_monthly.iloc[0])


def test_moving_average_third_month_is_mean_of_first_three(user1_monthly):
    trend = moving_average(user1_monthly, window=3)
    expected = user1_monthly.iloc[0:3].mean()
    assert trend.iloc[2] == pytest.approx(expected)


def test_month_over_month_growth_first_month_is_nan(user1_monthly):
    growth = month_over_month_growth(user1_monthly)
    assert pd.isna(growth.iloc[0])


def test_month_over_month_growth_computes_percent_change(user1_monthly):
    growth = month_over_month_growth(user1_monthly)
    expected = (user1_monthly.iloc[1] / user1_monthly.iloc[0] - 1) * 100
    assert growth.iloc[1] == pytest.approx(expected)


def test_summarize_empty_series_returns_zeroed_stats():
    stats = summarize(pd.Series(dtype="float64"))
    assert stats["total_spend"] == 0.0
    assert stats["highest_month"] is None


def test_summarize_reports_total_and_highest_month(user1_monthly):
    stats = summarize(user1_monthly)
    assert stats["total_spend"] == pytest.approx(float(user1_monthly.sum()))
    assert stats["highest_month"] == user1_monthly.idxmax().strftime("%Y-%m")
