import { FormEvent, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { FastAuthApiClient } from "../core/api";
import { useAuthContext } from "../provider/AuthProvider";
import { OtpCodePanel } from "./OtpCodePanel";

export type ForgotPasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onPasswordReset?: () => void;
  className?: string;
};

type Step = "email" | "otp" | "newPassword";

export function ForgotPasswordModal({
  open,
  onClose,
  onPasswordReset,
  className = "",
}: ForgotPasswordModalProps) {
  const { apiUrl, appName, logo, primaryColor } = useAuthContext();
  const client = useMemo(() => new FastAuthApiClient({ baseUrl: apiUrl }), [apiUrl]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const emailId = useId();
  const errId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setStep("email");
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirm("");
      setTouched(false);
      setLocalError(null);
    }
  }, [open]);

  if (!open) return null;

  const modalStyle: CSSProperties = {
    ["--authify-primary"]: primaryColor || "#3b82f6",
  } as CSSProperties;

  const normalizedEmail = email.trim().toLowerCase();

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return;
    setBusy(true);
    setLocalError(null);
    try {
      await client.sendOtp({
        purpose: "ForgotAuthOtp",
        email: normalizedEmail,
      });
      setStep("otp");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpSubmit(code: string) {
    setBusy(true);
    setLocalError(null);
    try {
      await client.verifyOtp({
        purpose: "ForgotAuthOtp",
        email: normalizedEmail,
        otp: code,
      });
      setOtp(code);
      setStep("newPassword");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (newPassword.length < 6 || newPassword !== confirm) {
      setLocalError("Passwords must match and be at least 6 characters.");
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      await client.resetPassword({
        email: normalizedEmail,
        otp,
        newPassword,
        confirmPassword: confirm,
      });
      onPasswordReset?.();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  const emailInvalid = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  return (
    <div
      className={`authify-modal-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="authify-modal" style={modalStyle}>
        <button type="button" className="authify-modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {step === "email" ? (
          <>
            <header className="authify-modal-header">
              {logo ? <img src={logo} alt="" className="authify-modal-logo" /> : null}
              <p className="authify-modal-appname">{appName}</p>
              <h2 className="authify-modal-title">Reset password</h2>
              <p className="authify-modal-subtitle">Enter your account email to receive a reset code.</p>
            </header>
            <form className="authify-modal-form" onSubmit={handleEmailSubmit}>
              <label htmlFor={emailId} className="authify-modal-label">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                className="authify-modal-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              {emailInvalid || localError ? (
                <p id={errId} className="authify-modal-error" role="alert">
                  {emailInvalid ? "Enter a valid email." : localError}
                </p>
              ) : null}
              <button type="submit" className="authify-modal-submit" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : null}

        {step === "otp" ? (
          <OtpCodePanel
            email={normalizedEmail}
            onSubmit={handleOtpSubmit}
            onBack={() => setStep("email")}
            busy={busy}
            title="Verify code"
          />
        ) : null}

        {step === "newPassword" ? (
          <>
            <header className="authify-modal-header">
              <h2 className="authify-modal-title">New password</h2>
              <p className="authify-modal-subtitle">Choose a new password for {normalizedEmail}.</p>
            </header>
            <form className="authify-modal-form" onSubmit={handleResetSubmit}>
              <label className="authify-modal-label" htmlFor="authify-np">
                New password
              </label>
              <input
                id="authify-np"
                type="password"
                autoComplete="new-password"
                className="authify-modal-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={busy}
              />
              <label className="authify-modal-label" htmlFor="authify-cp">
                Confirm
              </label>
              <input
                id="authify-cp"
                type="password"
                autoComplete="new-password"
                className="authify-modal-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
              />
              {localError ? (
                <p className="authify-modal-error" role="alert">
                  {localError}
                </p>
              ) : null}
              <button type="submit" className="authify-modal-submit" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
