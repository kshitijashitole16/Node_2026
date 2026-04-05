import nodemailer from "nodemailer";

function smtpEnv() {
  const passRaw = process.env.SMTP_PASS ?? "";
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER?.trim(),
    pass: passRaw.replace(/\s+/g, "").trim(),
  };
}

export function isEmailConfigured() {
  const { user, pass } = smtpEnv();
  return Boolean(user && pass);
}

export function getTransporter() {
  const { host, port, user, pass } = smtpEnv();
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}
