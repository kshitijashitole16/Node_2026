import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { logoutRequest, setAccessToken } from "../api/authApi.js";

export function HomePage() {
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

  return (
    <div className="home-shell">
      <header className="home-bar">
        <span className="home-brand">Streaming</span>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </button>
      </header>
      <main className="home-main">
        <h1 className="home-title">You’re signed in</h1>
        <p className="home-lead">
          Hello, <strong>{user?.name}</strong>. Use{" "}
          <code>Authorization: Bearer &lt;accessToken&gt;</code> with the value
          from <code>localStorage</code> (<code>access_token</code>) for API
          calls; the refresh token stays in an httpOnly cookie — call{" "}
          <code>POST /auth/refresh</code> when the access token expires.
        </p>
        <p className="home-meta muted">{user?.email}</p>
      </main>
    </div>
  );
}
