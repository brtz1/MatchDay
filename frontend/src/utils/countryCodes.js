/**
 * frontend/src/utils/countryCodes.ts
 * ----------------------------------
 * Utilities for converting human-readable country names OR loose 2-letter codes
 * into ISO-3166-1 alpha-2 (lowercase). Includes common overrides:
 *   uk → gb, sw → se, po → pt, tu → tr, bu → bg, ka → kz
 *
 * Notes on UK home nations:
 * - `toISO("Scotland")` returns "gb-sct" (ISO-3166-2 subdivision).
 * - FlagCDN typically serves only ISO-3166-1 (country) flags.
 *   To avoid 404s, `getFlagUrl("Scotland")` will fallback to "gb".
 *
 * Example:
 *   import { toISO, getFlagUrl } from "@/utils/countryCodes";
 *   const iso = toISO("Scotland");      // "gb-sct"
 *   const url = getFlagUrl("Brazil");   // https://flagcdn.com/w40/br.png
 */
/* ---------------------------------------------------------------------- */
/* Name → ISO mapping (keys are lowercase display names)                  */
/* ---------------------------------------------------------------------- */
const NAME_TO_ISO = {
    /* UK home nations (ISO-3166-2 subdivisions) */
    "england": "gb", // keep as GB for safety/compat
    "scotland": "gb-sct",
    "wales": "gb-wls",
    "northern ireland": "gb-nir",
    "united kingdom": "gb",
    "great britain": "gb",
    /* Americas */
    "argentina": "ar",
    "brazil": "br",
    "canada": "ca",
    "chile": "cl",
    "mexico": "mx",
    "united states": "us",
    "united states of america": "us",
    "usa": "us",
    "uruguay": "uy",
    /* Europe */
    "belgium": "be",
    "croatia": "hr",
    "denmark": "dk",
    "france": "fr",
    "germany": "de",
    "italy": "it",
    "netherlands": "nl",
    "portugal": "pt",
    "spain": "es",
    "sweden": "se",
    "switzerland": "ch",
    "bulgaria": "bg",
    "kazakhstan": "kz",
    /* Africa */
    "algeria": "dz",
    "egypt": "eg",
    "morocco": "ma",
    "nigeria": "ng",
    "senegal": "sn",
    "tunisia": "tn",
    /* Asia / Oceania */
    "australia": "au",
    "china": "cn",
    "south korea": "kr",
    "korea republic": "kr",
    "republic of korea": "kr",
    "japan": "jp",
};
/* ---------------------------------------------------------------------- */
/* Common bad/legacy/ambiguous 2-letter codes → ISO-2 fixes               */
/* ---------------------------------------------------------------------- */
const CODE_OVERRIDES = {
    uk: "gb", // UK isn't an ISO-3166-1 alpha-2; use GB
    sw: "se", // sw → Sweden
    po: "pt", // po → Portugal
    tu: "tr", // tu → Turkey
    bu: "bg", // bu → Bulgaria
    ka: "kz", // ka → Kazakhstan
};
/* Subdivision set we will collapse to GB when building flag URLs */
const UK_SUBDIVISION_CODES = new Set(["gb-sct", "gb-wls", "gb-nir"]);
/* ---------------------------------------------------------------------- */
/* Helpers                                                                */
/* ---------------------------------------------------------------------- */
function clean(input) {
    return (input || "").trim();
}
function isLikelyCode(s) {
    const x = s.toLowerCase();
    return x.length === 2 || x.startsWith("gb-"); // accept 'gb-sct' etc.
}
/* ---------------------------------------------------------------------- */
/* Public API                                                             */
/* ---------------------------------------------------------------------- */
/**
 * Convert a country display name OR a 2-letter-ish code ➜ ISO code.
 * - Names use NAME_TO_ISO (case-insensitive).
 * - 2-letter inputs pass through CODE_OVERRIDES (e.g., uk→gb, sw→se).
 * - Subdivision codes like "gb-sct" are preserved.
 */
export function toISO(countryOrCode) {
    const raw = clean(countryOrCode);
    if (!raw)
        return "";
    // If input looks like a code already, normalize it
    if (isLikelyCode(raw)) {
        const code = raw.toLowerCase();
        // If it's a GB subdivision, keep it
        if (code.startsWith("gb-"))
            return code;
        // Two-letter corrections
        return (CODE_OVERRIDES[code] ?? code).toLowerCase();
    }
    // Otherwise treat as a name
    const key = raw.toLowerCase();
    const mapped = NAME_TO_ISO[key];
    if (mapped)
        return mapped.toLowerCase();
    // Last-resort fallback: take the first two letters (lowercased)
    return raw.slice(0, 2).toLowerCase();
}
/**
 * Return a 40px-wide FlagCDN URL for the given country or code.
 * - Falls back to "gb" for UK subdivisions to avoid 404s on FlagCDN.
 * - Always returns lowercase code in the URL.
 */
export function getFlagUrl(countryOrCode) {
    const iso = toISO(countryOrCode);
    const fileCode = UK_SUBDIVISION_CODES.has(iso) ? "gb" : iso;
    if (!fileCode)
        return ""; // caller can hide img on empty src
    return `https://flagcdn.com/w40/${fileCode}.png`;
}
/* ---------------------------------------------------------------------- */
/* Named export of the map for consumers that need it                     */
/* ---------------------------------------------------------------------- */
export const COUNTRY_TO_ISO = NAME_TO_ISO;
//# sourceMappingURL=countryCodes.js.map