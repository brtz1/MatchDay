import * as React from "react";
import {
  useState,
  Children,
  isValidElement,
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
  value: string;
  label: string;
}

export interface TeamRosterTabsProps {
  tabs: TabDefinition[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
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
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  function handleSelect(v: string) {
    onChange?.(v);
    if (value === undefined) setInternal(v);
  }

  const childArray = Children.toArray(children);
  const tabCount = tabs.length;
  const childCount = childArray.length;

  // Development-time guard
  if (import.meta.env.DEV && childCount !== tabCount) {
    console.warn(
      `[TeamRosterTabs] children.length !== tabs.length → ${childCount} ≠ ${tabCount}`
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

      {/* ── Active panel only */}
      <div className="flex-1 overflow-auto p-2 text-sm">
        {childArray.map((child, idx) => {
          if (tabs[idx]?.value === current && isValidElement(child)) {
            return <React.Fragment key={idx}>{child}</React.Fragment>;
          }
          return null;
        })}
      </div>
    </div>
  );
}
