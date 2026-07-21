CREATE TABLE IF NOT EXISTS users (
  userid INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordhash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet (
  walletid INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  userid INTEGER NOT NULL UNIQUE REFERENCES users(userid) ON DELETE CASCADE,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
  transactionid INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  senderwalletid INTEGER NOT NULL REFERENCES wallet(walletid),
  receiverwalletid INTEGER NOT NULL REFERENCES wallet(walletid),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  description VARCHAR(255) NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (senderwalletid <> receiverwalletid)
);

CREATE INDEX IF NOT EXISTS transactions_sender_timestamp_idx
  ON transactions (senderwalletid, timestamp DESC);

CREATE INDEX IF NOT EXISTS transactions_receiver_timestamp_idx
  ON transactions (receiverwalletid, timestamp DESC);
