/**
 * logger.ts
 * ---------
 * Lightweight, zero-dependency logging helper.
 *
 * • Automatically muted in production unless you whitelist namespaces.
 * • Consistent coloured prefix makes console output easy to scan.
 * • Works in both browser and Node test runners.
 *
 * Usage:
 *   import log from "@/utils/logger";
 *
 *   log.info("auth", "User logged-in", user);
 *   log.warn("socket", "Reconnect delayed");
 *   log.error("api",  "500 response", err);
 */
/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */
/** In prod only the namespaces listed here will show up. */
const WHITELIST = []; // e.g. ["socket", "live"]
/** Enable debug logs in dev (or set VITE_DEBUG=true in env) */
const DEBUG_ENABLED = import.meta.env.DEV ||
    import.meta.env.VITE_DEBUG === "true";
/* Pretty colours (chrome / edge) */
const COLOR_MAP = {
    info: "color:#3b82f6", // blue-500
    warn: "color:#d97706", // amber-600
    error: "color:#dc2626", // red-600
    debug: "color:#10b981", // emerald-500
};
/* -------------------------------------------------------------------------- */
/* Log function                                                               */
/* -------------------------------------------------------------------------- */
function factory(level) {
    return (ns, message, ...args) => {
        /* Gatekeepers */
        if (!DEBUG_ENABLED && level === "debug")
            return;
        if (import.meta.env.PROD &&
            WHITELIST.length &&
            !WHITELIST.includes(ns))
            return;
        /* Prefix + colour */
        const prefix = `%c[${level.toUpperCase()}][${ns}]`;
        const style = COLOR_MAP[level];
        /* eslint-disable no-console */
        console[level === "debug" ? "log" : level](prefix, style, message, ...args);
    };
}
/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */
const log = {
    info: factory("info"),
    warn: factory("warn"),
    error: factory("error"),
    debug: factory("debug"),
};
export default log;
//# sourceMappingURL=logger.js.map