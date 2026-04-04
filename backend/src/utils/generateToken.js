import jwt from "jsonwebtoken";

function getAccessSecret() {
  const s =
    process.env.JWT_ACCESS_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!s) {
    throw new Error(
      "JWT_ACCESS_SECRET (or JWT_SECRET) is missing. Add it to backend/.env"
    );
  }
  return s;
}

function getRefreshSecret() {
  const s =
    process.env.JWT_REFRESH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!s) {
    throw new Error(
      "JWT_REFRESH_SECRET (or JWT_SECRET) is missing. Add it to backend/.env"
    );
  }
  return s;
}

function parseExpiresToMs(exp) {
  if (!exp || typeof exp !== "string") return null;
  const m = exp.trim().match(/^(\d+)([dhms])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const mult = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return n * (mult[m[2].toLowerCase()] ?? 0);
}

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
});

const cookieClearOpts = () => ({
  ...cookieBase(),
  path: "/",
});

/** Drop auth cookies (access cookie legacy + refresh). */
export function clearAuthCookies(res) {
  const opts = cookieClearOpts();
  res.clearCookie("jwt", opts);
  res.clearCookie("refreshToken", opts);
}

/**
 * Login / register: set httpOnly refresh cookie, return access JWT for Authorization header.
 */
export function issueTokens(userId, res) {
  const accessSecret = getAccessSecret();
  const refreshSecret = getRefreshSecret();
  const accessExpiresIn =
    process.env.ACCESS_TOKEN_EXPIRES_IN?.trim() || "15m";
  const refreshExpiresIn =
    process.env.REFRESH_TOKEN_EXPIRES_IN?.trim() || "7d";

  const accessToken = jwt.sign({ id: userId }, accessSecret, {
    expiresIn: accessExpiresIn,
  });
  const refreshToken = jwt.sign({ id: userId }, refreshSecret, {
    expiresIn: refreshExpiresIn,
  });

  const maxAge =
    parseExpiresToMs(refreshExpiresIn) ?? 7 * 24 * 60 * 60 * 1000;

  res.cookie("refreshToken", refreshToken, {
    ...cookieBase(),
    maxAge,
    path: "/",
  });

  return accessToken;
}

/**
 * Verify refresh JWT and mint a new access token.
 * If the token is missing, invalid, expired, or wrong secret, clears auth cookies on `res` (immediate server-side logout).
 */
export function createAccessTokenFromRefreshToken(refreshToken, res) {
  if (!refreshToken?.trim()) {
    if (res) clearAuthCookies(res);
    return null;
  }

  const accessSecret = getAccessSecret();
  const refreshSecret = getRefreshSecret();
  const accessExpiresIn =
    process.env.ACCESS_TOKEN_EXPIRES_IN?.trim() || "15m";

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, refreshSecret);
  } catch {
    if (res) clearAuthCookies(res);
    return null;
  }

  if (!decoded?.id) {
    if (res) clearAuthCookies(res);
    return null;
  }

  return jwt.sign({ id: decoded.id }, accessSecret, {
    expiresIn: accessExpiresIn,
  });
}
