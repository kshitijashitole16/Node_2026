import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { logoutRequest, setAccessToken } from "../api/authApi.js";
import { fetchAuthAnalytics } from "../api/analyticsApi.js";
import { ChartCard } from "../components/charts/ChartCard.jsx";
import { AnalyticsLineChart } from "../components/charts/AnalyticsLineChart.jsx";
import { AnalyticsPieChart } from "../components/charts/AnalyticsPieChart.jsx";
import { AuthAssistantCard } from "../components/charts/AuthAssistantCard.jsx";

export function HomePage() {
  const { logoutLocal, user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      setAccessToken(null);
      logoutLocal();
      navigate("/", { replace: true });
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ["auth-analytics", days],
    queryFn: () => fetchAuthAnalytics({ days }),
    staleTime: 60_000,
  });

  const analytics = analyticsQuery.data?.data;
  const dailyLogins = analytics?.charts?.dailyLogins ?? [];
  const loginTotals = analytics?.totals?.logins ?? {
    success: 0,
    failure: 0,
    total: 0,
    successRate: 0,
  };
  const otpTotals = analytics?.totals?.otp ?? {
    success: 0,
    failure: 0,
    total: 0,
    successRate: 0,
  };
  const uniqueUsers = analytics?.totals?.uniqueSuccessfulLoginUsers ?? 0;

  const otpPieData = useMemo(
    () => [
      { name: "OTP Success", value: otpTotals.success, color: "#34d399" },
      { name: "OTP Failure", value: otpTotals.failure, color: "#fb7185" },
    ],
    [otpTotals.failure, otpTotals.success]
  );

  const loginLineConfig = useMemo(
    () => [
      { key: "success", label: "Success", color: "#60a5fa" },
      { key: "failure", label: "Failure", color: "#f87171" },
    ],
    []
  );

  const rangeButtons = [7, 30, 90];

  return (
    <div className="dashboard-shell">
      <header className="dashboard-top">
        <div className="dashboard-top__title-wrap">
          <p className="dashboard-eyebrow">Auth Analytics</p>
          <h1 className="dashboard-title">Authentication Intelligence Dashboard</h1>
          <p className="dashboard-subtitle">
            Monitor login trends, OTP conversion, and failure patterns in real time.
          </p>
        </div>
        <div className="dashboard-top__actions">
          <div className="dashboard-range" role="group" aria-label="Select date range">
            {rangeButtons.map((value) => (
              <button
                key={value}
                type="button"
                className={`dashboard-range__btn ${days === value ? "is-active" : ""}`}
                onClick={() => setDays(value)}
                disabled={analyticsQuery.isFetching}
              >
                {value}D
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dashboard-logout"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Logging out…" : "Logout"}
          </button>
        </div>
      </header>

      {analyticsQuery.error ? (
        <div className="dashboard-alert" role="alert">
          {analyticsQuery.error?.data?.error ||
            analyticsQuery.error?.message ||
            "Could not load analytics"}
        </div>
      ) : null}

      <section className="dashboard-kpis">
        <article className="kpi-card">
          <p className="kpi-card__label">Login Success Rate</p>
          <p className="kpi-card__value">
            {Number(loginTotals.successRate || 0).toFixed(2)}%
          </p>
          <p className="kpi-card__meta">
            {loginTotals.success} success / {loginTotals.failure} failure
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-card__label">OTP Success Rate</p>
          <p className="kpi-card__value">
            {Number(otpTotals.successRate || 0).toFixed(2)}%
          </p>
          <p className="kpi-card__meta">
            {otpTotals.success} success / {otpTotals.failure} failure
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-card__label">Unique Login Users</p>
          <p className="kpi-card__value">{uniqueUsers}</p>
          <p className="kpi-card__meta">Signed in during last {days} days</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-card__label">Signed In As</p>
          <p className="kpi-card__value kpi-card__value--email">{user?.email || "-"}</p>
          <p className="kpi-card__meta">Session is active</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <ChartCard
          title="Login Trends Per Day"
          subtitle={`Success vs failure over the last ${days} days`}
        >
          {analyticsQuery.isLoading ? (
            <div className="chart-loading">Loading chart...</div>
          ) : (
            <AnalyticsLineChart
              data={dailyLogins}
              xKey="date"
              lines={loginLineConfig}
              height={320}
            />
          )}
        </ChartCard>

        <ChartCard
          title="OTP Success vs Failure"
          subtitle="Distribution of OTP outcomes"
        >
          {analyticsQuery.isLoading ? (
            <div className="chart-loading">Loading chart...</div>
          ) : (
            <AnalyticsPieChart
              data={otpPieData}
              height={320}
              emptyMessage="No OTP success/failure events in selected range."
            />
          )}
        </ChartCard>
      </section>

      <section className="dashboard-assistant">
        <AuthAssistantCard days={days} />
      </section>

      <section className="dashboard-footnote">
        <p>
          Source: <code>/analytics/auth?days={days}</code>
        </p>
      </section>
    </div>
  );
}
