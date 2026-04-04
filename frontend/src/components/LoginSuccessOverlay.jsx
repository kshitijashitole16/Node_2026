import { useEffect, useRef, useState } from "react";

const HERO_SRC = "/login-success-hero.png";

/**
 * Full-screen success state: hero illustration on black, auto-dismiss after 5s.
 */
export function LoginSuccessOverlay({ userName, kind = "login", onComplete }) {
  const onCompleteRef = useRef(onComplete);
  const finishedRef = useRef(false);
  onCompleteRef.current = onComplete;

  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const done = setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onCompleteRef.current();
    }, 5000);

    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => {
      clearTimeout(done);
      clearInterval(tick);
    };
  }, []);

  const progress = (5 - secondsLeft) / 5;
  const title =
    kind === "register" ? "Account created" : "Login successful";

  return (
    <div
      className="login-success-overlay login-success-overlay--dark"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-success-title"
      aria-describedby="login-success-desc"
    >
      <div className="login-success-backdrop login-success-backdrop--dark" />
      <div className="login-success-card login-success-card--dark">
        <div className="login-success-art login-success-art--dark" aria-hidden>
          <img
            className="login-success-hero-img"
            src={HERO_SRC}
            alt=""
            width={480}
            height={360}
            decoding="async"
          />
          <div className="login-success-battery login-success-battery--dark">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="login-success-bat-seg login-success-bat-seg--dark"
                style={{
                  opacity: progress >= (i + 1) / 5 ? 1 : 0.22,
                  transition: "opacity 0.35s ease",
                }}
              />
            ))}
          </div>
        </div>

        <h2 id="login-success-title" className="login-success-title login-success-title--dark">
          {title}
        </h2>
        <p id="login-success-desc" className="login-success-desc login-success-desc--dark">
          {userName ? (
            <>
              Nice to see you, <strong>{userName}</strong>. You can explore the
              site now.
            </>
          ) : (
            <>You&apos;re in — explore the site now.</>
          )}
        </p>
        <p className="login-success-count login-success-count--dark" aria-live="polite">
          Continuing in <strong>{secondsLeft}</strong>s
        </p>
        <div
          className="login-success-bar login-success-bar--dark"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={5 - secondsLeft}
          aria-label="Redirect progress"
        >
          <div className="login-success-bar__fill login-success-bar__fill--run login-success-bar__fill--dark" />
        </div>
      </div>
    </div>
  );
}
