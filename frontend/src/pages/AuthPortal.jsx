import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext.jsx";
import { LoginSuccessOverlay } from "../components/LoginSuccessOverlay.jsx";
import {
  loginRequest,
  registerRequest,
  setAccessToken,
} from "../api/authApi.js";

function AuthHeroIllustration() {
  return (
    <div className="auth-hero-scene" aria-hidden>
      <div className="auth-float auth-float--a" />
      <div className="auth-float auth-float--b" />
      <div className="auth-float auth-float--c" />
      <div className="auth-float auth-float--d" />

      <svg
        className="auth-explorer-svg"
        viewBox="0 0 400 440"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="authBeamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f5f5f5" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#e5e5e5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse cx="72" cy="118" rx="22" ry="12" fill="#2a2a2a" opacity="0.45" />
        <ellipse cx="310" cy="92" rx="18" ry="10" fill="#333" opacity="0.4" />
        <ellipse cx="260" cy="320" rx="26" ry="14" fill="#2a2a2a" opacity="0.35" />

        <path
          d="M168 88c-24 0-44 20-44 44v8c0 8 6 14 14 14h60c8 0 14-6 14-14v-8c0-24-20-44-44-44z"
          fill="#d4d4d4"
        />
        <path
          d="M124 154v120c0 12 10 22 22 22h44c12 0 22-10 22-22V154"
          stroke="#b8b8b8"
          strokeWidth="28"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M196 176c28 8 52 32 64 58"
          stroke="#a3a3a3"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="168" cy="108" r="6" fill="#1a1a1a" />

        <polygon
          className="auth-torch-beam"
          points="318,196 398,128 398,288 318,232"
          fill="url(#authBeamGrad)"
        />

        <path
          d="M248 200l52-18c6-2 12 2 14 8l4 14c2 6-2 12-8 14l-48 20"
          fill="#525252"
        />
        <rect x="286" y="188" width="36" height="52" rx="6" fill="#3a3a3a" />
        <rect x="292" y="194" width="24" height="10" rx="2" fill="#1a1a1a" />

        <g className="auth-torch-battery" transform="translate(294, 208)">
          <rect x="0" y="0" width="4" height="14" rx="1" className="auth-bat-seg" />
          <rect x="6" y="0" width="4" height="14" rx="1" className="auth-bat-seg" />
          <rect x="12" y="0" width="4" height="14" rx="1" className="auth-bat-seg" />
          <rect x="18" y="0" width="4" height="14" rx="1" className="auth-bat-seg" />
        </g>
      </svg>
    </div>
  );
}

export function AuthPortal() {
  const { signInSession } = useAuth();
  const [mode, setMode] = useState("login");
  const [formError, setFormError] = useState("");
  const [remember, setRemember] = useState(false);
  const [welcomeBanner, setWelcomeBanner] = useState(null);
  const pendingUserRef = useRef(null);

  const handleWelcomeDone = useCallback(() => {
    const user = pendingUserRef.current;
    pendingUserRef.current = null;
    if (user) signInSession(user);
    setWelcomeBanner(null);
  }, [signInSession]);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      const { user, accessToken } = data?.data ?? {};
      if (!accessToken || !user) {
        setFormError("Unexpected response from server");
        return;
      }
      setAccessToken(accessToken);
      pendingUserRef.current = user;
      setWelcomeBanner({ kind: "login", userName: user.name });
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.data?.detail ||
          err.message ||
          "Login failed"
      );
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      const { user, accessToken } = data?.data ?? {};
      if (!accessToken || !user) {
        setFormError("Unexpected response from server");
        return;
      }
      setAccessToken(accessToken);
      pendingUserRef.current = user;
      setWelcomeBanner({ kind: "register", userName: user.name });
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.data?.detail ||
          err.message ||
          "Registration failed"
      );
    },
  });

  const busy = loginMutation.isPending || registerMutation.isPending;

  function handleLogin(e) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.target);
    loginMutation.mutate({
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
    });
  }

  function handleRegister(e) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.target);
    registerMutation.mutate({
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
    });
  }

  return (
    <>
    <div className="auth-split-page">
      <div className="auth-split-card">
        <aside className="auth-hero">
          <div className="auth-hero-brand">
            <span className="auth-hero-logo" />
            stream-explorer
          </div>
          <AuthHeroIllustration />
        </aside>

        <div className="auth-panel">
          <header className="auth-panel__head">
            <h1 className="auth-panel__title">
              {mode === "login" ? "Welcome!" : "Join us"}
            </h1>
            <p className="auth-panel__lead">
              {mode === "login"
                ? "Sign in to continue exploring your watchlist."
                : "Create an account to save movies and lists."}
            </p>
          </header>

          <div className="auth-tabs auth-tabs--bw" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setFormError("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setFormError("");
              }}
            >
              Register
            </button>
          </div>

          {formError ? (
            <div className="auth-alert auth-alert--bw" role="alert">
              {formError}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="auth-form auth-form--bw" onSubmit={handleLogin}>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v12H4V6zm0 0l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                  placeholder="YOUR E-MAIL"
                />
              </label>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V8a4 4 0 018 0v2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  placeholder="YOUR PASSWORD"
                />
              </label>

              <div className="auth-form__row">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember my password</span>
                </label>
                <button type="button" className="auth-link-btn">
                  Forgot your password?
                </button>
              </div>

              <button type="submit" className="btn-login-bw" disabled={busy}>
                {busy ? "PLEASE WAIT…" : "LOGIN"}
              </button>
            </form>
          ) : (
            <form className="auth-form auth-form--bw" onSubmit={handleRegister}>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="9"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M6 19c0-4 3-6 6-6s6 2 6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  disabled={busy}
                  placeholder="YOUR NAME"
                />
              </label>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v12H4V6zm0 0l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                  placeholder="YOUR E-MAIL"
                />
              </label>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V8a4 4 0 018 0v2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={busy}
                  placeholder="YOUR PASSWORD (6+)"
                />
              </label>

              <button type="submit" className="btn-login-bw" disabled={busy}>
                {busy ? "PLEASE WAIT…" : "CREATE ACCOUNT"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>

    {welcomeBanner ? (
      <LoginSuccessOverlay
        kind={welcomeBanner.kind}
        userName={welcomeBanner.userName}
        onComplete={handleWelcomeDone}
      />
    ) : null}
    </>
  );
}
