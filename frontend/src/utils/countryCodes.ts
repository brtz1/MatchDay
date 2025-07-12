/**
 * countryCodes.ts
 * ---------------
 * Helper map + utilities for converting human-readable country names
 * to ISO-3166-alpha-2 codes.  Tailored for football nations you actually
 * support; add more as your database grows.
 *
 * Example:
 *   import { toISO, getFlagUrl } from "@/utils/countryCodes";
 *   const iso = toISO("Scotland");   // → "gb-sct"
 *   const url = getFlagUrl("Brazil"); // → https://flagcdn.com/w40/br.png
 */

/* ---------------------------------------------------------------------- */
/* Map – Name ➜ ISO-2 (or ISO-2-subdivision when needed)                  */
/* ---------------------------------------------------------------------- */

export const COUNTRY_TO_ISO: Record<string, string> = {
  /* UK home nations (ISO-3166-2 sub-divisions) */
  England: "gb-eng",
  Scotland: "gb-sct",
  Wales: "gb-wls",
  "Northern Ireland": "gb-nir",

  /* Americas */
  Argentina: "ar",
  Brazil: "br",
  Canada: "ca",
  Chile: "cl",
  Mexico: "mx",
  "United States": "us",
  Uruguay: "uy",

  /* Europe */
  Belgium: "be",
  Croatia: "hr",
  Denmark: "dk",
  France: "fr",
  Germany: "de",
  Italy: "it",
  Netherlands: "nl",
  Portugal: "pt",
  Spain: "es",
  Sweden: "se",

  /* Africa */
  Algeria: "dz",
  Egypt: "eg",
  Morocco: "ma",
  Nigeria: "ng",
  Senegal: "sn",
  Tunisia: "tn",

  /* Asia / Oceania */
  Australia: "au",
  China: "cn",
  "South Korea": "kr",
  Japan: "jp",
};

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

/** Convert a country display name ➜ ISO-alpha-2 (lower-case) */
export function toISO(country: string): string {
  return (COUNTRY_TO_ISO[country] ?? country.slice(0, 2)).toLowerCase();
}

/** Return a 40-pixel wide FlagCDN URL for the given country name */
export function getFlagUrl(country: string): string {
  return `https://flagcdn.com/w40/${toISO(country)}.png`;
}
