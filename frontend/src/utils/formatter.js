/**
 * formatter.ts
 * ------------
 * Convenient wrappers around `Intl.*` so components don’t
 * repeat boilerplate when displaying money, numbers or dates.
 */
/* ------------------------------------------------------------------ Locale */
const DEFAULT_LOCALE = navigator.language || "en-US";
/* ------------------------------------------------------------------ Money */
const CURRENCY = "EUR"; // change to "USD" if your game uses dollars
/** Format number ➜ “€1,234,567” */
export function formatCurrency(value, opts = {}) {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: "currency",
        currency: CURRENCY,
        maximumFractionDigits: 0,
        ...opts,
    }).format(value);
}
/* ------------------------------------------------------------------ Numbers */
/** Compact – “12K”, “3.4 M” */
export function formatCompact(value) {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}
/** Plain integer with locale thousands separators */
export function formatInt(value) {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
        maximumFractionDigits: 0,
    }).format(value);
}
/* ------------------------------------------------------------------ Dates */
const DATE_OPTS = {
    year: "numeric",
    month: "short",
    day: "2-digit",
};
/** Date → “11 Jul 2025” */
export function formatDate(date, opts = {}) {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        ...DATE_OPTS,
        ...opts,
    }).format(new Date(date));
}
/* ------------------------------------------------------------------ Durations */
/** Minutes (65) ➜ “1 h 5 m” */
export function formatMinutes(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? `${h} h ${m} m` : `${m} m`;
}
/* ------------------------------------------------------------------ Export default (optional) */
export default {
    formatCurrency,
    formatCompact,
    formatInt,
    formatDate,
    formatMinutes,
};
//# sourceMappingURL=formatter.js.map