import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaPkg from "@prisma/client";
import pg from "pg";

const { PrismaClient } = prismaPkg;

/**
 * Normalize DATABASE_URL: ssl + (for Neon) uselibpqcompat; strip channel_binding for libpq.
 */
function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.error(
      "DATABASE_URL is missing. Create backend/.env with:\n  DATABASE_URL=\"postgresql://USER:PASSWORD@HOST/DB?sslmode=require\""
    );
    process.exit(1);
  }

  try {
    const url = new URL(raw);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (url.hostname.includes("neon.tech")) {
      if (!url.searchParams.has("uselibpqcompat")) {
        url.searchParams.set("uselibpqcompat", "true");
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "30");
      }
    }
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    let out = raw;
    if (!/[?&]sslmode=/i.test(out)) {
      out = out.includes("?") ? `${out}&sslmode=require` : `${out}?sslmode=require`;
    }
    if (/neon\.tech/i.test(out)) {
      if (!/[?&]uselibpqcompat=/i.test(out)) {
        out = out.includes("?") ? `${out}&uselibpqcompat=true` : `${out}?uselibpqcompat=true`;
      }
      if (!/[?&]connect_timeout=/i.test(out)) {
        out = out.includes("?") ? `${out}&connect_timeout=30` : `${out}?connect_timeout=30`;
      }
    }
    out = out.replace(/[?&]channel_binding=[^&]*/gi, "");
    out = out.replace(/\?&+/g, "?").replace(/&&+/g, "&");
    if (out.endsWith("?") || out.endsWith("&")) {
      out = out.replace(/[?&]$/, "");
    }
    return out;
  }
}

const connectionString = resolveDatabaseUrl();

const poolOptions = { connectionString };
const poolMax = Number(process.env.PG_POOL_MAX);
if (Number.isFinite(poolMax) && poolMax > 0) {
  poolOptions.max = poolMax;
}
const connectionTimeoutMs = Number(process.env.PG_CONNECTION_TIMEOUT_MS);
if (Number.isFinite(connectionTimeoutMs) && connectionTimeoutMs > 0) {
  poolOptions.connectionTimeoutMillis = connectionTimeoutMs;
}

const pool = new pg.Pool(poolOptions);
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

const connectDb = async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connected via Prisma (query check OK)");
  } catch (error) {
    console.error("DB connection error:", error.message);
    const unreachable =
      error.code === "P1001" ||
      String(error.message).includes("Can't reach database");
    if (unreachable) {
      const hostMatch = process.env.DATABASE_URL?.match(/@([^/?]+)/);
      const host = hostMatch ? hostMatch[1] : "(unknown host)";
      console.error(`
Database unreachable (TCP to Postgres failed). This is a network / Neon issue, not Express.

Quick checks:
  1) From Neon dashboard: copy a NEW connection string (try "Direct" if Pooler fails).
  2) Wake the project: open https://console.neon.tech — idle branches suspend.
  3) Terminal test:  nc -vz ${host.split(":")[0]} 5432
  4) Turn off VPN / try phone hotspot — corporate Wi‑Fi often blocks 5432.
  5) .env lives in backend/ next to package.json; restart after edits.

Host from your URL: ${host}
`);
    }
    process.exit(1);
  }
};

const disconnectDb = async () => {
  await prisma.$disconnect();
  await pool.end();
};

export { prisma, connectDb, disconnectDb };
