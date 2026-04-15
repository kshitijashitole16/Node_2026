# @kshitijashitole/auth-sdk

Lightweight React components and a small API client for email/password auth, OTP registration, password reset, and an optional in-app dashboard (analytics, auth event logs, user list).

## Install

```bash
npm install @kshitijashitole/auth-sdk
```

Peer dependency: `react` >= 18.

## Backend

This SDK talks to the HTTP API under `/auth` and `/analytics` (see the `backend` app in this repo). Hosts must:

- Set `DATABASE_URL` and run Prisma migrations (same schema as this project’s `backend/prisma`).
- Configure JWT (`JWT_ACCESS_SECRET` or `JWT_SECRET`), SMTP for OTP emails, and CORS (`FRONTEND_URL` / `CORS_ORIGINS`).

Mount the backend app (or equivalent routes) so your frontend’s `apiUrl` points at the same origin you allow in CORS, with `credentials` enabled if you use cookies.

## Quick usage

Wrap your app with `AuthProvider` and import the CSS used by the modals and dashboard:

```tsx
import { AuthProvider, PasswordLoginModal, AuthDashboard } from "@kshitijashitole/auth-sdk";
import "@kshitijashitole/auth-sdk/dist/components/login-modal.css";
import "@kshitijashitole/auth-sdk/dist/components/dashboard.css";

export function App() {
  return (
    <AuthProvider apiUrl={import.meta.env.VITE_AUTH_API_URL} appName="My App">
      <AuthDashboard />
    </AuthProvider>
  );
}
```

- **Login:** `PasswordLoginModal` (or deprecated alias `LoginModal`) — `POST /auth/login`.
- **Register:** `RegisterModal` — `POST /auth/send-otp` + `POST /auth/verify-otp` with `RegisterAuthOtp`.
- **Forgot password:** `ForgotPasswordModal` — unified OTP + `POST /auth/forgot-password/reset`.
- **Dashboard:** `AuthDashboard` — overview uses `GET /analytics/auth` (JWT). **Users** and **API logs** tabs call `GET /analytics/auth/users` and `GET /analytics/auth/events`, which require **admin** access on the server (see below).

Pass an admin token from the client if you use `FAST_AUTH_ADMIN_SECRET` on the API:

```tsx
<AuthProvider
  apiUrl={import.meta.env.VITE_AUTH_API_URL}
  appName="My App"
  config={{ analyticsAdminToken: import.meta.env.VITE_AUTH_ADMIN_TOKEN }}
>
```

## Prisma Studio

To inspect raw tables locally, run `npx prisma studio` from the backend or `auth-server` package. The dashboard complements Studio with auth-focused views inside your product UI.

## Security note

On the server, configure **`FAST_AUTH_ADMIN_EMAILS`** (comma-separated) and/or **`FAST_AUTH_ADMIN_SECRET`** for listing users and raw auth events. Without them, those two endpoints respond with **503**. Aggregated analytics (`GET /analytics/auth`) still require a normal authenticated user.
