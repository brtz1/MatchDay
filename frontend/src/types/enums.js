/**
 * Shared enums between UI and DTOs
 * Keep them minimal – just what the client actually needs.
 */
export var Position;
(function (Position) {
    Position["GK"] = "GK";
    Position["DF"] = "DF";
    Position["MF"] = "MF";
    Position["AT"] = "AT";
})(Position || (Position = {}));
export var Division;
(function (Division) {
    Division["D1"] = "D1";
    Division["D2"] = "D2";
    Division["D3"] = "D3";
    Division["D4"] = "D4";
})(Division || (Division = {}));
export var CardType;
(function (CardType) {
    CardType["Yellow"] = "Y";
    CardType["Red"] = "R";
})(CardType || (CardType = {}));
export var TransferStatus;
(function (TransferStatus) {
    TransferStatus["Listed"] = "LISTED";
    TransferStatus["Bid"] = "BID";
    TransferStatus["Completed"] = "DONE";
})(TransferStatus || (TransferStatus = {}));
//# sourceMappingURL=enums.js.map