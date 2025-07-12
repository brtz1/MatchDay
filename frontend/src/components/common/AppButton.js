import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
const variantClasses = {
    primary: "bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 focus:ring-blue-400",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 dark:bg-red-700 dark:hover:bg-red-800",
};
/**
 * **AppButton** – project-wide button component.
 */
export const AppButton = forwardRef(({ variant = "primary", isLoading = false, className, children, disabled, ...rest }, ref) => (_jsxs("button", { ref: ref, type: "button", disabled: disabled || isLoading, className: clsx("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm disabled:opacity-60 disabled:pointer-events-none", variantClasses[variant], className), ...rest, children: [isLoading && (_jsx(Loader2, { className: "h-4 w-4 animate-spin", "aria-label": "Loading", strokeWidth: 2 })), children] })));
AppButton.displayName = "AppButton";
export default AppButton;
//# sourceMappingURL=AppButton.js.map