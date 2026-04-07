import { verifyAccessToken } from "../services/secureAuthService.js";

export async function secureAuthMiddleware(req, res, next) {
  // Allow CORS preflight without bearer token.
  if (req.method === "OPTIONS") {
    return next();
  }

  const auth = String(req.headers.authorization || "");
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({
      status: "error",
      code: "UNAUTHORIZED",
      message: "Authorization bearer token required",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({
      status: "error",
      code: "INVALID_ACCESS_TOKEN",
      message: "Invalid or expired access token",
    });
  }
}
