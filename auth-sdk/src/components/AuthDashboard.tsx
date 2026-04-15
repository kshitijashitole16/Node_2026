import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { FastAuthApiClient, type AuthEventRow, type DashboardUserRow } from "../core/api";
import { getAccessToken } from "../core/token";
import { useAuthContext } from "../provider/AuthProvider";
import "./dashboard.css";

export type AuthDashboardProps = {
  /** Query passed through to GET /analytics/auth (e.g. days: 30). */
  analyticsQuery?: Record<string, string | number | boolean | undefined>;
  className?: string;
};

type AnalyticsPayload = {
  totals?: {
    logins?: { success?: number; failure?: number; successRate?: number };
    otp?: { success?: number; failure?: number; successRate?: number };
    uniqueSuccessfulLoginUsers?: number;
  };
  meta?: { tableReady?: boolean };
};

export function AuthDashboard({ analyticsQuery, className = "" }: AuthDashboardProps) {
  const { apiUrl, primaryColor, isAuthenticated, user, analyticsAdminToken } = useAuthContext();
  const client = useMemo(
    () =>
      new FastAuthApiClient({
        baseUrl: apiUrl,
        getAccessToken,
        analyticsAdminToken,
      }),
    [analyticsAdminToken, apiUrl]
  );

  const [tab, setTab] = useState<"overview" | "events" | "users">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [events, setEvents] = useState<AuthEventRow[]>([]);
  const [users, setUsers] = useState<DashboardUserRow[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  const loadOverview = useCallback(async () => {
    const res = await client.getAuthAnalytics(analyticsQuery);
    setAnalytics((res.data ?? {}) as AnalyticsPayload);
  }, [analyticsQuery, client]);

  const loadEvents = useCallback(async () => {
    const res = await client.getAuthEventsPage({ limit: 80, offset: 0 });
    setEvents(res.data.items);
  }, [client]);

  const loadUsers = useCallback(
    async (page: number) => {
      const res = await client.getUsersPage({ page, limit: 20 });
      setUsers(res.data.items);
      setUserPage(res.data.page);
      setUserTotalPages(res.data.totalPages);
    },
    [client]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setAnalytics(null);
      setEvents([]);
      setUsers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadOverview();
        if (cancelled) return;
        await loadEvents();
        if (cancelled) return;
        await loadUsers(1);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadEvents, loadOverview, loadUsers]);

  const style: CSSProperties = {
    ["--authify-primary"]: primaryColor || "#3b82f6",
  } as CSSProperties;

  if (!isAuthenticated) {
    return (
      <section className={`authify-dashboard ${className}`.trim()} style={style}>
        <h2>Auth dashboard</h2>
        <p className="authify-dashboard-muted">Sign in to view API analytics and users.</p>
      </section>
    );
  }

  const lt = analytics?.totals?.logins;
  const ot = analytics?.totals?.otp;

  return (
    <section className={`authify-dashboard ${className}`.trim()} style={style}>
      <h2>Auth dashboard</h2>
      <p>
        Signed in as <strong>{user?.email}</strong>
        {analytics?.meta?.tableReady === false ? (
          <span className="authify-dashboard-muted"> — AuthEvent table not migrated yet; charts may be limited.</span>
        ) : null}
      </p>

      {error ? <p className="authify-dashboard-error">{error}</p> : null}

      <div className="authify-dashboard-tabs" role="tablist">
        {(
          [
            ["overview", "Overview"],
            ["events", "API logs"],
            ["users", "Users"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-active={tab === id}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="authify-dashboard-muted">Loading…</p> : null}

      {tab === "overview" && !loading ? (
        <div className="authify-dashboard-grid">
          <div className="authify-dashboard-stat">
            <strong>{lt?.success ?? "—"}</strong>
            <span>Successful logins</span>
          </div>
          <div className="authify-dashboard-stat">
            <strong>{lt?.failure ?? "—"}</strong>
            <span>Failed logins</span>
          </div>
          <div className="authify-dashboard-stat">
            <strong>{lt?.successRate != null ? `${lt.successRate}%` : "—"}</strong>
            <span>Login success rate</span>
          </div>
          <div className="authify-dashboard-stat">
            <strong>{ot?.success ?? "—"}</strong>
            <span>OTP successes</span>
          </div>
          <div className="authify-dashboard-stat">
            <strong>{analytics?.totals?.uniqueSuccessfulLoginUsers ?? "—"}</strong>
            <span>Unique login users</span>
          </div>
        </div>
      ) : null}

      {tab === "events" && !loading ? (
        <div className="authify-dashboard-table-wrap">
          <table className="authify-dashboard-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Status</th>
                <th>IP</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="authify-dashboard-muted">
                    No events yet.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                    <td>{ev.eventType}</td>
                    <td>{ev.status}</td>
                    <td>{ev.ipAddress ?? "—"}</td>
                    <td>{ev.user?.email ?? ev.userId ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "users" && !loading ? (
        <>
          <div className="authify-dashboard-table-wrap">
            <table className="authify-dashboard-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="authify-dashboard-muted">
                      No users.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>{new Date(u.createdAt).toLocaleString()}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.emailVerified ? "Yes" : "No"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="authify-dashboard-pager">
            <button type="button" disabled={userPage <= 1} onClick={() => void loadUsers(userPage - 1)}>
              Previous
            </button>
            {" · "}
            Page {userPage} / {userTotalPages}
            {" · "}
            <button
              type="button"
              disabled={userPage >= userTotalPages}
              onClick={() => void loadUsers(userPage + 1)}
            >
              Next
            </button>
          </p>
        </>
      ) : null}
    </section>
  );
}
