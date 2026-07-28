"""Trend statistics over a monthly spend series."""
import pandas as pd


def moving_average(monthly_series, window=3):
    """Trailing moving average, minimum one period so the first month is not NaN."""
    if monthly_series.empty:
        return monthly_series
    return monthly_series.rolling(window=window, min_periods=1).mean()


def month_over_month_growth(monthly_series):
    """Percent change from the previous month; the first month has no prior
    month to compare against, so it is NaN rather than 0 -- 0% growth would
    misleadingly claim "no change" when there is simply no baseline yet.
    """
    if monthly_series.empty:
        return monthly_series
    return monthly_series.pct_change() * 100


def summarize(monthly_series):
    """A small dict of headline numbers for a report -- total, average,
    highest month, and the most recent month's growth versus the one before it.
    """
    if monthly_series.empty:
        return {
            "total_spend": 0.0,
            "average_monthly_spend": 0.0,
            "highest_month": None,
            "highest_month_amount": 0.0,
            "latest_month_growth_pct": None,
        }
    growth = month_over_month_growth(monthly_series)
    latest_growth = growth.iloc[-1]
    return {
        "total_spend": round(float(monthly_series.sum()), 2),
        "average_monthly_spend": round(float(monthly_series.mean()), 2),
        "highest_month": monthly_series.idxmax().strftime("%Y-%m"),
        "highest_month_amount": round(float(monthly_series.max()), 2),
        "latest_month_growth_pct": None if pd.isna(latest_growth) else round(float(latest_growth), 1),
    }
