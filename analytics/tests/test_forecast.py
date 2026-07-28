import pandas as pd
import pytest

from models.forecast import forecast_next_month


def test_forecast_empty_series_returns_none_method():
    result = forecast_next_month(pd.Series(dtype="float64"))
    assert result == {"forecast": 0.0, "method": "none"}


def test_forecast_falls_back_to_average_with_too_little_history():
    series = pd.Series([100.0, 120.0])
    result = forecast_next_month(series)
    assert result["method"] == "average"
    assert result["forecast"] == pytest.approx(110.0)


def test_forecast_fits_a_trend_with_enough_history():
    # Perfectly linear: +10 each month. The next value should be 140.
    series = pd.Series([100.0, 110.0, 120.0, 130.0])
    result = forecast_next_month(series)
    assert result["method"] == "trend"
    assert result["forecast"] == pytest.approx(140.0, abs=0.5)


def test_forecast_never_goes_negative_on_a_steep_decline():
    series = pd.Series([300.0, 100.0, 10.0])
    result = forecast_next_month(series)
    assert result["forecast"] >= 0.0
