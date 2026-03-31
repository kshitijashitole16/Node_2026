import express from "express";
import {
  register,
  login,
  logout,
  deleteAccount,
} from "../controller/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.delete("/account", deleteAccount);

export default router;
