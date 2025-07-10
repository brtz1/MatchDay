const countryMap = {
    Portugal: "PT",
    Spain: "ES",
    Italy: "IT",
    France: "FR",
    Germany: "DE",
    England: "GB",
    Iran: "IR",
    // add as needed
};
export function getFlagEmoji(countryOrCode) {
    const code = countryMap[countryOrCode] ?? countryOrCode;
    if (!code || code.length !== 2)
        return "🏳️";
    const codePoints = code
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
//# sourceMappingURL=getFlagEmoji.js.map