import { getAccessToken, type AuthUser } from "./token";

export type ApiError = Error & {
  status?: number;
  data?: unknown;
};

export type FastAuthClientConfig = {
  baseUrl: string;
  withCredentials?: boolean;
  getAccessToken?: () => string | null;
  /** Matches server `FAST_AUTH_ADMIN_SECRET` for GET /analytics/auth/events and /users. */
  analyticsAdminToken?: string;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
};

export type SendOtpPurpose =
  | "RegisterAuthOtp"
  | "ForgotAuthOtp"
  | "Authify_Register_user"
  | "Authify_Forgot_password";

export type SendOtpInput = {
  email?: string;
  phone?: string;
  purpose: SendOtpPurpose;
  name?: string;
  password?: string;
};

export type VerifyOtpInput = {
  email?: string;
  phone?: string;
  otp: string;
  purpose: SendOtpPurpose;
};

export type FastAuthResponse<TData> = {
  status: string;
  message?: string;
  data: TData;
};

export type VerifyOtpData<TUser extends AuthUser = AuthUser> = {
  accessToken: string;
  user: TUser;
};

export type RefreshTokenData = {
  accessToken: string;
};

export type CurrentUserData<TUser extends AuthUser = AuthUser> = {
  user: TUser;
};

export type AuthEventRow = {
  id: string;
  userId: string | null;
  eventType: string;
  status: string;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: string; email: string; name: string } | null;
};

export type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

export class FastAuthApiClient {
  private readonly baseUrl: string;
  private readonly withCredentials: boolean;
  private readonly readToken: () => string | null;
  private readonly analyticsAdminToken?: string;

  constructor(config: FastAuthClientConfig) {
    this.baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
    this.withCredentials = config.withCredentials ?? true;
    this.readToken = config.getAccessToken ?? getAccessToken;
    this.analyticsAdminToken = config.analyticsAdminToken?.trim() || undefined;
    if (!this.baseUrl) {
      throw new Error("FastAuthApiClient requires a non-empty baseUrl");
    }
  }

  async sendOtp(input: SendOtpInput): Promise<FastAuthResponse<Record<string, unknown>>> {
    return this.request("/auth/send-otp", {
      method: "POST",
      body: input,
      auth: false,
    });
  }

  async verifyOtp<TUser extends AuthUser = AuthUser>(
    input: VerifyOtpInput
  ): Promise<FastAuthResponse<VerifyOtpData<TUser>>> {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: input,
      auth: false,
    });
  }

  async refreshToken(): Promise<FastAuthResponse<RefreshTokenData>> {
    return this.request("/auth/refresh-token", {
      method: "POST",
      auth: false,
    });
  }

  async getCurrentUser<TUser extends AuthUser = AuthUser>(): Promise<
    FastAuthResponse<CurrentUserData<TUser>>
  > {
    return this.request("/auth/get-current-user", {
      method: "GET",
      auth: true,
    });
  }

  async logout(): Promise<FastAuthResponse<Record<string, unknown>>> {
    return this.request("/auth/logout", {
      method: "POST",
      auth: true,
    });
  }

  /** Email + password sign-in; sets httpOnly cookies server-side and returns access token + user. */
  async loginWithPassword<TUser extends AuthUser = AuthUser>(input: {
    email: string;
    password: string;
  }): Promise<FastAuthResponse<VerifyOtpData<TUser>>> {
    return this.request("/auth/login", {
      method: "POST",
      body: { email: input.email.trim().toLowerCase(), password: input.password },
      auth: false,
    });
  }

  async resetPassword(input: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<FastAuthResponse<Record<string, unknown>>> {
    return this.request("/auth/forgot-password/reset", {
      method: "POST",
      body: {
        email: input.email.trim().toLowerCase(),
        otp: input.otp.trim(),
        newPassword: input.newPassword,
        confirmPassword: input.confirmPassword,
      },
      auth: false,
    });
  }

  /** Aggregated charts and totals (same payload as backend GET /analytics/auth). */
  async getAuthAnalytics(
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<FastAuthResponse<Record<string, unknown>>> {
    const qs = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        qs.set(k, String(v));
      }
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/analytics/auth${suffix}`, {
      method: "GET",
      auth: true,
    });
  }

  async getAuthEventsPage(input?: {
    limit?: number;
    offset?: number;
  }): Promise<
    FastAuthResponse<{
      items: AuthEventRow[];
      total: number;
      meta: { tableReady: boolean; limit: number; offset: number };
    }>
  > {
    const qs = new URLSearchParams();
    if (input?.limit != null) qs.set("limit", String(input.limit));
    if (input?.offset != null) qs.set("offset", String(input.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/analytics/auth/events${suffix}`, {
      method: "GET",
      auth: true,
    });
  }

  async getUsersPage(input?: {
    page?: number;
    limit?: number;
  }): Promise<
    FastAuthResponse<{
      items: DashboardUserRow[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>
  > {
    const qs = new URLSearchParams();
    if (input?.page != null) qs.set("page", String(input.page));
    if (input?.limit != null) qs.set("limit", String(input.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/analytics/auth/users${suffix}`, {
      method: "GET",
      auth: true,
    });
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      auth: boolean;
    }
  ): Promise<T> {
    const headers = new Headers();
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth) {
      const token = this.readToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    if (
      this.analyticsAdminToken &&
      (path.includes("/analytics/auth/events") || path.includes("/analytics/auth/users"))
    ) {
      headers.set("x-admin-token", this.analyticsAdminToken);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: this.withCredentials ? "include" : "same-origin",
    });

    const text = await res.text();
    const data = text ? this.parseJson(text) : null;
    if (!res.ok) {
      const err = new Error(
        (data as Record<string, string> | null)?.error ||
          (data as Record<string, string> | null)?.message ||
          "Request failed"
      ) as ApiError;
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
}

/**
 * Minimal reusable fetch client factory for SDK use-cases.
 * Uses native fetch only and injects bearer token when auth=true.
 */
export function createApiClient(config: FastAuthClientConfig) {
  const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
  const withCredentials = config.withCredentials ?? true;
  const readToken = config.getAccessToken ?? getAccessToken;

  if (!baseUrl) {
    throw new Error("createApiClient requires a non-empty baseUrl");
  }

  return async function request<T = unknown>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const method = options.method ?? "GET";
    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined;

    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth) {
      const token = readToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      credentials: withCredentials ? "include" : "same-origin",
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const error = new Error(
        (data as Record<string, string> | null)?.error ||
          (data as Record<string, string> | null)?.message ||
          "Request failed"
      ) as ApiError;
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
