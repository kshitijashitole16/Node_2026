import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState, } from "react";
import { useAuthContext } from "../provider/AuthProvider";
export function LoginModal({ open, onClose, onOtpSent, purpose = "Authify_Register_user", title = "Sign in with OTP", subtitle = "Enter your email to receive a one-time code.", className = "", }) {
    const { appName, logo, primaryColor, loginWithOtp, isLoading, loadingAction, error, clearError, } = useAuthContext();
    const [email, setEmail] = useState("");
    const [touched, setTouched] = useState(false);
    const emailInputId = useId();
    const titleId = useId();
    const subtitleId = useId();
    const errorId = useId();
    if (!open)
        return null;
    useEffect(() => {
        function onKeyDown(event) {
            if (event.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);
    async function handleSubmit(event) {
        event.preventDefault();
        const normalized = email.trim().toLowerCase();
        setTouched(true);
        if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
            return;
        clearError();
        await loginWithOtp({
            purpose,
            email: normalized,
        });
        onOtpSent?.(normalized);
    }
    const sendingOtp = isLoading && loadingAction === "loginWithOtp";
    const emailValue = email.trim().toLowerCase();
    const emailInvalid = touched && (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue));
    const combinedError = emailInvalid
        ? "Please enter a valid email address."
        : error?.message || "";
    const modalStyle = {
        ["--authify-primary"]: primaryColor || "#3b82f6",
    };
    return (_jsx("div", { className: `authify-modal-overlay ${className}`.trim(), role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, "aria-describedby": subtitleId, onMouseDown: (event) => {
            if (event.target === event.currentTarget)
                onClose();
        }, children: _jsxs("div", { className: "authify-modal", style: modalStyle, children: [_jsx("button", { type: "button", className: "authify-modal-close", "aria-label": "Close login modal", onClick: onClose, children: "\u00D7" }), _jsxs("header", { className: "authify-modal-header", children: [logo ? _jsx("img", { src: logo, alt: `${appName} logo`, className: "authify-modal-logo" }) : null, _jsx("p", { className: "authify-modal-appname", children: appName }), _jsx("h2", { id: titleId, className: "authify-modal-title", children: title }), _jsx("p", { id: subtitleId, className: "authify-modal-subtitle", children: subtitle })] }), _jsxs("form", { className: "authify-modal-form", noValidate: true, onSubmit: handleSubmit, children: [_jsx("label", { htmlFor: emailInputId, className: "authify-modal-label", children: "Email" }), _jsx("input", { id: emailInputId, type: "email", autoComplete: "email", required: true, className: "authify-modal-input", placeholder: "you@example.com", value: email, onChange: (e) => {
                                if (combinedError)
                                    clearError();
                                setEmail(e.target.value);
                            }, onBlur: () => setTouched(true), disabled: sendingOtp, "aria-invalid": Boolean(combinedError), "aria-describedby": combinedError ? errorId : undefined }), combinedError ? (_jsx("p", { id: errorId, className: "authify-modal-error", role: "alert", children: combinedError })) : null, _jsx("button", { type: "submit", className: "authify-modal-submit", disabled: sendingOtp || !emailValue, "aria-busy": sendingOtp, children: sendingOtp ? "Sending OTP..." : "Send OTP" })] })] }) }));
}
