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

const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/movies", movieRoutes);
app.use("/auth", authRoutes);
app.use("/watchlist", watchlistRoutes);

await connectDb();

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
