import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { logoutRequest, setAccessToken } from "../api/authApi.js";

export function HomePage() {
  const { logoutLocal } = useAuth();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      setAccessToken(null);
      logoutLocal();
      navigate("/", { replace: true });
    },
  });

  return (
    <div className="coming-shell">
      <header className="coming-top">
        <button
          type="button"
          className="coming-logout"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Logging out…" : "Logout"}
        </button>
      </header>

      <div className="coming-waves" aria-hidden>
        <div className="coming-glow coming-glow--one" />
        <div className="coming-glow coming-glow--two" />
        <div className="coming-glow coming-glow--three" />

        <svg
          className="coming-wave-svg coming-wave-svg--a"
          viewBox="0 0 1600 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff114f" />
              <stop offset="50%" stopColor="#a600ff" />
              <stop offset="100%" stopColor="#2ad7ff" />
            </linearGradient>
          </defs>
          <path
            className="coming-wave-path"
            d="M-140 300 C 80 90, 330 110, 530 270 S 980 520, 1230 360 S 1670 110, 1760 280"
            stroke="url(#waveGradA)"
          />
          <path
            className="coming-wave-path"
            d="M-160 380 C 120 230, 380 210, 620 360 S 1080 650, 1340 470 S 1750 260, 1820 430"
            stroke="url(#waveGradA)"
          />
          <path
            className="coming-wave-path"
            d="M-200 500 C 60 360, 340 330, 600 470 S 1140 760, 1400 620 S 1780 450, 1880 560"
            stroke="url(#waveGradA)"
          />
        </svg>

        <svg
          className="coming-wave-svg coming-wave-svg--b"
          viewBox="0 0 1600 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradB" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ff1744" />
              <stop offset="55%" stopColor="#0060ff" />
              <stop offset="100%" stopColor="#28e7ff" />
            </linearGradient>
          </defs>
          <path
            className="coming-wave-path coming-wave-path--soft"
            d="M-80 610 C 120 380, 380 360, 590 540 S 1010 780, 1270 590 S 1660 290, 1820 500"
            stroke="url(#waveGradB)"
          />
          <path
            className="coming-wave-path coming-wave-path--soft"
            d="M-60 700 C 150 500, 390 500, 620 640 S 1120 860, 1360 700 S 1730 420, 1880 620"
            stroke="url(#waveGradB)"
          />
        </svg>

        <svg
          className="coming-wave-svg coming-wave-svg--c"
          viewBox="0 0 1600 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradC" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c6ff" />
              <stop offset="45%" stopColor="#9f00ff" />
              <stop offset="100%" stopColor="#ff2f67" />
            </linearGradient>
          </defs>
          <path
            className="coming-wave-path coming-wave-path--thin"
            d="M-200 460 C 20 220, 300 220, 530 440 S 1040 770, 1320 560 S 1730 240, 1850 450"
            stroke="url(#waveGradC)"
          />
          <path
            className="coming-wave-path coming-wave-path--thin"
            d="M-180 250 C 40 70, 310 60, 550 230 S 980 460, 1210 310 S 1680 50, 1860 220"
            stroke="url(#waveGradC)"
          />
        </svg>
      </div>

      <main className="coming-content">
        <p className="coming-kicker">Launching Soon</p>
        <h1 className="coming-title">AI Resume Builder for Top Companies</h1>
        <p className="coming-subtitle">
          Build yourself for big opportunities. Your AI career copilot, powered
          by your resume, is coming soon.
        </p>
      </main>
    </div>
  );
}
