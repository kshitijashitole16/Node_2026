import { prisma } from "../config/db.js";
import {
  AUTH_EVENT_STATUS,
  AUTH_EVENT_TYPE,
  isAuthEventTableAvailable,
} from "./authEventService.js";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const DEFAULT_TOP_FAILURE_IPS = 5;
const MAX_TOP_FAILURE_IPS = 50;

function asInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseDateOnly(label, raw) {
  const value = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${label} is invalid`);
  }
  return date;
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function createDateBuckets(fromDate, toDateInclusive) {
  const buckets = [];
  for (
    let cursor = new Date(fromDate);
    cursor <= toDateInclusive;
    cursor = addDays(cursor, 1)
  ) {
    buckets.push(toISODate(cursor));
  }
  return buckets;
}

function toNumber(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function percent(success, total) {
  if (!total) return 0;
  return Number(((success / total) * 100).toFixed(2));
}

function emptyAnalytics(range) {
  return {
    range,
    charts: {
      dailyLogins: [],
      dailyFailures: [],
      dailyOtp: [],
    },
    totals: {
      logins: { success: 0, failure: 0, total: 0, successRate: 0 },
      otp: { success: 0, failure: 0, total: 0, successRate: 0 },
      uniqueSuccessfulLoginUsers: 0,
    },
    breakdownByEventType: {
      [AUTH_EVENT_TYPE.LOGIN]: { success: 0, failure: 0, total: 0 },
      [AUTH_EVENT_TYPE.OTP_EMAIL_VERIFICATION]: {
        success: 0,
        failure: 0,
        total: 0,
      },
      [AUTH_EVENT_TYPE.OTP_PASSWORD_RESET]: { success: 0, failure: 0, total: 0 },
    },
    topFailureIps: [],
    generatedAt: new Date().toISOString(),
    meta: { tableReady: false },
  };
}

async function userBasedFallbackAnalytics(range, tableReady) {
  const userRows = await prisma.$queryRawUnsafe(
    `
      SELECT
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "day",
        COUNT(*)::int AS "count"
      FROM "User"
      WHERE "createdAt" >= $1
        AND "createdAt" < $2
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    range.fromDate,
    range.toDateExclusive
  );

  const dayBuckets = createDateBuckets(range.fromDate, range.toDateInclusive);
  const userByDay = new Map((userRows ?? []).map((row) => [String(row.day), toNumber(row.count)]));
  const dailyLogins = dayBuckets.map((date) => {
    const success = userByDay.get(date) ?? 0;
    return { date, success, failure: 0, total: success };
  });

  const totalSuccess = dailyLogins.reduce((sum, row) => sum + row.success, 0);

  return {
    range: {
      from: range.from,
      to: range.to,
      days: range.days,
    },
    charts: {
      dailyLogins,
      dailyFailures: dayBuckets.map((date) => ({
        date,
        loginFailures: 0,
        otpFailures: 0,
        totalFailures: 0,
      })),
      dailyOtp: dayBuckets.map((date) => ({
        date,
        success: 0,
        failure: 0,
        total: 0,
      })),
    },
    totals: {
      logins: {
        success: totalSuccess,
        failure: 0,
        total: totalSuccess,
        successRate: totalSuccess > 0 ? 100 : 0,
      },
      otp: {
        success: 0,
        failure: 0,
        total: 0,
        successRate: 0,
      },
      uniqueSuccessfulLoginUsers: totalSuccess,
    },
    breakdownByEventType: {
      [AUTH_EVENT_TYPE.LOGIN]: { success: totalSuccess, failure: 0, total: totalSuccess },
      [AUTH_EVENT_TYPE.OTP_EMAIL_VERIFICATION]: { success: 0, failure: 0, total: 0 },
      [AUTH_EVENT_TYPE.OTP_PASSWORD_RESET]: { success: 0, failure: 0, total: 0 },
    },
    topFailureIps: [],
    generatedAt: new Date().toISOString(),
    meta: {
      tableReady,
      fallback: "user_createdAt",
      note: 'AuthEvent is unavailable or empty. Showing user-signup trend as fallback.',
    },
  };
}

export function resolveAnalyticsRange(query = {}) {
  const hasFrom = query.from != null && String(query.from).trim() !== "";
  const hasTo = query.to != null && String(query.to).trim() !== "";

  let fromDate;
  let toDateInclusive;

  if (hasFrom || hasTo) {
    if (!hasFrom || !hasTo) {
      throw new Error("Both from and to are required when filtering by date");
    }
    fromDate = parseDateOnly("from", query.from);
    toDateInclusive = parseDateOnly("to", query.to);
    if (fromDate > toDateInclusive) {
      throw new Error("from must be before or equal to to");
    }
  } else {
    const daysRaw = asInt(query.days, DEFAULT_DAYS);
    const days = Math.min(Math.max(daysRaw, 1), MAX_DAYS);
    const todayUTC = parseDateOnly("today", toISODate(new Date()));
    toDateInclusive = todayUTC;
    fromDate = addDays(todayUTC, -(days - 1));
  }

  const daySpan = Math.floor(
    (toDateInclusive.getTime() - fromDate.getTime()) / 86_400_000
  ) + 1;

  return {
    fromDate,
    toDateInclusive,
    toDateExclusive: addDays(toDateInclusive, 1),
    from: toISODate(fromDate),
    to: toISODate(toDateInclusive),
    days: daySpan,
  };
}

export async function fetchAuthAnalytics(query = {}) {
  const range = resolveAnalyticsRange(query);
  const topFailureIps = Math.min(
    Math.max(asInt(query.topFailureIps, DEFAULT_TOP_FAILURE_IPS), 1),
    MAX_TOP_FAILURE_IPS
  );

  const tableReady = await isAuthEventTableAvailable();
  if (!tableReady) {
    return userBasedFallbackAnalytics(range, false);
  }

  const [dailyRows, totalsRows, topFailureIpRows, uniqueLoginUsersRows] =
    await Promise.all([
      prisma.$queryRawUnsafe(
        `
        SELECT
          to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "day",
          COUNT(*) FILTER (
            WHERE "eventType" = 'LOGIN' AND "status" = 'SUCCESS'
          )::int AS "loginSuccess",
          COUNT(*) FILTER (
            WHERE "eventType" = 'LOGIN' AND "status" = 'FAILURE'
          )::int AS "loginFailure",
          COUNT(*) FILTER (
            WHERE "eventType" IN ('OTP_EMAIL_VERIFICATION', 'OTP_PASSWORD_RESET')
              AND "status" = 'SUCCESS'
          )::int AS "otpSuccess",
          COUNT(*) FILTER (
            WHERE "eventType" IN ('OTP_EMAIL_VERIFICATION', 'OTP_PASSWORD_RESET')
              AND "status" = 'FAILURE'
          )::int AS "otpFailure",
          COUNT(*) FILTER (
            WHERE "status" = 'FAILURE'
          )::int AS "totalFailure"
        FROM "AuthEvent"
        WHERE "createdAt" >= $1
          AND "createdAt" < $2
        GROUP BY 1
        ORDER BY 1 ASC
      `,
        range.fromDate,
        range.toDateExclusive
      ),
      prisma.$queryRawUnsafe(
        `
        SELECT
          "eventType",
          "status",
          COUNT(*)::int AS "count"
        FROM "AuthEvent"
        WHERE "createdAt" >= $1
          AND "createdAt" < $2
        GROUP BY 1, 2
      `,
        range.fromDate,
        range.toDateExclusive
      ),
      prisma.$queryRawUnsafe(
        `
        SELECT
          COALESCE(NULLIF("ipAddress", ''), 'unknown') AS "ipAddress",
          COUNT(*)::int AS "count"
        FROM "AuthEvent"
        WHERE "status" = 'FAILURE'
          AND "createdAt" >= $1
          AND "createdAt" < $2
        GROUP BY 1
        ORDER BY "count" DESC
        LIMIT $3
      `,
        range.fromDate,
        range.toDateExclusive,
        topFailureIps
      ),
      prisma.$queryRawUnsafe(
        `
        SELECT
          COUNT(DISTINCT "userId")::int AS "count"
        FROM "AuthEvent"
        WHERE "eventType" = 'LOGIN'
          AND "status" = 'SUCCESS'
          AND "userId" IS NOT NULL
          AND "createdAt" >= $1
          AND "createdAt" < $2
      `,
        range.fromDate,
        range.toDateExclusive
      ),
    ]);

  const dayBuckets = createDateBuckets(range.fromDate, range.toDateInclusive);
  const dailyMap = new Map(
    (dailyRows ?? []).map((row) => [
      String(row.day),
      {
        loginSuccess: toNumber(row.loginSuccess),
        loginFailure: toNumber(row.loginFailure),
        otpSuccess: toNumber(row.otpSuccess),
        otpFailure: toNumber(row.otpFailure),
        totalFailure: toNumber(row.totalFailure),
      },
    ])
  );

  const dailyLogins = [];
  const dailyFailures = [];
  const dailyOtp = [];
  for (const date of dayBuckets) {
    const row = dailyMap.get(date) ?? {
      loginSuccess: 0,
      loginFailure: 0,
      otpSuccess: 0,
      otpFailure: 0,
      totalFailure: 0,
    };

    dailyLogins.push({
      date,
      success: row.loginSuccess,
      failure: row.loginFailure,
      total: row.loginSuccess + row.loginFailure,
    });

    dailyFailures.push({
      date,
      loginFailures: row.loginFailure,
      otpFailures: row.otpFailure,
      totalFailures: row.totalFailure,
    });

    dailyOtp.push({
      date,
      success: row.otpSuccess,
      failure: row.otpFailure,
      total: row.otpSuccess + row.otpFailure,
    });
  }

  const breakdownByEventType = {
    [AUTH_EVENT_TYPE.LOGIN]: { success: 0, failure: 0, total: 0 },
    [AUTH_EVENT_TYPE.OTP_EMAIL_VERIFICATION]: { success: 0, failure: 0, total: 0 },
    [AUTH_EVENT_TYPE.OTP_PASSWORD_RESET]: { success: 0, failure: 0, total: 0 },
  };

  for (const row of totalsRows ?? []) {
    const eventType = String(row.eventType ?? "");
    const status = String(row.status ?? "");
    const count = toNumber(row.count);
    if (!breakdownByEventType[eventType]) continue;
    if (status === AUTH_EVENT_STATUS.SUCCESS) {
      breakdownByEventType[eventType].success += count;
    } else if (status === AUTH_EVENT_STATUS.FAILURE) {
      breakdownByEventType[eventType].failure += count;
    }
    breakdownByEventType[eventType].total += count;
  }

  const loginTotals = breakdownByEventType[AUTH_EVENT_TYPE.LOGIN];
  const otpSuccess =
    breakdownByEventType[AUTH_EVENT_TYPE.OTP_EMAIL_VERIFICATION].success +
    breakdownByEventType[AUTH_EVENT_TYPE.OTP_PASSWORD_RESET].success;
  const otpFailure =
    breakdownByEventType[AUTH_EVENT_TYPE.OTP_EMAIL_VERIFICATION].failure +
    breakdownByEventType[AUTH_EVENT_TYPE.OTP_PASSWORD_RESET].failure;
  const otpTotal = otpSuccess + otpFailure;

  const eventRowsCount = (dailyRows ?? []).length;
  if (eventRowsCount === 0) {
    return userBasedFallbackAnalytics(range, true);
  }

  return {
    range: {
      from: range.from,
      to: range.to,
      days: range.days,
    },
    charts: {
      dailyLogins,
      dailyFailures,
      dailyOtp,
    },
    totals: {
      logins: {
        success: loginTotals.success,
        failure: loginTotals.failure,
        total: loginTotals.total,
        successRate: percent(loginTotals.success, loginTotals.total),
      },
      otp: {
        success: otpSuccess,
        failure: otpFailure,
        total: otpTotal,
        successRate: percent(otpSuccess, otpTotal),
      },
      uniqueSuccessfulLoginUsers: toNumber(uniqueLoginUsersRows?.[0]?.count),
    },
    breakdownByEventType,
    topFailureIps: (topFailureIpRows ?? []).map((row) => ({
      ipAddress: String(row.ipAddress ?? "unknown"),
      count: toNumber(row.count),
    })),
    generatedAt: new Date().toISOString(),
    meta: { tableReady: true },
  };
}
