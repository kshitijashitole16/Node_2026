import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useRef, } from "react";
import { useAuthController } from "../hooks/useAuth";
const AuthContext = createContext(null);
export function AuthProvider({ children, apiUrl, appName, logo, primaryColor, config, autoRefreshOnLoad = true, }) {
    const mergedConfig = useMemo(() => ({
        baseUrl: apiUrl,
        withCredentials: config?.withCredentials,
        getAccessToken: config?.getAccessToken,
    }), [apiUrl, config?.getAccessToken, config?.withCredentials]);
    const auth = useAuthController(mergedConfig);
    const didBootstrapRef = useRef(false);
    useEffect(() => {
        if (!autoRefreshOnLoad || didBootstrapRef.current)
            return;
        didBootstrapRef.current = true;
        void auth.getCurrentUser();
    }, [autoRefreshOnLoad, auth.getCurrentUser]);
    const value = useMemo(() => ({
        apiUrl,
        appName,
        logo,
        primaryColor,
        user: auth.user,
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        loadingAction: auth.loadingAction,
        error: auth.error,
        loginWithOtp: auth.loginWithOtp,
        verifyOtp: auth.verifyOtp,
        logout: auth.logout,
        getCurrentUser: auth.getCurrentUser,
        clearError: auth.clearError,
    }), [apiUrl, appName, logo, primaryColor, auth]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuthContext must be used inside AuthProvider");
    }
    return ctx;
}
// Backward-compatible alias.
export const useAuth = useAuthContext;
