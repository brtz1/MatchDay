import * as React from "react";
import {
  TooltipProvider,
  Tooltip as RadixTooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import clsx from "clsx";

export interface TooltipProps {
  /** Text or element rendered inside the floating bubble. */
  content: React.ReactNode;
  /** The element that receives the hover / focus. */
  children: React.ReactNode;
  /** Optional extra Tailwind classes for the bubble. */
  className?: string;
  /** Delay before showing (ms). Default = 300 ms. */
  delayDuration?: number;
  /** Tooltip position relative to trigger. */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment on that side. */
  align?: "start" | "center" | "end";
  /** Offset in px. */
  sideOffset?: number;
}

/**
 * Small, accessible tooltip built on Radix Primitives.
 */
export function Tooltip({
  children,
  content,
  className,
  delayDuration = 300,
  side = "top",
  align = "center",
  sideOffset = 4,
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <RadixTooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>

        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={clsx(
            "z-50 max-w-xs rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-md",
            "animate-fadeIn",
            className
          )}
        >
          {content}
        </TooltipContent>
      </RadixTooltip>
    </TooltipProvider>
  );
}

export default Tooltip;
