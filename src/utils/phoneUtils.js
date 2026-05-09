function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;

  let clean = phone.replace(/[\s\-\(\)]/g, "");

  // Already correct: +998XXXXXXXXX (13 chars)
  if (/^\+998\d{9}$/.test(clean)) return clean;

  // 998XXXXXXXXX (12 chars, missing +)
  if (/^998\d{9}$/.test(clean)) return "+" + clean;

  // 0XXXXXXXXX (10 chars, leading 0)
  if (/^0\d{9}$/.test(clean)) return "+998" + clean.slice(1);

  // XXXXXXXXX (9 digits only, e.g. 901234567)
  if (/^\d{9}$/.test(clean)) return "+998" + clean;

  return null;
}

function isValidPhone(phone) {
  return normalizePhone(phone) !== null;
}

module.exports = { normalizePhone, isValidPhone };
