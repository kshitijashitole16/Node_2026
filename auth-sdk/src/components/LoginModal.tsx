import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useAuthContext } from "../provider/AuthProvider";
import { type SendOtpPurpose } from "../core/api";

export type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onOtpSent?: (email: string) => void;
  purpose?: SendOtpPurpose;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function LoginModal({
  open,
  onClose,
  onOtpSent,
  purpose = "Authify_Register_user",
  title = "Sign in with OTP",
  subtitle = "Enter your email to receive a one-time code.",
  className = "",
}: LoginModalProps) {
  const {
    appName,
    logo,
    primaryColor,
    loginWithOtp,
    isLoading,
    loadingAction,
    error,
    clearError,
  } = useAuthContext();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const emailInputId = useId();
  const titleId = useId();
  const subtitleId = useId();
  const errorId = useId();

  if (!open) return null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setTouched(true);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;

    clearError();
    await loginWithOtp({
      purpose,
      email: normalized,
    });
    onOtpSent?.(normalized);
  }

  const sendingOtp = isLoading && loadingAction === "loginWithOtp";
  const emailValue = email.trim().toLowerCase();
  const emailInvalid = touched && (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue));
  const combinedError = emailInvalid
    ? "Please enter a valid email address."
    : error?.message || "";

  const modalStyle: CSSProperties = {
    ["--authify-primary"]: primaryColor || "#3b82f6",
  } as CSSProperties;

  return (
    <div
      className={`authify-modal-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="authify-modal" style={modalStyle}>
        <button
          type="button"
          className="authify-modal-close"
          aria-label="Close login modal"
          onClick={onClose}
        >
          ×
        </button>

        <header className="authify-modal-header">
          {logo ? <img src={logo} alt={`${appName} logo`} className="authify-modal-logo" /> : null}
          <p className="authify-modal-appname">{appName}</p>
          <h2 id={titleId} className="authify-modal-title">
            {title}
          </h2>
          <p id={subtitleId} className="authify-modal-subtitle">
            {subtitle}
          </p>
        </header>

        <form className="authify-modal-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor={emailInputId} className="authify-modal-label">
            Email
          </label>
          <input
            id={emailInputId}
            type="email"
            autoComplete="email"
            required
            className="authify-modal-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              if (combinedError) clearError();
              setEmail(e.target.value);
            }}
            onBlur={() => setTouched(true)}
            disabled={sendingOtp}
            aria-invalid={Boolean(combinedError)}
            aria-describedby={combinedError ? errorId : undefined}
          />

          {combinedError ? (
            <p id={errorId} className="authify-modal-error" role="alert">
              {combinedError}
            </p>
          ) : null}

          <button
            type="submit"
            className="authify-modal-submit"
            disabled={sendingOtp || !emailValue}
            aria-busy={sendingOtp}
          >
            {sendingOtp ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}
