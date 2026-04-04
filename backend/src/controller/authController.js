import prismaPkg from "@prisma/client";
import { prisma } from "../config/db.js";

const { Prisma } = prismaPkg;
import bcrypt from "bcryptjs";
import {
  issueTokens,
  createAccessTokenFromRefreshToken,
  clearAuthCookies,
} from "../utils/generateToken.js";

const DB_UNAVAILABLE_MSG =
  "Database unreachable or timed out. Open the Neon console to wake the project, check DATABASE_URL, try a \"Direct\" connection string if the pooler times out, and ensure port 5432 is not blocked (VPN / firewall).";

function isDbConnectivityError(error) {
  const code = error?.code;
  if (
    code === "P1001" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }
  const msg = String(error?.message ?? "");
  return /Can't reach database|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connection.*(timed out|timeout)|connect timeout|P1001/i.test(
    msg
  );
}

function handleAuthError(res, error) {
  console.error(error);
  const dev = process.env.NODE_ENV !== "production";

  if (isDbConnectivityError(error)) {
    return res.status(503).json({
      error: DB_UNAVAILABLE_MSG,
      ...(dev && { code: error.code }),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "User already exists with this email",
      });
    }
    if (error.code === "P2021" || error.code === "P2022") {
      return res.status(503).json({
        error:
          "Database schema is out of date. Run: cd backend && npx prisma migrate deploy",
        ...(dev && { code: error.code }),
      });
    }
    return res.status(500).json({
      error: "Database error",
      ...(dev && { code: error.code, detail: error.message }),
    });
  }

  if (
    String(error.message).includes("JWT_") &&
    String(error.message).includes("missing")
  ) {
    return res.status(500).json({ error: error.message });
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  return res.status(500).json({
    error: "Internal Server Error",
    ...(dev && { detail: error?.message }),
  });
}

/** Postgres unique email is case-sensitive; store lowercase and match case-insensitively for login. */
function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

async function findUserByEmailCaseInsensitive(emailNorm) {
  return prisma.user.findFirst({
    where: {
      email: { equals: emailNorm, mode: "insensitive" },
    },
  });
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        error: "name, email, and password are required",
      });
    }

    const emailNorm = normalizeEmail(email);

    const userExist = await findUserByEmailCaseInsensitive(emailNorm);

    if (userExist) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(String(password), salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        password: hashPassword,
      },
    });
    const accessToken = issueTokens(user.id, res);

    return res.status(201).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessToken,
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

    const emailNorm = normalizeEmail(email);

    const user = await findUserByEmailCaseInsensitive(emailNorm);

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res
        .status(401)
        .json({ error: "Invalid email or password" });
    }
    const accessToken = issueTokens(user.id, res);

    return res.status(200).json({
      status: "Success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessToken,
      },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "No refresh token" });
    }

    const accessToken = createAccessTokenFromRefreshToken(refreshToken, res);
    if (!accessToken) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    return res.status(200).json({
      status: "Success",
      data: { accessToken },
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

const logout = async (req, res) => {
  clearAuthCookies(res);

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

    const emailNorm = normalizeEmail(email);

    const user = await findUserByEmailCaseInsensitive(emailNorm);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(String(password), user.password);
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

export { register, login, refresh, logout, deleteAccount };
