import * as React from "react";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

/**
 * Tail-winded Button wrapper that standardises the look-and-feel of every button
 * in MatchDay!.  Uses 2xl rounded corners, soft shadow, and thoughtful padding
 * as per the project style-guide.
 *
 * Variants:
 *  – primary   Blue gradient CTA
 *  – secondary  Subtle gray
 *  – ghost    Transparent / minimal
 *  – destructive Error / dangerous action
 *
 * A tiny spinner is shown when `isLoading` is true.
 */
export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<AppButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 focus:ring-blue-400",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  ghost:
    "bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 dark:bg-red-700 dark:hover:bg-red-800",
};

/**
 * **AppButton** – project-wide button component.
 */
export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      variant = "primary",
      isLoading = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm disabled:opacity-60 disabled:pointer-events-none",
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {isLoading && (
        <Loader2
          className="h-4 w-4 animate-spin"
          aria-label="Loading"
          strokeWidth={2}
        />
      )}
      {children}
    </button>
  )
);

AppButton.displayName = "AppButton";

export default AppButton;
