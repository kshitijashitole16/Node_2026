import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDb, disconnectDb } from "./config/db.js";
import movieRoutes from "./routes/movieRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env"), override: true });

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const envFile = path.join(backendRoot, `.env.${nodeEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

if (!process.env.SMTP_USER?.trim() || !process.env.SMTP_PASS?.trim()) {
  console.warn(
    "[email] SMTP_USER/SMTP_PASS missing. OTP emails will not be sent until SMTP is configured."
  );
}

const app = express();

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wildcardToRegex(pattern) {
  const normalized = normalizeOrigin(pattern);
  if (!normalized.includes("*")) return null;
  const regexPattern = normalized
    .split("*")
    .map(escapeRegex)
    .join(".*");
  return new RegExp(`^${regexPattern}$`);
}

function buildAllowedOrigins() {
  const defaults = ["http://localhost:5173"];
  const envValues = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ];

  return [...defaults, ...envValues]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalizeOrigin)
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();
const exactAllowedOrigins = new Set(
  allowedOrigins.filter((origin) => !origin.includes("*"))
);
const wildcardAllowedOrigins = allowedOrigins
  .map(wildcardToRegex)
  .filter(Boolean);

function isOriginAllowed(origin) {
  const requestOrigin = normalizeOrigin(origin);
  if (exactAllowedOrigins.has(requestOrigin)) return true;
  return wildcardAllowedOrigins.some((regex) => regex.test(requestOrigin));
}

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (curl/postman) without Origin header.
      if (!origin) return cb(null, true);

      if (isOriginAllowed(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${normalizeOrigin(origin)}`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (error) {
    console.error("Database initialization failed:", error?.message || error);
    return res.status(503).json({
      error:
        "Database is unavailable. Check DATABASE_URL/Neon status and run migrations.",
    });
  }
});

app.use("/movies", movieRoutes);
app.use("/auth", authRoutes);
app.use("/watchlist", watchlistRoutes);

const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  const port = Number(process.env.PORT) || 5001;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    server.close(async () => {
      await disconnectDb();
      process.exit(1);
    });
  });

  process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception:", err);
    await disconnectDb();
    process.exit(1);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  });
}

export default app;
