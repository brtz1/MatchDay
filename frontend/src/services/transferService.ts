/**
 * transferService.ts
 * ------------------
 * Wrapper for the transfer-market REST API.
 *
 * Endpoints (convention):
 *  • GET  /transfers/search       — filtered player search
 *  • POST /transfers/bid          — bid for a player
 *  • POST /transfers/accept-bid   — accept an incoming bid
 *  • POST /transfers/list         — put a player on the market
 *  • POST /transfers/cancel-list  — remove player from list
 *  • GET  /transfers/recent       — latest confirmed transfers
 */

import axios from "@/services/axios";
import { SaveGamePlayer } from "@prisma/client";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SearchFilters {
  name?: string;
  ratingMin?: number;
  ratingMax?: number;
  priceMin?: number;
  priceMax?: number;
  position?: "GK" | "DF" | "MF" | "AT";
  nationality?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  total: number;
  players: SaveGamePlayer[];
}

export interface BidRequest {
  buyerTeamId: number;
  playerId: number;
  amount: number;
}

export interface ListingRequest {
  sellerTeamId: number;
  playerId: number;
  minPrice: number;
}

export interface CancelListingRequest {
  playerId: number;
}

export interface AcceptBidRequest {
  sellerTeamId: number;
  bidId: number;
}

export interface TransferRecord {
  id: number;
  playerId: number;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  amount: number;
  date: string; // ISO
}

/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */

const BASE = "/transfers";

/** GET `/transfers/search` – filter & paginate players on the market */
async function searchPlayers(
  filters: SearchFilters
): Promise<SearchResult> {
  const { data } = await axios.get<SearchResult>(`${BASE}/search`, {
    params: filters,
  });
  return data;
}

/** POST `/transfers/bid` – place a bid */
async function placeBid(payload: BidRequest) {
  const { data } = await axios.post(`${BASE}/bid`, payload);
  return data;
}

/** POST `/transfers/accept-bid` – seller accepts a bid */
async function acceptBid(payload: AcceptBidRequest) {
  const { data } = await axios.post(`${BASE}/accept-bid`, payload);
  return data;
}

/** POST `/transfers/list` – list a player on transfer market */
async function listPlayer(payload: ListingRequest) {
  const { data } = await axios.post(`${BASE}/list`, payload);
  return data;
}

/** POST `/transfers/cancel-list` – remove player from market */
async function cancelListing(payload: CancelListingRequest) {
  const { data } = await axios.post(`${BASE}/cancel-list`, payload);
  return data;
}

/** GET `/transfers/recent` – latest confirmed transfers */
async function getRecentTransfers(): Promise<TransferRecord[]> {
  const { data } = await axios.get<TransferRecord[]>(
    `${BASE}/recent`
  );
  return data;
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export default {
  searchPlayers,
  placeBid,
  acceptBid,
  listPlayer,
  cancelListing,
  getRecentTransfers,
};
