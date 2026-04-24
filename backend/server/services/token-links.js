import crypto from "crypto";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken || "")).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildExpirationDate(minutesFromNow) {
  const totalMinutes = Number(minutesFromNow);
  const safeMinutes = Number.isFinite(totalMinutes) && totalMinutes > 0 ? totalMinutes : 30;
  return new Date(Date.now() + safeMinutes * 60 * 1000);
}

export function createHashedToken(minutesFromNow = 30) {
  const token = generateRawToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: buildExpirationDate(minutesFromNow),
  };
}

export function hashRawToken(token) {
  return hashToken(token);
}
