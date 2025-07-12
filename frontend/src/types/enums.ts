/**
 * Shared enums between UI and DTOs
 * Keep them minimal – just what the client actually needs.
 */

export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  AT = "AT",
}

export enum Division {
  D1 = "D1",
  D2 = "D2",
  D3 = "D3",
  D4 = "D4",
}

export enum CardType {
  Yellow = "Y",
  Red = "R",
}

export enum TransferStatus {
  Listed = "LISTED",
  Bid = "BID",
  Completed = "DONE",
}
