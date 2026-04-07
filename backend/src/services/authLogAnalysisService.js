import { prisma } from "../config/db.js";

const MAX_LOGS = 50;

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

function normalize(value) {
  const out = String(value ?? "").trim();
  return out || undefined;
}

function normalizeRows(rows) {
  return (rows ?? []).map((row) => {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
    return {
      email: metadata?.email ?? null,
      ip: row?.ipAddress ?? null,
      event: row?.eventType ?? null,
      status: row?.status ?? null,
      reason: metadata?.reason ?? null,
      attemptCount: Number(metadata?.attemptCount ?? 1) || 1,
      userAgent: metadata?.userAgent ?? null,
      createdAt: row?.createdAt,
    };
  });
}

export function buildAuthLogsPromptTemplate({ question, email, ip, logs }) {
  return [
    "You are an auth security analyst.",
    "Return strict JSON with keys: Summary, RootCause, RiskLevel, Suggestions.",
    "RiskLevel must be one of: LOW, MEDIUM, HIGH.",
    "Keep output concise and actionable.",
    "",
    `Question: ${question}`,
    `Filters -> email: ${email || "none"}, ip: ${ip || "none"}`,
    `Logs (${logs.length}): ${JSON.stringify(logs)}`,
  ].join("\n");
}

function fallbackAnalysis(question, logs) {
  const failures = logs.filter((x) => String(x.status) === "FAILURE");
  const invalidOtp = failures.filter((x) => String(x.reason) === "INVALID_OTP").length;
  const expiredOtp = failures.filter((x) => String(x.reason) === "EXPIRED_OTP").length;
  const locked = failures.filter(
    (x) => String(x.reason) === "MAX_ATTEMPTS_EXCEEDED"
  ).length;

  let risk = "LOW";
  if (failures.length >= 10 || locked > 0) risk = "HIGH";
  else if (failures.length >= 4) risk = "MEDIUM";

  return {
    Summary: `Analyzed ${logs.length} auth logs for: ${question}`,
    RootCause:
      locked > 0
        ? "Multiple OTP retries reached max-attempt threshold."
        : invalidOtp > expiredOtp
          ? "Most failures are invalid OTP submissions."
          : expiredOtp > 0
            ? "Many OTP submissions arrived after expiration."
            : failures.length
              ? "Auth failures detected with mixed causes."
              : "No significant auth failures in selected logs.",
    RiskLevel: risk,
    Suggestions: [
      "Apply progressive delay after each failed OTP attempt.",
      "Shorten resend cooldown and show clear OTP expiry timer in UI.",
      "Alert on repeated failures per email/IP within 15 minutes.",
    ],
  };
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(String(raw || "").trim());
  } catch {
    return null;
  }
}

function normalizeAiPayload(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  const summary = String(payload.Summary ?? "").trim() || fallback.Summary;
  const rootCause = String(payload.RootCause ?? "").trim() || fallback.RootCause;
  const allowedRisk = new Set(["LOW", "MEDIUM", "HIGH"]);
  const riskRaw = String(payload.RiskLevel ?? "").trim().toUpperCase();
  const risk = allowedRisk.has(riskRaw) ? riskRaw : fallback.RiskLevel;
  const suggestions = Array.isArray(payload.Suggestions)
    ? payload.Suggestions.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 5)
    : fallback.Suggestions;
  return {
    Summary: summary,
    RootCause: rootCause,
    RiskLevel: risk,
    Suggestions: suggestions.length ? suggestions : fallback.Suggestions,
  };
}

export async function analyzeAuthLogs({ email, ip, question }) {
  const emailFilter = normalize(email)?.toLowerCase();
  const ipFilter = normalize(ip);

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT "eventType", "status", "ipAddress", "metadata", "createdAt"
      FROM "AuthEvent"
      WHERE ($1::text IS NULL OR LOWER(COALESCE("metadata"->>'email','')) = LOWER($1))
        AND ($2::text IS NULL OR COALESCE("ipAddress",'') = $2)
      ORDER BY "createdAt" DESC
      LIMIT ${MAX_LOGS}
    `,
    emailFilter ?? null,
    ipFilter ?? null
  );

  const logs = normalizeRows(rows);
  const fallback = fallbackAnalysis(question, logs);
  const prompt = buildAuthLogsPromptTemplate({
    question,
    email: emailFilter,
    ip: ipFilter,
    logs,
  });

  const config = aiConfig();
  if (!config.enabled) {
    return { ...fallback, source: "rule_based", logsAnalyzed: logs.length, promptTemplate: prompt };
  }

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
              "You are an authentication security analyst. Return strict JSON with keys: Summary, RootCause, RiskLevel, Suggestions.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      return { ...fallback, source: "rule_based", logsAnalyzed: logs.length, promptTemplate: prompt };
    }
    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const parsed = parseJsonSafe(raw);
    const ai = normalizeAiPayload(parsed, fallback);
    return { ...ai, source: "ai", logsAnalyzed: logs.length, promptTemplate: prompt };
  } catch {
    return { ...fallback, source: "rule_based", logsAnalyzed: logs.length, promptTemplate: prompt };
  }
}
