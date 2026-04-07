import { fetchAuthAnalytics } from "../services/authAnalyticsService.js";
import { generateAuthInsights } from "../services/aiInsightsService.js";
import {
  parseAuthQuestionToQuery,
  runAuthAssistant,
} from "../services/authAssistantService.js";
import { analyzeAuthLogs } from "../services/authLogAnalysisService.js";

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

export {
  getAuthAnalytics,
  getAuthAnalyticsInsights,
  askAuthAnalyticsAssistant,
  analyzeAuthLogsWithAi,
};
