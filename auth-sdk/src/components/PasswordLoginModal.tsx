import {
  FormEvent,
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from "react";
import { useAuthContext } from "../provider/AuthProvider";

export type PasswordLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function PasswordLoginModal({
  open,
  onClose,
  onSuccess,
  title = "Sign in",
  subtitle = "Use your email and password.",
  className = "",
}: PasswordLoginModalProps) {
  const {
    appName,
    logo,
    primaryColor,
    loginWithPassword,
    isLoading,
    loadingAction,
    error,
    clearError,
  } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const emailInputId = useId();
  const passwordInputId = useId();
  const titleId = useId();
  const subtitleId = useId();
  const errorId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return;

    clearError();
    await loginWithPassword({ email: normalized, password });
    onSuccess?.();
    onClose();
  }

  const busy = isLoading && loadingAction === "loginWithPassword";
  const emailValue = email.trim().toLowerCase();
  const emailInvalid =
    touched && (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue));
  const passwordInvalid = touched && !password;
  const combinedError = emailInvalid
    ? "Please enter a valid email address."
    : passwordInvalid
      ? "Password is required."
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
            disabled={busy}
            aria-invalid={Boolean(combinedError)}
            aria-describedby={combinedError ? errorId : undefined}
          />

          <label htmlFor={passwordInputId} className="authify-modal-label">
            Password
          </label>
          <input
            id={passwordInputId}
            type="password"
            autoComplete="current-password"
            required
            className="authify-modal-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              if (combinedError) clearError();
              setPassword(e.target.value);
            }}
            onBlur={() => setTouched(true)}
            disabled={busy}
          />

          {combinedError ? (
            <p id={errorId} className="authify-modal-error" role="alert">
              {combinedError}
            </p>
          ) : null}

          <button
            type="submit"
            className="authify-modal-submit"
            disabled={busy || !emailValue || !password}
            aria-busy={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
