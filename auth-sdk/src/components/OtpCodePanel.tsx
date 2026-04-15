import { FormEvent, useId, useState } from "react";

export type OtpCodePanelProps = {
  email: string;
  onSubmit: (code: string) => Promise<void>;
  onBack?: () => void;
  busy?: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
};

export function OtpCodePanel({
  email,
  onSubmit,
  onBack,
  busy,
  title = "Enter verification code",
  subtitle,
  submitLabel = "Verify",
}: OtpCodePanelProps) {
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const errId = useId();
  const sub = subtitle ?? `We sent a 6-digit code to ${email}.`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) return;
    await onSubmit(trimmed);
  }

  const invalid = touched && !/^\d{6}$/.test(code.trim());

  return (
    <>
      <header className="authify-modal-header">
        <h2 className="authify-modal-title">{title}</h2>
        <p className="authify-modal-subtitle">{sub}</p>
      </header>
      <form className="authify-modal-form" onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="authify-modal-label">
          Code
        </label>
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="authify-modal-input"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onBlur={() => setTouched(true)}
          disabled={busy}
          aria-invalid={invalid}
          aria-describedby={invalid ? errId : undefined}
        />
        {invalid ? (
          <p id={errId} className="authify-modal-error" role="alert">
            Enter the 6-digit code from your email.
          </p>
        ) : null}
        <button type="submit" className="authify-modal-submit" disabled={busy}>
          {busy ? "Verifying…" : submitLabel}
        </button>
        {onBack ? (
          <button type="button" className="authify-modal-linkish" onClick={onBack} disabled={busy}>
            Back
          </button>
        ) : null}
      </form>
    </>
  );
}
