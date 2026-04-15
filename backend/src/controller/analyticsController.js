import { prisma } from "../config/db.js";
import { fetchAuthAnalytics } from "../services/authAnalyticsService.js";
import { generateAuthInsights } from "../services/aiInsightsService.js";
import {
  parseAuthQuestionToQuery,
  runAuthAssistant,
} from "../services/authAssistantService.js";
import { analyzeAuthLogs } from "../services/authLogAnalysisService.js";
import { isAuthEventTableAvailable } from "../services/authEventService.js";

function parseBoolean(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function handleAnalyticsError(res, error) {
  const message = String(error?.message ?? "");
  if (
    /YYYY-MM-DD|from must be before|Both from and to|invalid|required when filtering/i.test(
      message
    )
  ) {
    return res.status(400).json({ error: message });
  }

  console.error("[analytics] error:", error);
  return res.status(500).json({
    error: "Failed to fetch auth analytics",
    detail: process.env.NODE_ENV === "production" ? undefined : message,
  });
}

const getAuthAnalytics = async (req, res) => {
  try {
    const includeInsights = parseBoolean(req.query.includeInsights);
    const analytics = await fetchAuthAnalytics(req.query);
    const aiInsights = includeInsights
      ? await generateAuthInsights(analytics)
      : null;

    return res.status(200).json({
      status: "Success",
      data: {
        ...analytics,
        ...(aiInsights ? { aiInsights } : {}),
      },
    });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

const getAuthAnalyticsInsights = async (req, res) => {
  try {
    const analytics = await fetchAuthAnalytics(req.query);
    const aiInsights = await generateAuthInsights(analytics);

    return res.status(200).json({
      status: "Success",
      data: {
        range: analytics.range,
        totals: analytics.totals,
        topFailureIps: analytics.topFailureIps,
        aiInsights,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

const askAuthAnalyticsAssistant = async (req, res) => {
  try {
    const includeDataPreview =
      req.body.includeDataPreview === undefined
        ? true
        : Boolean(req.body.includeDataPreview);
    const question = String(req.body.question ?? "").trim();

    const parsed = parseAuthQuestionToQuery(question, {
      days: req.body.days,
      from: req.body.from,
      to: req.body.to,
    });
    const analytics = await fetchAuthAnalytics(parsed.query);
    const assistant = await runAuthAssistant({
      question,
      parsed,
      analytics,
    });

    const previewMap = {
      dailyLogins: analytics?.charts?.dailyLogins ?? [],
      dailyFailures: analytics?.charts?.dailyFailures ?? [],
      dailyOtp: analytics?.charts?.dailyOtp ?? [],
    };

    const previewSeries = previewMap[parsed.preferredChart] ?? previewMap.dailyLogins;
    return res.status(200).json({
      status: "Success",
      data: {
        question,
        parsedQuery: {
          intent: parsed.intent,
          focus: parsed.focus,
          preferredChart: parsed.preferredChart,
          appliedRange: analytics.range,
          query: parsed.query,
        },
        response: {
          summary: assistant.summary,
          insights: assistant.insights,
          suggestions: assistant.suggestions,
        },
        ...(includeDataPreview && {
          dataPreview: {
            chart: parsed.preferredChart,
            points: previewSeries.slice(-14),
          },
        }),
        meta: {
          source: assistant.source,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

const analyzeAuthLogsWithAi = async (req, res) => {
  try {
    const question = String(req.body.question ?? "").trim();
    const email = req.body.email;
    const ip = req.body.ip;
    const result = await analyzeAuthLogs({ question, email, ip });
    return res.status(200).json({
      status: "Success",
      data: {
        Summary: result.Summary,
        RootCause: result.RootCause,
        RiskLevel: result.RiskLevel,
        Suggestions: result.Suggestions,
        meta: {
          source: result.source,
          logsAnalyzed: result.logsAnalyzed,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

function parseLimit(value, fallback, max) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}

/** Paginated AuthEvent rows for operator dashboards (requires auth). */
const getAuthEventsList = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 200);
    const offset = Math.max(Number.parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
    const tableReady = await isAuthEventTableAvailable();
    if (!tableReady) {
      return res.status(200).json({
        status: "Success",
        data: {
          items: [],
          total: 0,
          meta: { tableReady: false, limit, offset },
        },
      });
    }

    const [items, total] = await Promise.all([
      prisma.authEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.authEvent.count(),
    ]);

    const serialized = items.map((row) => ({
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      status: row.status,
      ipAddress: row.ipAddress,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      user: row.user
        ? { id: row.user.id, email: row.user.email, name: row.user.name }
        : null,
    }));

    return res.status(200).json({
      status: "Success",
      data: {
        items: serialized,
        total,
        meta: { tableReady: true, limit, offset },
      },
    });
  } catch (error) {
    console.error("[analytics] auth events list:", error);
    return res.status(500).json({ error: "Failed to fetch auth events" });
  }
};

/** Paginated User rows (no passwords) for dashboards (requires auth). */
const getAuthUsersList = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 25, 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.user.count(),
    ]);

    return res.status(200).json({
      status: "Success",
      data: {
        items: items.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[analytics] users list:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

export {
  getAuthAnalytics,
  getAuthAnalyticsInsights,
  askAuthAnalyticsAssistant,
  analyzeAuthLogsWithAi,
  getAuthEventsList,
  getAuthUsersList,
};
