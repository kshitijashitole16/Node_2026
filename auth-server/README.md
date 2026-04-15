# @kshitijashitole/auth-server

Express + Prisma API from this monorepo’s `backend` app: `/auth`, `/analytics`, `/secure-auth`.

## Install

```bash
npm install @kshitijashitole/auth-server
```

Requires PostgreSQL. Copy `.env` with `DATABASE_URL` next to `prisma.config.ts` (project / package root), then generate the client:

```bash
npm run db:generate
```

(`postinstall` does not run `prisma generate`, so installs work without a database URL; CI and first-time setup should run `db:generate` explicitly.)

## Environment

- `DATABASE_URL` — PostgreSQL connection string  
- `JWT_ACCESS_SECRET` or `JWT_SECRET` — access tokens  
- `JWT_REFRESH_SECRET` — if your token helpers expect it (see `src/utils/generateToken.js`)  
- `SMTP_*` / `SMTP_USER` / `SMTP_PASS` — for OTP email  
- `FRONTEND_URL` / `CORS_ORIGINS` — browser clients  
- **Admin analytics lists** (recommended for production):  
  - `FAST_AUTH_ADMIN_SECRET` — send `x-admin-token: <secret>` (or `Authorization: Bearer <secret>`) for `GET /analytics/auth/events` and `GET /analytics/auth/users`  
  - `FAST_AUTH_ADMIN_EMAILS` — comma-separated emails allowed to call those endpoints with a normal user JWT  

## Use in your own Express app

```js
import express from "express";
import authServerApp from "@kshitijashitole/auth-server";

const app = express();
app.use("/api", authServerApp); // APIs live under /api/auth, /api/analytics, …
app.listen(3000);
```

Paths are absolute on the mounted app (`/auth`, not `/api/auth`), so mount at `/` or use a gateway that strips the prefix — Express sub-app mounting may still expose routes at `/auth` relative to the child app. Test with `app.use(authServerApp)` at root or adjust your reverse proxy.

## Run standalone

From the package root (after `DATABASE_URL` is set):

```bash
npm start
```

## Checklist (local or production)

1. `.env` with `DATABASE_URL` (see `.env.example`).
2. `npm install` then `npm run db:generate`.
3. Apply schema: `npx prisma migrate deploy` (or `db:migrate` in dev).
4. Set JWT, SMTP, CORS, and optionally `FAST_AUTH_ADMIN_SECRET` / `FAST_AUTH_ADMIN_EMAILS`.
5. `npm start` or mount the exported app in your host.

## Publishing (maintainers)

Canonical code lives in `../backend`. From this folder:

```bash
npm install
npm run db:generate   # needs DATABASE_URL in .env
npm publish --access public
```

`prepublishOnly` runs `sync` from `../backend` then `prisma generate`. Ensure `backend` is a sibling of `auth-server`.
