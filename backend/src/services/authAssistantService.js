function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseDaysFromQuestion(question) {
  const text = String(question ?? "").toLowerCase();

  const explicit = text.match(/(?:last|past)\s+(\d{1,3})\s+days?/);
  if (explicit) {
    return clampInt(explicit[1], 1, 365, 30);
  }

  if (/\b(last|past)\s+week\b/.test(text)) return 7;
  if (/\b(last|past)\s+month\b/.test(text)) return 30;
  if (/\b(last|past)\s+quarter\b/.test(text)) return 90;
  if (/\btoday\b/.test(text)) return 1;
  return null;
}

function detectIntent(question) {
  const text = String(question ?? "").toLowerCase();

  const hasOtp = /\botp\b/.test(text);
  const hasLogin = /\blogin\b|\blogins\b|\bsign[\s-]?in\b/.test(text);
  const hasFailure = /\bfail|failure|failed|increase|spike|drop\b/.test(text);
  const hasTrend = /\btrend|trends|last|past|show|chart|daily\b/.test(text);
  const hasRate = /\brate|ratio|percentage\b/.test(text);

  if (hasOtp && hasFailure) {
    return { intent: "otp_failure_analysis", focus: "otp", preferredChart: "dailyFailures" };
  }
  if (hasLogin && hasTrend) {
    return { intent: "login_trend", focus: "login", preferredChart: "dailyLogins" };
  }
  if (hasOtp && (hasRate || /\bsuccess\b/.test(text))) {
    return { intent: "otp_success_rate", focus: "otp", preferredChart: "dailyOtp" };
  }
  if (hasLogin) {
    return { intent: "login_summary", focus: "login", preferredChart: "dailyLogins" };
  }
  return { intent: "overview", focus: "all", preferredChart: "dailyLogins" };
}

function formatPercent(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function sum(rows, key) {
  return (rows ?? []).reduce((acc, row) => acc + Number(row?.[key] ?? 0), 0);
}

function pickPeak(rows, key) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.reduce((peak, row) => {
    const current = Number(row?.[key] ?? 0);
    if (!peak) return row;
    return current > Number(peak?.[key] ?? 0) ? row : peak;
  }, null);
}

function compareRecentVsPrevious(rows, key, bucketSize = 7) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return { recent: 0, previous: 0, change: 0, changePercent: 0 };
  }

  const size = Math.min(bucketSize, Math.max(1, Math.floor(list.length / 2)));
  const recentRows = list.slice(-size);
  const previousRows = list.slice(-(size * 2), -size);

  const recent = sum(recentRows, key);
  const previous = sum(previousRows, key);
  const change = recent - previous;
  const changePercent = previous > 0 ? Number(((change / previous) * 100).toFixed(2)) : 0;

  return { recent, previous, change, changePercent, size };
}

function buildRuleBasedAnswer({ question, parsed, analytics }) {
  const loginTotals = analytics?.totals?.logins ?? {};
  const otpTotals = analytics?.totals?.otp ?? {};
  const dailyLogins = analytics?.charts?.dailyLogins ?? [];
  const dailyFailures = analytics?.charts?.dailyFailures ?? [];
  const dailyOtp = analytics?.charts?.dailyOtp ?? [];

  const insights = [];
  const suggestions = [];
  let summary = "";

  if (parsed.intent === "login_trend") {
    const peak = pickPeak(dailyLogins, "total");
    const comp = compareRecentVsPrevious(dailyLogins, "total", 7);
    summary = `Login trend for last ${analytics.range.days} days: ${loginTotals.total ?? 0} attempts with ${formatPercent(loginTotals.successRate)} success.`;
    if (peak) {
      insights.push(`Peak login day: ${peak.date} with ${peak.total} attempts.`);
    }
    if (comp.previous > 0) {
      insights.push(
        `Recent ${comp.size}-day login volume is ${comp.change >= 0 ? "up" : "down"} by ${Math.abs(comp.changePercent)}%.`
      );
    }
    if (Number(loginTotals.failure ?? 0) > 0) {
      const failureRate = loginTotals.total
        ? Number(((Number(loginTotals.failure) / Number(loginTotals.total)) * 100).toFixed(2))
        : 0;
      insights.push(`Login failure rate is ${failureRate.toFixed(2)}%.`);
    }
    suggestions.push("Track repeated login failures per IP and apply adaptive throttling.");
    suggestions.push("Alert when daily login failures exceed your baseline threshold.");
  } else if (parsed.intent === "otp_failure_analysis") {
    const comp = compareRecentVsPrevious(dailyFailures, "otpFailures", 7);
    const peak = pickPeak(dailyFailures, "otpFailures");
    const trendWord = comp.change > 0 ? "increasing" : comp.change < 0 ? "decreasing" : "stable";
    summary = `OTP failures are ${trendWord} in the selected period (${analytics.range.from} to ${analytics.range.to}).`;
    insights.push(
      `Recent ${comp.size}-day OTP failures: ${comp.recent} vs previous ${comp.size}-day: ${comp.previous}.`
    );
    if (peak) {
      insights.push(`Highest OTP failure day: ${peak.date} (${peak.otpFailures} failures).`);
    }
    insights.push(`Current OTP success rate is ${formatPercent(otpTotals.successRate)}.`);
    suggestions.push("Inspect OTP provider latency/delivery logs during peak failure windows.");
    suggestions.push("Add short retry backoff and per-IP OTP attempt limits.");
  } else if (parsed.intent === "otp_success_rate") {
    const peakFail = pickPeak(dailyOtp, "failure");
    summary = `OTP success rate for last ${analytics.range.days} days is ${formatPercent(otpTotals.successRate)} (${otpTotals.success ?? 0}/${otpTotals.total ?? 0}).`;
    if (peakFail) {
      insights.push(`Most OTP failures occurred on ${peakFail.date} (${peakFail.failure}).`);
    }
    insights.push(`Total OTP attempts in range: ${otpTotals.total ?? 0}.`);
    suggestions.push("Monitor OTP expiry windows against average user completion time.");
    suggestions.push("Resend OTP only after cooldown to reduce invalid attempts.");
  } else {
    summary = `Auth overview for ${analytics.range.days} days: login success ${formatPercent(loginTotals.successRate)}, OTP success ${formatPercent(otpTotals.successRate)}.`;
    insights.push(
      `Login attempts: ${loginTotals.total ?? 0}, OTP attempts: ${otpTotals.total ?? 0}.`
    );
    if (Array.isArray(analytics?.topFailureIps) && analytics.topFailureIps.length > 0) {
      const top = analytics.topFailureIps[0];
      insights.push(`Top failure IP: ${top.ipAddress} (${top.count} failed events).`);
    }
    suggestions.push("Review top failing IPs weekly and block abusive sources.");
    suggestions.push("Set anomaly alerts for sudden OTP or login failure spikes.");
  }

  return {
    summary,
    insights: insights.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
    source: "rule_based",
    questionEcho: String(question || "").trim(),
  };
}

function aiConfig() {
  const apiKey =
    process.env.AI_INSIGHTS_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (
    process.env.AI_INSIGHTS_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model =
    process.env.AI_ASSISTANT_MODEL?.trim() ||
    process.env.AI_INSIGHTS_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  return { enabled: Boolean(apiKey), apiKey, baseUrl, model };
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeAiAnswer(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  const summary =
    typeof payload.summary === "string" && payload.summary.trim()
      ? payload.summary.trim()
      : fallback.summary;
  const insights = Array.isArray(payload.insights)
    ? payload.insights.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3)
    : fallback.insights;
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3)
    : fallback.suggestions;

  return {
    ...fallback,
    summary,
    insights: insights.length ? insights : fallback.insights,
    suggestions: suggestions.length ? suggestions : fallback.suggestions,
    source: "ai",
  };
}

export function parseAuthQuestionToQuery(question, overrides = {}) {
  const intentInfo = detectIntent(question);
  const extractedDays = parseDaysFromQuestion(question);

  const hasFrom = overrides.from != null && String(overrides.from).trim() !== "";
  const hasTo = overrides.to != null && String(overrides.to).trim() !== "";

  let query;
  if (hasFrom || hasTo) {
    query = {
      from: hasFrom ? String(overrides.from).trim() : undefined,
      to: hasTo ? String(overrides.to).trim() : undefined,
    };
  } else {
    const defaultDays =
      intentInfo.intent === "login_trend"
        ? 7
        : intentInfo.intent === "otp_failure_analysis"
          ? 14
          : 30;
    const days = clampInt(overrides.days, 1, 365, extractedDays ?? defaultDays);
    query = { days };
  }

  return {
    ...intentInfo,
    query,
  };
}

export async function runAuthAssistant({ question, parsed, analytics }) {
  const fallback = buildRuleBasedAnswer({ question, parsed, analytics });
  const config = aiConfig();
  if (!config.enabled) return fallback;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a concise auth analytics assistant. Reply in JSON with: summary (string), insights (string[] max 3), suggestions (string[] max 3).",
          },
          {
            role: "user",
            content: `Question: ${question}\nIntent: ${parsed.intent}\nFocus: ${parsed.focus}\nAnalytics: ${JSON.stringify(
              {
                range: analytics.range,
                totals: analytics.totals,
                topFailureIps: analytics.topFailureIps,
                dailyLogins: analytics?.charts?.dailyLogins?.slice(-14) ?? [],
                dailyFailures: analytics?.charts?.dailyFailures?.slice(-14) ?? [],
                dailyOtp: analytics?.charts?.dailyOtp?.slice(-14) ?? [],
              }
            )}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    return normalizeAiAnswer(safeJsonParse(String(raw).trim()), fallback);
  } catch {
    return fallback;
  }
}
