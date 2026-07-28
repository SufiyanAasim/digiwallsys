"""Spend share by category for one user."""


def category_breakdown(frame, user_id):
    """Returns a DataFrame with total and share-of-spend per category,
    sorted highest spend first. Empty if the user has no transactions.
    """
    user_rows = frame[frame["userid"] == user_id]
    if user_rows.empty:
        return user_rows.assign(total=[], share_pct=[])[["category", "total", "share_pct"]]

    totals = user_rows.groupby("category")["amount"].sum().sort_values(ascending=False)
    grand_total = totals.sum()
    result = totals.reset_index()
    result.columns = ["category", "total"]
    result["share_pct"] = (result["total"] / grand_total * 100).round(1)
    result["total"] = result["total"].round(2)
    return result
