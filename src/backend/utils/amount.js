function parseAmount(value) {
  const normalized = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount <= 0) {
    return null;
  }

  return amount;
}

module.exports = parseAmount;
