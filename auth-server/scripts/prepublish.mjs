/**
 * Copies backend sources into this package so `npm publish` ships a self-contained tarball.
 * Run from repo root: (cd auth-server && node scripts/prepublish.mjs)
 */
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");
const backend = resolve(pkgRoot, "..", "backend");

if (!existsSync(resolve(backend, "src", "server.js"))) {
  console.error(
    "[auth-server] Expected ../backend/src/server.js — run this script from the monorepo (auth-server next to backend)."
  );
  process.exit(1);
}

await rm(resolve(pkgRoot, "src"), { recursive: true, force: true });
await rm(resolve(pkgRoot, "prisma"), { recursive: true, force: true });
await cp(resolve(backend, "src"), resolve(pkgRoot, "src"), { recursive: true });
await cp(resolve(backend, "prisma"), resolve(pkgRoot, "prisma"), { recursive: true });
await cp(resolve(backend, "prisma.config.ts"), resolve(pkgRoot, "prisma.config.ts"));
console.log("[auth-server] Synced ../backend → auth-server");
