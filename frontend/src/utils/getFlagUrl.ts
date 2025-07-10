import { countryMap } from "./countryCodes";

export function getFlagUrl(countryOrCode: string): string {
  const code = countryMap[countryOrCode] ?? countryOrCode;
  if (!code || code.length !== 2) return "";
  return `https://flagcdn.com/h24/${code.toLowerCase()}.png`;
}
