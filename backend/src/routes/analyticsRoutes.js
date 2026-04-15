import express from "express";
import {
  getAuthAnalytics,
  getAuthAnalyticsInsights,
  askAuthAnalyticsAssistant,
  analyzeAuthLogsWithAi,
  getAuthEventsList,
  getAuthUsersList,
} from "../controller/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAnalyticsListAccess } from "../middleware/analyticsAdminMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  askAuthAssistantSchema,
  analyzeAuthLogsSchema,
} from "../validators/analyticsValidators.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/auth", authMiddleware, getAuthAnalytics);
analyticsRouter.get("/auth/events", requireAnalyticsListAccess, getAuthEventsList);
analyticsRouter.get("/auth/users", requireAnalyticsListAccess, getAuthUsersList);
analyticsRouter.get("/auth/insights", authMiddleware, getAuthAnalyticsInsights);
analyticsRouter.post(
  "/auth/ask",
  authMiddleware,
  validateRequest(askAuthAssistantSchema),
  askAuthAnalyticsAssistant
);
analyticsRouter.post(
  "/auth/logs/analyze",
  authMiddleware,
  validateRequest(analyzeAuthLogsSchema),
  analyzeAuthLogsWithAi
);

export default analyticsRouter;
