import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

function handleAuthError(res, error) {
  console.error(error);
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return res.status(503).json({
      error:
        "Database unreachable. Confirm DATABASE_URL, wake the Neon project, and check your network.",
    });
  }
  if (String(error.message).includes("JWT_SECRET")) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(500).json({ error: "Internal Server Error" });
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        error: "name, email, and password are required",
      });
    }

    const emailNorm = email.trim();

    const userExist = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (userExist) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        password: hashPassword,
      },
    });
    // jwt token
    const token = generateToken(user.id, res);

    return res.status(201).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const emailNorm = email.trim();

    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }
    const token = generateToken(user.id, res);

    return res.status(200).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const logout = async (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({
    status: "Success",
    message: "Logged out successfully",
  });
};

const deleteAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    const emailNorm = email.trim();

    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ error: "Account not found" });
    }
    return handleAuthError(res, error);
  }
};

export { register, login, logout, deleteAccount };
