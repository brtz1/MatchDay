import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { AppButton } from "@/components/common/AppButton";
/**
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */
const ratingOptions = [
    "",
    "0-25",
    "26-50",
    "51-75",
    "76-99",
];
const positionOptions = [
    "",
    "GK",
    "DF",
    "MF",
    "AT",
];
const priceOptions = [
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
export default function FiltersPanel({ value, onChange, onSearch, onReset, nationalities = [], className, }) {
    /**
     * Local draft state to debounce/avoid partial updates.
     */
    const [draft, setDraft] = useState(value);
    /* Sync external value → internal */
    useEffect(() => {
        setDraft(value);
    }, [value]);
    /* Push draft upward */
    function commit(partial) {
        const next = { ...draft, ...partial };
        setDraft(next);
        onChange(next);
    }
    return (_jsxs("div", { className: clsx("rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-900", className), children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100", children: "Filters" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-xs md:grid-cols-3 lg:grid-cols-4", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", value: draft.name, onChange: (e) => commit({ name: e.target.value }), className: "rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { children: "Rating" }), _jsx("select", { value: draft.ratingRange, onChange: (e) => commit({
                                    ratingRange: e.target.value,
                                }), className: "rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800", children: ratingOptions.map((opt) => (_jsx("option", { value: opt, children: opt === "" ? "Any" : opt }, opt))) })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { children: "Position" }), _jsx("select", { value: draft.position, onChange: (e) => commit({
                                    position: e.target.value,
                                }), className: "rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800", children: positionOptions.map((opt) => (_jsx("option", { value: opt, children: opt === "" ? "Any" : opt }, opt))) })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { children: "Nationality" }), _jsxs("select", { value: draft.nationality, onChange: (e) => commit({ nationality: e.target.value }), className: "rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800", children: [_jsx("option", { value: "", children: "Any" }), nationalities.map((nat) => (_jsx("option", { value: nat, children: nat }, nat)))] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { children: "Price" }), _jsx("select", { value: draft.priceRange, onChange: (e) => commit({
                                    priceRange: e.target.value,
                                }), className: "rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800", children: priceOptions.map((opt) => (_jsx("option", { value: opt, children: opt === "" ? "Any" : opt }, opt))) })] })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx(AppButton, { variant: "primary", onClick: onSearch, className: "w-24", children: "Search" }), _jsx(AppButton, { variant: "ghost", onClick: onReset, className: "w-20", children: "Reset" })] })] }));
}
//# sourceMappingURL=FiltersPanel.js.map