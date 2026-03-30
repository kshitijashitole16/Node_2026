import express from "express";
import { register, login, deleteAccount } from "../controller/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.delete("/account", deleteAccount);

export default router;
