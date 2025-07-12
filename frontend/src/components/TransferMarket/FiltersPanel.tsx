import * as React from "react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { AppButton } from "@/components/common/AppButton";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export interface TransferFilters {
  name: string;
  ratingRange: "0-25" | "26-50" | "51-75" | "76-99" | "";
  position: "GK" | "DF" | "MF" | "AT" | "";
  nationality: string; // ISO-2 code or empty
  priceRange: "<1M" | "1M-5M" | "5M-20M" | ">20M" | "";
}

export interface FiltersPanelProps {
  /** Current filter state (controlled). */
  value: TransferFilters;
  /** Fires on each control change. */
  onChange: (next: TransferFilters) => void;
  /** Called when “Search” button clicked. */
  onSearch: () => void;
  /** Optional reset callback. */
  onReset?: () => void;
  /** A list of nationalities detected in dataset to populate dropdown. */
  nationalities?: string[];
  className?: string;
}

/**
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

const ratingOptions: TransferFilters["ratingRange"][] = [
  "",
  "0-25",
  "26-50",
  "51-75",
  "76-99",
];

const positionOptions: TransferFilters["position"][] = [
  "",
  "GK",
  "DF",
  "MF",
  "AT",
];

const priceOptions: TransferFilters["priceRange"][] = [
  "",
  "<1M",
  "1M-5M",
  "5M-20M",
  ">20M",
];

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export default function FiltersPanel({
  value,
  onChange,
  onSearch,
  onReset,
  nationalities = [],
  className,
}: FiltersPanelProps) {
  /**
   * Local draft state to debounce/avoid partial updates.
   */
  const [draft, setDraft] = useState(value);

  /* Sync external value → internal */
  useEffect(() => {
    setDraft(value);
  }, [value]);

  /* Push draft upward */
  function commit(partial: Partial<TransferFilters>) {
    const next = { ...draft, ...partial };
    setDraft(next);
    onChange(next);
  }

  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-900",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
        Filters
      </h3>

      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3 lg:grid-cols-4">
        {/* Name */}
        <label className="flex flex-col gap-1">
          <span>Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => commit({ name: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          />
        </label>

        {/* Rating */}
        <label className="flex flex-col gap-1">
          <span>Rating</span>
          <select
            value={draft.ratingRange}
            onChange={(e) =>
              commit({
                ratingRange: e.target.value as TransferFilters["ratingRange"],
              })
            }
            className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {ratingOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "" ? "Any" : opt}
              </option>
            ))}
          </select>
        </label>

        {/* Position */}
        <label className="flex flex-col gap-1">
          <span>Position</span>
          <select
            value={draft.position}
            onChange={(e) =>
              commit({
                position: e.target.value as TransferFilters["position"],
              })
            }
            className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {positionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "" ? "Any" : opt}
              </option>
            ))}
          </select>
        </label>

        {/* Nationality */}
        <label className="flex flex-col gap-1">
          <span>Nationality</span>
          <select
            value={draft.nationality}
            onChange={(e) => commit({ nationality: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Any</option>
            {nationalities.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
        </label>

        {/* Price */}
        <label className="flex flex-col gap-1">
          <span>Price</span>
          <select
            value={draft.priceRange}
            onChange={(e) =>
              commit({
                priceRange: e.target.value as TransferFilters["priceRange"],
              })
            }
            className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {priceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "" ? "Any" : opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <AppButton
          variant="primary"
          onClick={onSearch}
          className="w-24"
        >
          Search
        </AppButton>
        <AppButton
          variant="ghost"
          onClick={onReset}
          className="w-20"
        >
          Reset
        </AppButton>
      </div>
    </div>
  );
}
