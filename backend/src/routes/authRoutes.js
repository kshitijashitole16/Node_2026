import express from "express";
import {
  register,
  login,
  logout,
  deleteAccount,
} from "../controller/authController.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/register",validateRequest(registerSchema), register);
router.post("/login",validateRequest(loginSchema), login);
router.post("/logout", logout);
router.delete("/account",validateRequest(loginSchema), deleteAccount);

export default router;
