
# @fastAuth/auth-sdk

Lightweight OTP authentication SDK for React applications.

## Installation

```bash
npm install @fastAuth/auth-sdk
```

## Basic Usage

```tsx
import React from "react";
import { AuthProvider, useAuthContext, LoginModal } from "@fastAuth/auth-sdk";
import "@fastAuth/auth-sdk/dist/components/login-modal.css";

function App() {
  return (
    <AuthProvider
      apiUrl="https://api.example.com"
      appName="Authify"
      logo="https://cdn.example.com/logo.svg"
      primaryColor="#4f46e5"
      autoRefreshOnLoad
    >
      <LoginPage />
    </AuthProvider>
  );
}

function LoginPage() {
  const [open, setOpen] = React.useState(false);
  const { user, isAuthenticated, logout } = useAuthContext();

  return (
    <div>
      {!isAuthenticated ? (
        <>
          <button onClick={() => setOpen(true)}>Login</button>
          <LoginModal open={open} onClose={() => setOpen(false)} />
        </>
      ) : (
        <>
          <p>Logged in as {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

## API Reference

### `AuthProvider`

Required props:
- `apiUrl: string` - backend base URL
- `appName: string` - displayed in auth UI

Optional props:
- `logo?: string`
- `primaryColor?: string`
- `autoRefreshOnLoad?: boolean` (default: `true`)
- `config?: { withCredentials?: boolean; getAccessToken?: () => string | null }`

### `useAuthContext()`

Returns:
- `user`
- `isAuthenticated`
- `isLoading`
- `loadingAction`
- `error`
- `loginWithOtp(input)`
- `verifyOtp(input)`
- `getCurrentUser()`
- `logout()`
- `clearError()`

### OTP input payloads

`loginWithOtp(input)`:
- `email?: string`
- `phone?: string`
- `purpose?: "Authify_Register_user" | "Authify_Forgot_password" | "RegisterAuthOtp" | "ForgotAuthOtp"`
- `name?: string`
- `password?: string`

`verifyOtp(input)`:
- `code: string`
- `email?: string`
- `phone?: string`
- `purpose?: "Authify_Register_user" | "Authify_Forgot_password" | "RegisterAuthOtp" | "ForgotAuthOtp"`

## Backend Endpoints Required

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/refresh-token`
- `GET /auth/get-current-user`
- `POST /auth/logout`

## Notes

- Designed for app integration only (no dashboard code included).
- Uses native `fetch` and minimal dependencies.
