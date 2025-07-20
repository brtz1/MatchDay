import { COUNTRY_TO_ISO } from "./countryCodes";
/**
 * Return the Unicode flag emoji for a country name *or* ISO-2 code.
 * Falls back to white flag (🏳️) when not recognised.
 *
 *  getFlagEmoji("Portugal")  → 🇵🇹
 *  getFlagEmoji("br")        → 🇧🇷
 */
export function getFlagEmoji(countryOrIso) {
    const iso = (COUNTRY_TO_ISO[countryOrIso] ?? countryOrIso).slice(0, 2).toUpperCase();
    if (iso.length !== 2)
        return "🏳️";
    /* Regional-indicator symbols are 0x1F1E6 + ascii(A-Z) */
    return String.fromCodePoint(0x1f1e6 + iso.charCodeAt(0) - 65, 0x1f1e6 + iso.charCodeAt(1) - 65);
}
export default getFlagEmoji;
//# sourceMappingURL=getFlagEmoji.js.map