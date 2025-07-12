import * as React from "react";
import {
  useState,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import clsx from "clsx";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export interface TabDefinition {
  /** Unique key for the tab. */
  value: string;
  /** Text label shown in the header. */
  label: string;
}

export interface TeamRosterTabsProps {
  /** Array of tab meta – order matters. */
  tabs: TabDefinition[];
  /** Active tab value (controlled). */
  value?: string;
  /** Default value (uncontrolled). */
  defaultValue?: string;
  /** Controlled change handler. */
  onChange?: (value: string) => void;
  /** TabPanels as children.  Must equal tabs.length or we’ll warn in dev. */
  children: ReactNode;
  /** Extra Tailwind classes. */
  className?: string;
}

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export default function TeamRosterTabs({
  tabs,
  value,
  defaultValue = tabs[0]?.value,
  onChange,
  children,
  className,
}: TeamRosterTabsProps) {
  // Uncontrolled fallback
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  function handleSelect(v: string) {
    onChange?.(v);
    if (value === undefined) setInternal(v);
  }

  // Development-time length guard
  if (
    import.meta.env.DEV &&
    Children.count(children) !== tabs.length
  ) {
    console.warn(
      "[TeamRosterTabs] children.length !== tabs.length"
    );
  }

  return (
    <div
      className={clsx(
        "flex h-full flex-col rounded-lg bg-white shadow dark:bg-gray-900",
        className
      )}
    >
      {/* ── Header row */}
      <div className="flex shrink-0 gap-1 border-b border-gray-200 p-2 text-xs dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleSelect(tab.value)}
            className={clsx(
              "rounded px-2 py-1 font-medium transition-colors",
              current === tab.value
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab panels */}
      <div className="flex-1 overflow-auto p-2 text-sm">
        {Children.map(children, (child, idx) => {
          if (!isValidElement(child)) return null;
          const isActive = tabs[idx]?.value === current;
          return cloneElement(
            child as ReactElement<{ hidden?: boolean }>,
            { hidden: !isActive }
    );
        })}
      </div>
    </div>
  );
}
