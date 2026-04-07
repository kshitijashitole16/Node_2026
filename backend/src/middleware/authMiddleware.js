import jwt from "jsonwebtoken";

import { prisma } from "../config/db.js";
//read the token from the request
//check if token is valid or not
export const authMiddleware = async (req, res, next) => {
  // CORS preflight should never require auth.
  if (req.method === "OPTIONS") {
    return next();
  }

  let token;
  const authorization = req.headers.authorization;
  if (authorization) {
    const [scheme, credentials] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && credentials) {
      token = credentials;
    }
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized token" });
  }

  const accessSecret =
    process.env.JWT_ACCESS_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!accessSecret) {
    return res.status(500).json({ error: "Server JWT configuration error" });
  }

  try {
    const decoded = jwt.verify(token, accessSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email to use this resource.",
        needsEmailVerification: true,
        email: user.email,
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Not authorized, token failed" });
  }
};
