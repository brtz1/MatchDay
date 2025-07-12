import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useCallback, } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "w-screen h-screen",
};
/**
 * **Modal** – animated dialog using Framer Motion & Tailwind.
 */
export const Modal = forwardRef(({ open, onClose, title, size = "md", isLocked = false, hideCloseIcon = false, container = typeof document !== "undefined" ? document.body : undefined, children, className, ...rest }, ref) => {
    const handleKey = useCallback((e) => {
        if (!isLocked && e.key === "Escape")
            onClose();
    }, [isLocked, onClose]);
    useEffect(() => {
        if (!open)
            return;
        document.addEventListener("keydown", handleKey);
        document.body.style.overflow = "hidden"; // Prevent background scroll
        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
        };
    }, [open, handleKey]);
    if (!container)
        return null;
    return createPortal(_jsx(AnimatePresence, { children: open && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, className: "fixed inset-0 z-40 flex items-center justify-center", "aria-modal": "true", role: "dialog", children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: () => !isLocked && onClose() }), _jsxs(motion.div, { ref: ref, initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, transition: { duration: 0.18 }, className: clsx("relative z-50 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900", sizeClasses[size], className), ...rest, children: [(title || !hideCloseIcon) && (_jsxs("header", { className: "mb-4 flex items-start justify-between", children: [title && (_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100", children: title })), !hideCloseIcon && (_jsx("button", { onClick: onClose, className: "rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800", "aria-label": "Close dialog", children: _jsx(X, { className: "h-5 w-5" }) }))] })), _jsx("div", { className: "overflow-y-auto", children: children })] })] })) }), container);
});
Modal.displayName = "Modal";
export default Modal;
//# sourceMappingURL=Modal.js.map