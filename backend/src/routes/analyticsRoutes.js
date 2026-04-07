import express from "express";
import {
  getAuthAnalytics,
  getAuthAnalyticsInsights,
  askAuthAnalyticsAssistant,
  analyzeAuthLogsWithAi,
} from "../controller/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  askAuthAssistantSchema,
  analyzeAuthLogsSchema,
} from "../validators/analyticsValidators.js";

const analyticsRouter = express.Router();

analyticsRouter.use(authMiddleware);
analyticsRouter.get("/auth", getAuthAnalytics);
analyticsRouter.get("/auth/insights", getAuthAnalyticsInsights);
analyticsRouter.post(
  "/auth/ask",
  validateRequest(askAuthAssistantSchema),
  askAuthAnalyticsAssistant
);
analyticsRouter.post(
  "/auth/logs/analyze",
  validateRequest(analyzeAuthLogsSchema),
  analyzeAuthLogsWithAi
);

export default analyticsRouter;
