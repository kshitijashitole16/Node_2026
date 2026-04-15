import { getAccessToken } from "./token";
export class FastAuthApiClient {
    constructor(config) {
        this.baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
        this.withCredentials = config.withCredentials ?? true;
        this.readToken = config.getAccessToken ?? getAccessToken;
        this.analyticsAdminToken = config.analyticsAdminToken?.trim() || undefined;
        if (!this.baseUrl) {
            throw new Error("FastAuthApiClient requires a non-empty baseUrl");
        }
    }
    async sendOtp(input) {
        return this.request("/auth/send-otp", {
            method: "POST",
            body: input,
            auth: false,
        });
    }
    async verifyOtp(input) {
        return this.request("/auth/verify-otp", {
            method: "POST",
            body: input,
            auth: false,
        });
    }
    async refreshToken() {
        return this.request("/auth/refresh-token", {
            method: "POST",
            auth: false,
        });
    }
    async getCurrentUser() {
        return this.request("/auth/get-current-user", {
            method: "GET",
            auth: true,
        });
    }
    async logout() {
        return this.request("/auth/logout", {
            method: "POST",
            auth: true,
        });
    }
    /** Email + password sign-in; sets httpOnly cookies server-side and returns access token + user. */
    async loginWithPassword(input) {
        return this.request("/auth/login", {
            method: "POST",
            body: { email: input.email.trim().toLowerCase(), password: input.password },
            auth: false,
        });
    }
    async resetPassword(input) {
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
    async getAuthAnalytics(query) {
        const qs = new URLSearchParams();
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v === undefined)
                    continue;
                qs.set(k, String(v));
            }
        }
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return this.request(`/analytics/auth${suffix}`, {
            method: "GET",
            auth: true,
        });
    }
    async getAuthEventsPage(input) {
        const qs = new URLSearchParams();
        if (input?.limit != null)
            qs.set("limit", String(input.limit));
        if (input?.offset != null)
            qs.set("offset", String(input.offset));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return this.request(`/analytics/auth/events${suffix}`, {
            method: "GET",
            auth: true,
        });
    }
    async getUsersPage(input) {
        const qs = new URLSearchParams();
        if (input?.page != null)
            qs.set("page", String(input.page));
        if (input?.limit != null)
            qs.set("limit", String(input.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return this.request(`/analytics/auth/users${suffix}`, {
            method: "GET",
            auth: true,
        });
    }
    async request(path, options) {
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
        if (this.analyticsAdminToken &&
            (path.includes("/analytics/auth/events") || path.includes("/analytics/auth/users"))) {
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
            const err = new Error(data?.error ||
                data?.message ||
                "Request failed");
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }
    parseJson(text) {
        try {
            return JSON.parse(text);
        }
        catch {
            return { message: text };
        }
    }
}
/**
 * Minimal reusable fetch client factory for SDK use-cases.
 * Uses native fetch only and injects bearer token when auth=true.
 */
export function createApiClient(config) {
    const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
    const withCredentials = config.withCredentials ?? true;
    const readToken = config.getAccessToken ?? getAccessToken;
    if (!baseUrl) {
        throw new Error("createApiClient requires a non-empty baseUrl");
    }
    return async function request(path, options = {}) {
        const method = options.method ?? "GET";
        const headers = new Headers(options.headers || {});
        const hasBody = options.body !== undefined;
        if (hasBody && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        if (options.auth) {
            const token = readToken();
            if (token)
                headers.set("Authorization", `Bearer ${token}`);
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
            const error = new Error(data?.error ||
                data?.message ||
                "Request failed");
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return data;
    };
}
function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return { message: text };
    }
}
