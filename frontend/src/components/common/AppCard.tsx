import * as React from "react";
import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";

export interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual flavour of the card.
   *  – default  white (dark: gray-900) with soft shadow  
   *  – outline  white with subtle border, lighter shadow  
   *  – ghost   transparent, no border/shadow
   */
  variant?: "default" | "outline" | "ghost";
  /** Adds hover-lift + pointer cursor. */
  clickable?: boolean;
}

/**
 * Tailwind class maps per variant.
 */
const variantClasses: Record<
  NonNullable<AppCardProps["variant"]>,
  string
> = {
  default: "bg-white dark:bg-gray-900 shadow-md",
  outline:
    "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm",
  ghost: "bg-transparent shadow-none",
};

/**
 * **AppCard** – reusable container with rounded corners & soft shadow.
 */
export const AppCard = forwardRef<HTMLDivElement, AppCardProps>(
  (
    {
      variant = "default",
      clickable = false,
      className,
      children,
      ...rest
    },
    ref
  ) => (
    <div
      ref={ref}
      className={clsx(
        "rounded-2xl p-4 transition-shadow",
        variantClasses[variant],
        clickable && "cursor-pointer hover:shadow-lg",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);

AppCard.displayName = "AppCard";

export default AppCard;
