import jwt from "jsonwebtoken";

export function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) {
    throw new Error(
      "JWT_SECRET is missing. Add it to backend/.env (e.g. JWT_SECRET=your_long_random_string)"
    );
  }

  const expiresIn = process.env.JWT_EXPIRES_IN?.trim() || "7d";

  return jwt.sign({ id: userId }, secret, { expiresIn });
}
