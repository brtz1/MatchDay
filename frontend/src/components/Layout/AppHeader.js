import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, Fragment, } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Menu, Save, Settings } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip"; // shadcn/ui (if not in project yet, swap for your Tooltip impl)
import { AppButton } from "@/components/common/AppButton";
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export const AppHeader = forwardRef(({ onMenuToggle, showMenuButton = true, title = "MatchDay!", subtitle, rightContent, onSave, onOpenSettings, className, ...rest }, ref) => {
    const defaultRight = (_jsxs(Fragment, { children: [onSave && (_jsx(Tooltip, { content: "Save game", children: _jsx(AppButton, { variant: "ghost", className: "h-8 w-8 p-0", onClick: onSave, children: _jsx(Save, { className: "h-4 w-4" }) }) })), _jsx(Tooltip, { content: "Settings", children: _jsx(AppButton, { variant: "ghost", className: "h-8 w-8 p-0", onClick: onOpenSettings, as: Link, to: "/settings", children: _jsx(Settings, { className: "h-4 w-4" }) }) })] }));
    return (_jsxs("header", { ref: ref, className: clsx("sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 bg-white/70 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70", className), ...rest, children: [_jsxs("div", { className: "flex shrink-0 items-center gap-3", children: [showMenuButton && (_jsx(AppButton, { variant: "ghost", className: "h-9 w-9 p-0 lg:hidden", onClick: onMenuToggle, children: _jsx(Menu, { className: "h-5 w-5" }) })), _jsxs(Link, { to: "/", className: "flex items-baseline gap-1", children: [_jsx("span", { className: "text-lg font-bold text-gray-900 dark:text-gray-100", children: title }), subtitle && (_jsx("span", { className: "text-xs font-medium text-blue-600 dark:text-blue-400", children: subtitle }))] })] }), _jsx("div", { className: "flex-1" }), _jsx("div", { className: "flex items-center gap-2", children: rightContent ?? defaultRight })] }));
});
AppHeader.displayName = "AppHeader";
export default AppHeader;
//# sourceMappingURL=AppHeader.js.map