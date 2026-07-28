"""A deliberately simple next-month spend forecast.

This is a straight-line fit over the trailing months, not a claim about how
someone will actually spend -- it exists to flag a rising trend early, the
same modest scope as queueless's analysis/linear_regression.py. With fewer
than MIN_MONTHS_FOR_TREND months of history there is not enough signal to fit
a trend, so the forecast falls back to the plain average and says so.
"""
import numpy as np
from sklearn.linear_model import LinearRegression

MIN_MONTHS_FOR_TREND = 3


def forecast_next_month(monthly_series):
    """Returns {"forecast": float, "method": "trend"|"average"|"none"}.

    `method` tells the caller how much to trust the number: "trend" is a
    fitted regression, "average" is a flat mean because there was too little
    history for a trend, "none" means there is no data at all.
    """
    if monthly_series.empty:
        return {"forecast": 0.0, "method": "none"}

    values = monthly_series.to_numpy(dtype="float64")
    if len(values) < MIN_MONTHS_FOR_TREND:
        return {"forecast": round(float(values.mean()), 2), "method": "average"}

    x = np.arange(len(values)).reshape(-1, 1)
    model = LinearRegression().fit(x, values)
    next_index = np.array([[len(values)]])
    prediction = model.predict(next_index)[0]
    # Spend cannot be negative; a steep downward trend on a short series can
    # otherwise extrapolate below zero, which is not a meaningful forecast.
    return {"forecast": round(max(float(prediction), 0.0), 2), "method": "trend"}
