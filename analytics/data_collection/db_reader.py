"""Read-only access to the digiwallsys PostgreSQL database.

Every function here issues a single SELECT. The connection itself is opened
read-only at the Postgres session level (`default_transaction_read_only=on`),
so a bug in a query here cannot mutate data even if it tried to -- Postgres
rejects the write at the server, not by trusting this code to behave.
"""
import os

import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

TRANSACTIONS_QUERY = """
    SELECT
        t.transactionid,
        COALESCE(t.spender_userid, sw.userid) AS userid,
        t.amount,
        t.category,
        t.timestamp,
        sw.currency
    FROM transactions t
    JOIN wallet sw ON sw.walletid = t.senderwalletid
    WHERE (%(user_id)s IS NULL OR COALESCE(t.spender_userid, sw.userid) = %(user_id)s)
      AND sw.currency = %(currency)s
    ORDER BY t.timestamp
"""


def get_connection(database_url=None):
    """Opens a connection that Postgres itself will refuse to write through."""
    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Export it or add analytics/.env -- see analytics/README.md."
        )
    conn = psycopg2.connect(url)
    with conn.cursor() as cur:
        cur.execute("SET default_transaction_read_only = on")
    conn.commit()
    return conn


def fetch_transactions(user_id=None, currency="USD", database_url=None):
    """Returns every spend transaction as a DataFrame, optionally for one user.

    A "spend" here is any row from the sender's side: `senderwalletid` always
    identifies the wallet money left, and `spender_userid` (falling back to
    that wallet's owner for pre-Estuary rows) identifies who actually
    initiated it, which is what matters for a shared wallet.
    """
    conn = get_connection(database_url)
    try:
        return pd.read_sql(
            TRANSACTIONS_QUERY,
            conn,
            params={"user_id": user_id, "currency": currency.upper()},
        )
    finally:
        conn.close()
