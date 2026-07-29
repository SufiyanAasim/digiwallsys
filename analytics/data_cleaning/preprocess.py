"""Turns raw transaction rows into a monthly per-user spend series."""
import pandas as pd

UNCATEGORIZED = "Uncategorized"


def load_fixture(path):
    """Reads the bundled CSV fixture into the same shape db_reader.py returns."""
    frame = pd.read_csv(path, parse_dates=["timestamp"])
    frame["category"] = frame["category"].fillna(UNCATEGORIZED)
    return frame


def clean_transactions(frame):
    """Validates and normalizes a raw transactions frame.

    Drops rows with a non-positive amount or a missing timestamp (defensive --
    the database schema already enforces `amount > 0` and `timestamp NOT
    NULL`, but a fixture or a future query change should not silently corrupt
    the aggregates below it).
    """
    frame = frame.copy()
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    frame["category"] = frame["category"].fillna(UNCATEGORIZED)
    frame = frame[frame["amount"] > 0]
    frame = frame.dropna(subset=["timestamp", "userid"])
    return frame.reset_index(drop=True)


def monthly_spend(frame, user_id, currency="USD"):
    """Returns a Series indexed by month-start Timestamp, summed spend for one user.

    Months with no transactions are NOT filled in here -- callers that need a
    continuous series (the moving average, the forecast) do that explicitly,
    since "no data" and "spent zero" are different things worth keeping apart
    until a caller decides which one it means.
    """
    user_rows = frame[
        (frame["userid"] == user_id)
        & (frame["currency"].str.upper() == currency.upper())
    ]
    if user_rows.empty:
        return pd.Series(dtype="float64")
    monthly = user_rows.set_index("timestamp")["amount"].resample("MS").sum()
    return monthly[monthly.index.notna()]
