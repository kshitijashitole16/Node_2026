import express from "express";
import {
  getCurrentUserController,
  logoutController,
  refreshTokenController,
  sendOtpController,
  verifyOtpController,
} from "../controller/secureAuthController.js";
import { secureAuthMiddleware } from "../middleware/secureAuthMiddleware.js";

const secureAuthRouter = express.Router();

secureAuthRouter.post("/send-otp", sendOtpController);
secureAuthRouter.post("/verify-otp", verifyOtpController);
secureAuthRouter.post("/refresh-token", refreshTokenController);
secureAuthRouter.get("/get-current-user", secureAuthMiddleware, getCurrentUserController);
secureAuthRouter.post("/logout", logoutController);

export default secureAuthRouter;
