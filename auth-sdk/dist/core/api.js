import { getAccessToken } from "./token";
export class FastAuthApiClient {
    constructor(config) {
        this.baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
        this.withCredentials = config.withCredentials ?? true;
        this.readToken = config.getAccessToken ?? getAccessToken;
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
