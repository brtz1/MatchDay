import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "clsx";
/**
 * Tailwind class maps per variant.
 */
const variantClasses = {
    default: "bg-white dark:bg-gray-900 shadow-md",
    outline: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm",
    ghost: "bg-transparent shadow-none",
};
/**
 * **AppCard** – reusable container with rounded corners & soft shadow.
 */
export const AppCard = forwardRef(({ variant = "default", clickable = false, className, children, ...rest }, ref) => (_jsx("div", { ref: ref, className: clsx("rounded-2xl p-4 transition-shadow", variantClasses[variant], clickable && "cursor-pointer hover:shadow-lg", className), ...rest, children: children })));
AppCard.displayName = "AppCard";
export default AppCard;
//# sourceMappingURL=AppCard.js.map