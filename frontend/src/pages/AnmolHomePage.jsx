import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { logoutRequest, setAccessToken } from "../api/authApi.js";

export function AnmolHomePage() {
  const { user, logoutLocal } = useAuth();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      setAccessToken(null);
      logoutLocal();
      navigate("/", { replace: true });
    },
  });

  const firstName = user?.name?.split(/\s+/)[0] || "Anmol";

  return (
    <div className="home-shell home-shell--anmol">
      <header className="home-bar">
        <span className="home-brand">stream-explorer</span>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </button>
      </header>
      <main className="home-main home-main--anmol">
        <p className="home-anmol-eyebrow">Signed in as {user?.email}</p>
        <h1 className="home-title home-title--anmol">
          Hey, {firstName} — your hub is ready
        </h1>
        <p className="home-lead home-lead--anmol">
          Your personal home for the app — watchlist, discovery, and picks in
          one place.
        </p>
        <div className="home-anmol-panels">
          <section className="home-anmol-card">
            <h2 className="home-anmol-card__title">Watchlist</h2>
            <p className="home-anmol-card__text">
              Saved titles and status live here once you wire the UI to the API.
            </p>
          </section>
          <section className="home-anmol-card">
            <h2 className="home-anmol-card__title">Discover</h2>
            <p className="home-anmol-card__text">
              Explore the catalog and add films you want to track.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
