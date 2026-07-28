"""Saves report charts as PNGs. Matplotlib only -- no display backend needed,
since this runs from the command line, not a notebook.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402 (backend must be set first)

# Ember Glass palette, matching src/mobile/theme.js, so a report looks like
# it belongs to the same product if anyone screenshots it into a deck.
ROSE = "#FF5470"
AMBER = "#FFA45B"
INK = "#1A0A0E"


def save_monthly_spend_chart(monthly_series, moving_avg_series, output_path):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    if not monthly_series.empty:
        # A fixed day-count width (20 days) rather than a fraction of the
        # x-axis range: with datetime x-values matplotlib's default bar width
        # is 0.8 in *days*, which renders as a hairline over a multi-month span.
        ax.bar(monthly_series.index, monthly_series.values, width=20, color=ROSE, alpha=0.85, label="Monthly spend")
        ax.plot(moving_avg_series.index, moving_avg_series.values, color=AMBER, linewidth=2.5, marker="o", label="Moving average")
    ax.set_title("Monthly spend", color=INK, fontweight="bold")
    ax.set_ylabel("Amount")
    ax.legend()
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def save_category_breakdown_chart(breakdown, output_path):
    fig, ax = plt.subplots(figsize=(6, 6))
    if not breakdown.empty:
        colors = [ROSE, AMBER, "#B7A9AE", "#8C7F84", "#713B49", "#C6533C"]
        ax.pie(
            breakdown["total"],
            labels=breakdown["category"],
            autopct="%1.0f%%",
            colors=(colors * (len(breakdown) // len(colors) + 1))[: len(breakdown)],
        )
    ax.set_title("Spend by category", color=INK, fontweight="bold")
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
