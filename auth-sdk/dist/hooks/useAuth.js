import { useCallback, useMemo, useState } from "react";
import { FastAuthApiClient, } from "../core/api";
import { clearStoredAuth, getStoredUser, setAccessToken, setStoredUser, } from "../core/token";
function normalizeIdentifier(value) {
    const out = String(value ?? "").trim();
    return out.length ? out : undefined;
}
function asApiError(error) {
    if (error instanceof Error) {
        return error;
    }
    return new Error("Unknown SDK error");
}
export function useAuthController(config) {
    const [user, setUser] = useState(() => getStoredUser());
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredUser()));
    const [state, setState] = useState({
        isLoading: false,
        action: "idle",
        error: null,
    });
    const [pending, setPending] = useState(null);
    const client = useMemo(() => new FastAuthApiClient(config), [config]);
    const begin = useCallback((action) => {
        setState({ isLoading: true, action, error: null });
    }, []);
    const done = useCallback((nextUser) => {
        if (nextUser !== undefined) {
            setUser(nextUser);
            setIsAuthenticated(Boolean(nextUser));
        }
        setState((prev) => ({ ...prev, isLoading: false, action: "idle" }));
    }, []);
    const fail = useCallback((error) => {
        setState((prev) => ({ ...prev, isLoading: false, action: "idle", error: asApiError(error) }));
    }, []);
    const loginWithPassword = useCallback(async (input) => {
        begin("loginWithPassword");
        try {
            const email = normalizeIdentifier(input.email)?.toLowerCase();
            if (!email) {
                throw new Error("Email is required.");
            }
            if (!input.password) {
                throw new Error("Password is required.");
            }
            const response = await client.loginWithPassword({
                email,
                password: input.password,
            });
            const nextUser = response.data.user;
            setAccessToken(response.data.accessToken);
            setStoredUser(nextUser);
            done(nextUser);
            return nextUser;
        }
        catch (error) {
            fail(error);
            throw error;
        }
    }, [begin, client, done, fail]);
    const loginWithOtp = useCallback(async (input) => {
        begin("loginWithOtp");
        try {
            const email = normalizeIdentifier(input.email)?.toLowerCase();
            const phone = normalizeIdentifier(input.phone);
            if (!email && !phone) {
                throw new Error("Provide either email or phone for OTP login.");
            }
            const purpose = input.purpose ?? "Authify_Register_user";
            await client.sendOtp({
                purpose,
                email,
                phone,
                name: input.name,
                password: input.password,
            });
            setPending({ purpose, email, phone });
            done();
        }
        catch (error) {
            fail(error);
            throw error;
        }
    }, [begin, client, done, fail]);
    const verifyOtp = useCallback(async (input) => {
        begin("verifyOtp");
        try {
            const code = normalizeIdentifier(input.code);
            if (!code) {
                throw new Error("OTP code is required.");
            }
            const email = normalizeIdentifier(input.email)?.toLowerCase() ?? pending?.email;
            const phone = normalizeIdentifier(input.phone) ?? pending?.phone;
            const purpose = input.purpose ?? pending?.purpose ?? "Authify_Register_user";
            if (!email && !phone) {
                throw new Error("Missing identifier. Call loginWithOtp first or pass email/phone.");
            }
            const response = await client.verifyOtp({
                purpose,
                email,
                phone,
                otp: code,
            });
            const nextUser = response.data.user;
            setAccessToken(response.data.accessToken);
            setStoredUser(nextUser);
            done(nextUser);
            return nextUser;
        }
        catch (error) {
            fail(error);
            throw error;
        }
    }, [begin, client, done, fail, pending?.email, pending?.phone, pending?.purpose]);
    const logout = useCallback(async () => {
        begin("logout");
        try {
            await client.logout();
            clearStoredAuth();
            setPending(null);
            done(null);
        }
        catch (error) {
            clearStoredAuth();
            setPending(null);
            setUser(null);
            setIsAuthenticated(false);
            fail(error);
            throw error;
        }
    }, [begin, client, done, fail]);
    const getCurrentUser = useCallback(async () => {
        begin("getCurrentUser");
        try {
            const response = await client.getCurrentUser();
            const nextUser = response.data.user;
            setStoredUser(nextUser);
            done(nextUser);
            return nextUser;
        }
        catch (error) {
            fail(error);
            return null;
        }
    }, [begin, client, done, fail]);
    const value = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading: state.isLoading,
        loadingAction: state.action,
        error: state.error,
        loginWithPassword,
        loginWithOtp,
        verifyOtp,
        logout,
        getCurrentUser,
        clearError: () => setState((prev) => ({ ...prev, error: null })),
    }), [
        getCurrentUser,
        loginWithPassword,
        loginWithOtp,
        logout,
        state.action,
        state.error,
        state.isLoading,
        user,
        verifyOtp,
    ]);
    return value;
}
export const useAuth = useAuthController;
