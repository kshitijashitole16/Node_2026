import {
  FormEvent,
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from "react";
import { useAuthContext } from "../provider/AuthProvider";
import { OtpCodePanel } from "./OtpCodePanel";

export type RegisterModalProps = {
  open: boolean;
  onClose: () => void;
  onRegistered?: () => void;
  className?: string;
};

type Step = "details" | "otp";

export function RegisterModal({
  open,
  onClose,
  onRegistered,
  className = "",
}: RegisterModalProps) {
  const { appName, logo, primaryColor, loginWithOtp, verifyOtp, isLoading, loadingAction, error, clearError } =
    useAuthContext();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const pwId = useId();
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
      setStep("details");
      setName("");
      setEmail("");
      setPassword("");
      setTouched(false);
      clearError();
    }
  }, [open, clearError]);

  if (!open) return null;

  const modalStyle: CSSProperties = {
    ["--authify-primary"]: primaryColor || "#3b82f6",
  } as CSSProperties;

  async function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const n = name.trim();
    const em = email.trim().toLowerCase();
    const pw = password;
    if (n.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || pw.length < 6) return;
    clearError();
    await loginWithOtp({
      purpose: "RegisterAuthOtp",
      email: em,
      name: n,
      password: pw,
    });
    setStep("otp");
  }

  async function handleOtp(code: string) {
    const em = email.trim().toLowerCase();
    await verifyOtp({
      code,
      purpose: "RegisterAuthOtp",
      email: em,
    });
    onRegistered?.();
    onClose();
  }

  const sending = isLoading && loadingAction === "loginWithOtp";
  const verifying = isLoading && loadingAction === "verifyOtp";
  const nameInvalid = touched && name.trim().length < 2;
  const emailInvalid =
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  const pwInvalid = touched && password.length < 6;
  const formError =
    nameInvalid || emailInvalid || pwInvalid
      ? "Please fill all fields (password at least 6 characters)."
      : error?.message || "";

  return (
    <div
      className={`authify-modal-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="authify-register-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="authify-modal" style={modalStyle}>
        <button type="button" className="authify-modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {step === "details" ? (
          <>
            <header className="authify-modal-header">
              {logo ? <img src={logo} alt="" className="authify-modal-logo" /> : null}
              <p className="authify-modal-appname">{appName}</p>
              <h2 id="authify-register-title" className="authify-modal-title">
                Create account
              </h2>
              <p className="authify-modal-subtitle">We will email you a code to verify your address.</p>
            </header>
            <form className="authify-modal-form" noValidate onSubmit={handleDetailsSubmit}>
              <label htmlFor={nameId} className="authify-modal-label">
                Name
              </label>
              <input
                id={nameId}
                className="authify-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={sending}
              />
              <label htmlFor={emailId} className="authify-modal-label">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                className="authify-modal-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={sending}
              />
              <label htmlFor={pwId} className="authify-modal-label">
                Password
              </label>
              <input
                id={pwId}
                type="password"
                autoComplete="new-password"
                className="authify-modal-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={sending}
              />
              {formError ? (
                <p id={errId} className="authify-modal-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <button type="submit" className="authify-modal-submit" disabled={sending}>
                {sending ? "Sending code…" : "Continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            {error ? (
              <p className="authify-modal-error" role="alert" style={{ marginBottom: "0.5rem" }}>
                {error.message}
              </p>
            ) : null}
            <OtpCodePanel
              email={email.trim().toLowerCase()}
              onSubmit={handleOtp}
              onBack={() => setStep("details")}
              busy={verifying}
            />
          </>
        )}
      </div>
    </div>
  );
}
