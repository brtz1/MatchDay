import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TooltipProvider, Tooltip as RadixTooltip, TooltipTrigger, TooltipContent, } from "@radix-ui/react-tooltip";
import clsx from "clsx";
/**
 * Small, accessible tooltip built on Radix Primitives.
 */
export function Tooltip({ children, content, className, delayDuration = 300, side = "top", align = "center", sideOffset = 4, }) {
    return (_jsx(TooltipProvider, { delayDuration: delayDuration, children: _jsxs(RadixTooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: children }), _jsx(TooltipContent, { side: side, align: align, sideOffset: sideOffset, className: clsx("z-50 max-w-xs rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-md", "animate-fadeIn", className), children: content })] }) }));
}
export default Tooltip;
//# sourceMappingURL=tooltip.js.map