function aiConfig() {
  const apiKey =
    process.env.AI_INSIGHTS_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (
    process.env.AI_INSIGHTS_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model =
    process.env.AI_INSIGHTS_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";
  const timeoutMsRaw = Number(process.env.AI_INSIGHTS_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 10_000;

  return {
    enabled: Boolean(apiKey),
    provider: "openai",
    apiKey,
    baseUrl,
    model,
    timeoutMs,
  };
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function calculateTrend(values) {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const first = Number(values[0] ?? 0);
  const last = Number(values[values.length - 1] ?? 0);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
  return Number((((last - first) / first) * 100).toFixed(2));
}

function buildFallbackInsights(analytics) {
  const login = analytics?.totals?.logins ?? {};
  const otp = analytics?.totals?.otp ?? {};
  const topFailureIps = analytics?.topFailureIps ?? [];
  const dailyLogins = analytics?.charts?.dailyLogins ?? [];
  const recentLoginTotals = dailyLogins.slice(-7).map((d) => d.total);
  const loginTrend = calculateTrend(recentLoginTotals);

  const insights = [];
  const recommendations = [];

  if ((login.failure ?? 0) > 0) {
    insights.push(
      `Login failure rate is ${login.total ? login.successRate !== undefined ? (100 - login.successRate).toFixed(2) : ((login.failure / login.total) * 100).toFixed(2) : "0.00"}%.`
    );
  }
  if ((otp.failure ?? 0) > 0) {
    insights.push(
      `OTP failure rate is ${otp.total ? ((otp.failure / otp.total) * 100).toFixed(2) : "0.00"}%.`
    );
  }
  if (topFailureIps.length > 0) {
    const topIp = topFailureIps[0];
    insights.push(
      `Highest failure source is IP ${topIp.ipAddress} with ${topIp.count} failed attempts in selected range.`
    );
    recommendations.push(
      "Add temporary rate limits or CAPTCHA for repeated failures from the top failing IPs."
    );
  }
  if (Math.abs(loginTrend) >= 20) {
    insights.push(
      `Login volume trend over the last 7 data points is ${loginTrend > 0 ? "up" : "down"} by ${Math.abs(loginTrend)}%.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Track failed attempts per user and IP to trigger adaptive security challenges."
    );
  }

  return {
    summary:
      "AI provider is not configured, so insights were generated using rule-based analytics.",
    insights,
    recommendations,
  };
}

function compactAnalyticsForPrompt(analytics) {
  const dailyLogins = analytics?.charts?.dailyLogins ?? [];
  const dailyFailures = analytics?.charts?.dailyFailures ?? [];
  const dailyOtp = analytics?.charts?.dailyOtp ?? [];

  return {
    range: analytics?.range,
    totals: analytics?.totals,
    topFailureIps: analytics?.topFailureIps,
    breakdownByEventType: analytics?.breakdownByEventType,
    dailySamples: {
      dailyLoginsLast14: dailyLogins.slice(-14),
      dailyFailuresLast14: dailyFailures.slice(-14),
      dailyOtpLast14: dailyOtp.slice(-14),
    },
  };
}

function normalizeInsightsPayload(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;

  const summary =
    typeof payload.summary === "string" && payload.summary.trim()
      ? payload.summary.trim()
      : fallback.summary;

  const insights = Array.isArray(payload.insights)
    ? payload.insights
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 8)
    : fallback.insights;

  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 8)
    : fallback.recommendations;

  return {
    summary,
    insights: insights.length ? insights : fallback.insights,
    recommendations: recommendations.length
      ? recommendations
      : fallback.recommendations,
  };
}

export async function generateAuthInsights(analytics) {
  const config = aiConfig();
  const generatedAt = new Date().toISOString();
  const fallback = buildFallbackInsights(analytics);

  if (!config.enabled) {
    return {
      provider: "rule_based",
      model: null,
      generatedAt,
      ...fallback,
      source: "fallback_no_api_key",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a backend security analytics assistant. Return strict JSON with keys: summary, insights, recommendations.",
          },
          {
            role: "user",
            content: `Analyze this authentication analytics payload and provide concise actionable insights:\n${JSON.stringify(
              compactAnalyticsForPrompt(analytics)
            )}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonParse(String(content).trim());
    const normalized = normalizeInsightsPayload(parsed, fallback);

    return {
      provider: config.provider,
      model: config.model,
      generatedAt,
      ...normalized,
      source: "ai",
    };
  } catch (error) {
    return {
      provider: "rule_based",
      model: null,
      generatedAt,
      ...fallback,
      source: "fallback_on_error",
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
