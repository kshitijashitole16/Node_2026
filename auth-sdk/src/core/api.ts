import { getAccessToken, type AuthUser } from "./token";

export type ApiError = Error & {
  status?: number;
  data?: unknown;
};

export type FastAuthClientConfig = {
  baseUrl: string;
  withCredentials?: boolean;
  getAccessToken?: () => string | null;
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

export class FastAuthApiClient {
  private readonly baseUrl: string;
  private readonly withCredentials: boolean;
  private readonly readToken: () => string | null;

  constructor(config: FastAuthClientConfig) {
    this.baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
    this.withCredentials = config.withCredentials ?? true;
    this.readToken = config.getAccessToken ?? getAccessToken;
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
