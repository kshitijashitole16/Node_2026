import jwt from "jsonwebtoken";

import { prisma } from "../config/db.js";
//read the token from the request
//check if token is valid or not
export const authMiddleware = async (req, res, next) => {
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Not authorized, token failed" });
  }
};
