import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext.jsx";
import { LoginSuccessOverlay } from "../components/LoginSuccessOverlay.jsx";
import {
  forgotPasswordRequestOtp,
  forgotPasswordReset,
  forgotPasswordVerifyOtp,
  loginRequest,
  registerRequest,
  resendVerificationRequest,
  setAccessToken,
  verifyEmailRequest,
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

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function formatOtpSeconds(totalSeconds) {
  const clamped = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function AuthPortal() {
  const { signInSession } = useAuth();
  const [mode, setMode] = useState("login");
  const [theme, setTheme] = useState("light");
  const [formError, setFormError] = useState("");
  const [remember, setRemember] = useState(false);
  const [welcomeBanner, setWelcomeBanner] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState(null);
  const [verificationInfo, setVerificationInfo] = useState("");
  const [flowInfo, setFlowInfo] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [forgotStep, setForgotStep] = useState(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotNewPasswordTouched, setForgotNewPasswordTouched] = useState(false);
  const [forgotConfirmPasswordTouched, setForgotConfirmPasswordTouched] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const pendingUserRef = useRef(null);

  const forgotNewPasswordTooShort =
    forgotNewPassword.length > 0 && forgotNewPassword.length < 6;
  const forgotConfirmPasswordTooShort =
    forgotConfirmPassword.length > 0 && forgotConfirmPassword.length < 6;
  const forgotPasswordsMatch =
    forgotNewPassword.length >= 6 &&
    forgotConfirmPassword.length >= 6 &&
    forgotNewPassword === forgotConfirmPassword;
  const forgotPasswordMismatch =
    forgotConfirmPassword.length > 0 && forgotNewPassword !== forgotConfirmPassword;

  const forgotShowNewPasswordError =
    forgotNewPasswordTouched && forgotNewPasswordTooShort;
  const forgotShowConfirmPasswordError =
    forgotConfirmPasswordTouched &&
    (forgotConfirmPasswordTooShort || forgotPasswordMismatch);
  const forgotOtpExpired = forgotOtpTimer <= 0;
  const forgotOtpTimeLabel = formatOtpSeconds(forgotOtpTimer);

  const handleWelcomeDone = useCallback(() => {
    const user = pendingUserRef.current;
    pendingUserRef.current = null;
    if (user) signInSession(user);
    setWelcomeBanner(null);
  }, [signInSession]);

  useEffect(() => {
    if (forgotOtpTimer <= 0) return undefined;
    const id = setInterval(() => {
      setForgotOtpTimer((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [forgotOtpTimer]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("auth-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  const closeForgotFlow = useCallback(() => {
    setForgotStep(null);
    setForgotEmail("");
    setForgotOtp("");
    setForgotOtpTimer(0);
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotNewPasswordTouched(false);
    setForgotConfirmPasswordTouched(false);
    setFlowInfo("");
    setFormError("");
  }, []);

  const startForgotFlow = useCallback(() => {
    setVerificationEmail(null);
    setVerificationInfo("");
    setOtpCode("");
    setMode("login");
    setForgotStep("email");
    setForgotEmail("");
    setForgotOtp("");
    setForgotOtpTimer(0);
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotNewPasswordTouched(false);
    setForgotConfirmPasswordTouched(false);
    setFlowInfo("");
    setFormError("");
  }, []);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      const { user, accessToken } = data?.data ?? {};
      if (!accessToken || !user) {
        setFormError("Unexpected response from server");
        return;
      }
      setFlowInfo("");
      setAccessToken(accessToken);
      pendingUserRef.current = user;
      setWelcomeBanner({ kind: "login", userName: user.name });
    },
    onError: (err) => {
      if (
        err.status === 403 &&
        err.data?.needsEmailVerification &&
        err.data?.email
      ) {
        setFormError("");
        setFlowInfo("");
        setForgotStep(null);
        setVerificationEmail(String(err.data.email));
        setOtpCode("");
        setVerificationInfo(
          "Verify your email to sign in. Enter the code we sent, or use resend below."
        );
        return;
      }
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
      const d = data?.data ?? {};
      if (d.needsEmailVerification && d.email) {
        setFormError("");
        setFlowInfo("");
        setForgotStep(null);
        setVerificationEmail(String(d.email));
        setOtpCode("");
        setVerificationInfo(
          typeof d.message === "string"
            ? d.message
            : "Enter the 6-digit code we sent to your email."
        );
        return;
      }
      const { user, accessToken } = d;
      if (!accessToken || !user) {
        setFormError("Unexpected response from server");
        return;
      }
      setFlowInfo("");
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

  const verifyMutation = useMutation({
    mutationFn: verifyEmailRequest,
    onSuccess: (data) => {
      const { user, accessToken } = data?.data ?? {};
      if (!accessToken || !user) {
        setFormError("Unexpected response from server");
        return;
      }
      setVerificationEmail(null);
      setVerificationInfo("");
      setOtpCode("");
      setFlowInfo("");
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
          "Verification failed"
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationRequest,
    onSuccess: (data) => {
      setFormError("");
      setFlowInfo("");
      setVerificationInfo(
        data?.message ||
          "If an account exists, a new code was sent (or printed in server logs in dev)."
      );
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.message ||
          "Could not resend code"
      );
    },
  });

  const forgotRequestOtpMutation = useMutation({
    mutationFn: forgotPasswordRequestOtp,
    onSuccess: (resp) => {
      const d = resp?.data ?? {};
      const email = String(d.email || forgotEmail).toLowerCase();
      const expiresIn = Number(d.otpExpiresInSeconds) || 90;
      setForgotEmail(email);
      setForgotStep("otp");
      setForgotOtp("");
      setForgotOtpTimer(expiresIn);
      setFormError("");
      setVerificationEmail(null);
      setVerificationInfo("");
      setFlowInfo(
        d.message ||
          `OTP sent to ${email}. It expires in ${expiresIn} seconds.`
      );
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.message ||
          "Could not generate OTP"
      );
    },
  });

  const forgotVerifyOtpMutation = useMutation({
    mutationFn: forgotPasswordVerifyOtp,
    onSuccess: (resp) => {
      setFormError("");
      setForgotStep("reset");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotNewPasswordTouched(false);
      setForgotConfirmPasswordTouched(false);
      setFlowInfo(
        resp?.data?.message || "OTP verified. Set your new password."
      );
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.message ||
          "Invalid OTP"
      );
    },
  });

  const forgotResetMutation = useMutation({
    mutationFn: forgotPasswordReset,
    onSuccess: (resp) => {
      closeForgotFlow();
      setMode("login");
      setFlowInfo(
        resp?.message ||
          "Password reset successful. Please login with your new password."
      );
    },
    onError: (err) => {
      setFormError(
        err.data?.error ||
          err.data?.message ||
          err.message ||
          "Could not reset password"
      );
    },
  });

  const busy =
    loginMutation.isPending ||
    registerMutation.isPending ||
    verifyMutation.isPending ||
    resendMutation.isPending ||
    forgotRequestOtpMutation.isPending ||
    forgotVerifyOtpMutation.isPending ||
    forgotResetMutation.isPending;

  function handleLogin(e) {
    e.preventDefault();
    setFormError("");
    setFlowInfo("");
    const fd = new FormData(e.target);
    loginMutation.mutate({
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
    });
  }

  function handleRegister(e) {
    e.preventDefault();
    setFormError("");
    setFlowInfo("");
    const fd = new FormData(e.target);
    registerMutation.mutate({
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
    });
  }

  function handleVerifyEmail(e) {
    e.preventDefault();
    setFormError("");
    setFlowInfo("");
    const otp = otpCode.trim();
    verifyMutation.mutate({
      email: verificationEmail,
      otp,
    });
  }

  function handleResendVerification() {
    if (!verificationEmail) return;
    setFormError("");
    setFlowInfo("");
    resendMutation.mutate({ email: verificationEmail });
  }

  function handleLeaveVerification() {
    setVerificationEmail(null);
    setVerificationInfo("");
    setOtpCode("");
    setFormError("");
    setFlowInfo("");
  }

  function handleForgotRequestOtp(e) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    setForgotEmail(email);
    forgotRequestOtpMutation.mutate({ email });
  }

  function handleForgotVerifyOtp(e) {
    e.preventDefault();
    setFormError("");
    setFlowInfo("");
    const otp = forgotOtp.trim();
    forgotVerifyOtpMutation.mutate({ email: forgotEmail, otp });
  }

  function handleForgotResetPassword(e) {
    e.preventDefault();
    setFormError("");
    setFlowInfo("");
    setForgotNewPasswordTouched(true);
    setForgotConfirmPasswordTouched(true);

    const newPassword = forgotNewPassword;
    const confirmPassword = forgotConfirmPassword;
    if (
      newPassword.length < 6 ||
      confirmPassword.length < 6 ||
      newPassword !== confirmPassword
    ) {
      return;
    }

    forgotResetMutation.mutate({
      email: forgotEmail,
      otp: forgotOtp,
      newPassword,
      confirmPassword,
    });
  }

  function handleRegenerateForgotOtp() {
    if (!forgotEmail || forgotOtpTimer > 0) return;
    setFormError("");
    forgotRequestOtpMutation.mutate({ email: forgotEmail });
  }

  function handleForgotNewPasswordChange(e) {
    setForgotNewPassword(String(e.target.value || ""));
    if (formError) setFormError("");
  }

  function handleForgotConfirmPasswordChange(e) {
    setForgotConfirmPassword(String(e.target.value || ""));
    if (formError) setFormError("");
  }

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("auth-theme", next);
      return next;
    });
  }

  return (
    <>
    <div className={`auth-split-page auth-split-page--${theme}`}>
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
            <button
              type="button"
              className="auth-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <h1 className="auth-panel__title">
              {verificationEmail
                ? "Verify your email"
                : forgotStep === "email"
                  ? "Forgot password"
                  : forgotStep === "otp"
                    ? "Enter reset OTP"
                    : forgotStep === "reset"
                      ? "Set new password"
                      : mode === "login"
                        ? "Welcome!"
                        : "Join us"}
            </h1>
            <p className="auth-panel__lead">
              {verificationEmail
                ? `We sent a 6-digit code to ${verificationEmail}.`
                : forgotStep === "email"
                  ? "Enter your registered email and generate OTP."
                : forgotStep === "otp"
                    ? `Enter the OTP sent to ${forgotEmail}.`
                    : forgotStep === "reset"
                      ? "Enter your new password and confirm it before OTP expires."
                      : mode === "login"
                        ? "Sign in to continue exploring your watchlist."
                        : "Create an account to save movies and lists."}
            </p>
          </header>

          {!verificationEmail && !forgotStep ? (
            <div className="auth-tabs auth-tabs--bw" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setFormError("");
                  setFlowInfo("");
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
                  setFlowInfo("");
                }}
              >
                Register
              </button>
            </div>
          ) : null}

          {verificationInfo && verificationEmail ? (
            <div className="auth-alert auth-alert--bw auth-alert--info" role="status">
              {verificationInfo}
            </div>
          ) : null}

          {flowInfo && !verificationEmail ? (
            <div className="auth-alert auth-alert--bw auth-alert--info" role="status">
              {flowInfo}
            </div>
          ) : null}

          {formError ? (
            <div className="auth-alert auth-alert--bw" role="alert">
              {formError}
            </div>
          ) : null}

          {verificationEmail ? (
            <form className="auth-form auth-form--bw" onSubmit={handleVerifyEmail}>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="8"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 8V6a4 4 0 018 0v2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(String(e.target.value || "").replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={busy}
                  placeholder="6-DIGIT CODE"
                />
              </label>
              <button
                type="submit"
                className="btn-login-bw"
                disabled={busy || otpCode.trim().length !== 6}
              >
                {busy && verifyMutation.isPending ? "VERIFYING…" : "VERIFY EMAIL"}
              </button>
              <div className="auth-form__row">
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy}
                  onClick={handleResendVerification}
                >
                  {resendMutation.isPending ? "Sending…" : "Resend code"}
                </button>
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy}
                  onClick={handleLeaveVerification}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : forgotStep === "email" ? (
            <form className="auth-form auth-form--bw" onSubmit={handleForgotRequestOtp}>
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
                  placeholder="REGISTERED E-MAIL"
                />
              </label>
              <button type="submit" className="btn-login-bw" disabled={busy}>
                {forgotRequestOtpMutation.isPending ? "GENERATING…" : "GENERATE OTP"}
              </button>
              <div className="auth-form__row">
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy}
                  onClick={closeForgotFlow}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : forgotStep === "otp" ? (
            <form className="auth-form auth-form--bw" onSubmit={handleForgotVerifyOtp}>
              <p className="otp-timer otp-timer--danger">
                {forgotOtpExpired
                  ? "Reset OTP expired. Generate a new OTP."
                  : `OTP expires in ${forgotOtpTimeLabel}`}
              </p>
              <label className="field field--icon">
                <span className="field__icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="8"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 8V6a4 4 0 018 0v2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) =>
                    setForgotOtp(String(e.target.value || "").replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={busy}
                  placeholder="6-DIGIT OTP"
                />
              </label>
              <button
                type="submit"
                className="btn-login-bw"
                disabled={busy || forgotOtp.trim().length !== 6 || forgotOtpExpired}
              >
                {forgotVerifyOtpMutation.isPending ? "VERIFYING…" : "VERIFY OTP"}
              </button>
              <div className="auth-form__row">
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy || forgotOtpTimer > 0}
                  onClick={handleRegenerateForgotOtp}
                >
                  {forgotOtpTimer > 0
                    ? `Generate OTP again in ${forgotOtpTimer}s`
                    : "Generate new OTP"}
                </button>
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy}
                  onClick={closeForgotFlow}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : forgotStep === "reset" ? (
            <form className="auth-form auth-form--bw" onSubmit={handleForgotResetPassword}>
              <p className="otp-timer otp-timer--danger">
                {forgotOtpExpired
                  ? "Reset OTP expired. Generate a new OTP."
                  : `OTP expires in ${forgotOtpTimeLabel}`}
              </p>
              <label
                className={`field field--icon${
                  forgotShowNewPasswordError ? " field--invalid" : ""
                }`}
              >
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
                  name="newPassword"
                  type={showResetPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={busy}
                  value={forgotNewPassword}
                  onChange={handleForgotNewPasswordChange}
                  onBlur={() => setForgotNewPasswordTouched(true)}
                  aria-invalid={forgotShowNewPasswordError}
                  placeholder="NEW PASSWORD (6+)"
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowResetPassword((v) => !v)}
                  aria-label={showResetPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showResetPassword} />
                </button>
              </label>
              {forgotShowNewPasswordError ? (
                <p className="field-error">Password must be at least 6 characters.</p>
              ) : null}
              <label
                className={`field field--icon${
                  forgotShowConfirmPasswordError ? " field--invalid" : ""
                }`}
              >
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
                  name="confirmPassword"
                  type={showResetConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={busy}
                  value={forgotConfirmPassword}
                  onChange={handleForgotConfirmPasswordChange}
                  onBlur={() => setForgotConfirmPasswordTouched(true)}
                  aria-invalid={forgotShowConfirmPasswordError}
                  placeholder="RE-ENTER PASSWORD"
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowResetConfirmPassword((v) => !v)}
                  aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showResetConfirmPassword} />
                </button>
              </label>
              {forgotShowConfirmPasswordError ? (
                <p className="field-error">
                  {forgotConfirmPasswordTooShort
                    ? "Password must be at least 6 characters."
                    : "Passwords do not match."}
                </p>
              ) : null}
              <button
                type="submit"
                className="btn-login-bw"
                disabled={busy || !forgotPasswordsMatch || forgotOtpExpired}
              >
                {forgotResetMutation.isPending ? "RESETTING…" : "RESET PASSWORD"}
              </button>
              <div className="auth-form__row">
                <button
                  type="button"
                  className="auth-link-btn"
                  disabled={busy}
                  onClick={closeForgotFlow}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : mode === "login" ? (
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
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  placeholder="YOUR PASSWORD"
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showLoginPassword} />
                </button>
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
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={startForgotFlow}
                >
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
                  type={showRegisterPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={busy}
                  placeholder="YOUR PASSWORD (6+)"
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowRegisterPassword((v) => !v)}
                  aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showRegisterPassword} />
                </button>
              </label>

              <button type="submit" className="btn-login-bw" disabled={busy}>
                {busy ? "PLEASE WAIT…" : "SEND OTP"}
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
