import { type SendOtpPurpose } from "../core/api";
export type LoginModalProps = {
    open: boolean;
    onClose: () => void;
    onOtpSent?: (email: string) => void;
    purpose?: SendOtpPurpose;
    title?: string;
    subtitle?: string;
    className?: string;
};
export declare function LoginModal({ open, onClose, onOtpSent, purpose, title, subtitle, className, }: LoginModalProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=LoginModal.d.ts.map