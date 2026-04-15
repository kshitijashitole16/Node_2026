import { authMiddleware } from "./authMiddleware.js";

function parseBearer(authorization) {
  if (!authorization || typeof authorization !== "string") return "";
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function parseAdminEmails() {
  const raw = process.env.FAST_AUTH_ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Protects sensitive analytics list endpoints (user table, raw auth events).
 *
 * Access is allowed if either:
 * - `FAST_AUTH_ADMIN_SECRET` matches `x-admin-token` header or `Authorization: Bearer <secret>`, or
 * - JWT identifies a user whose email is listed in `FAST_AUTH_ADMIN_EMAILS` (comma-separated).
 *
 * If neither env var is set, returns 503 until configured (production-safe default).
 */
export function requireAnalyticsListAccess(req, res, next) {
  const secret = process.env.FAST_AUTH_ADMIN_SECRET?.trim();
  const fromHeader = String(req.headers["x-admin-token"] ?? "").trim();
  const fromBearer = parseBearer(req.headers.authorization);
  const provided = fromHeader || fromBearer;

  if (secret && provided === secret) {
    return next();
  }

  const allowlist = parseAdminEmails();

  if (!secret && allowlist.length === 0) {
    return res.status(503).json({
      error:
        "Analytics user/event listings are disabled. Set FAST_AUTH_ADMIN_SECRET and/or FAST_AUTH_ADMIN_EMAILS on the server.",
    });
  }

  return authMiddleware(req, res, () => {
    const userEmail = req.user?.email?.toLowerCase();
    if (allowlist.length && userEmail && allowlist.includes(userEmail)) {
      return next();
    }
    return res.status(403).json({
      error:
        "Forbidden: admin access required for user and event listings. Use an allowlisted email or provide x-admin-token.",
    });
  });
}
