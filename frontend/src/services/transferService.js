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
/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */
const BASE = "/transfers";
async function searchPlayers(filters) {
    const { data } = await axios.get(`${BASE}/search`, {
        params: filters,
    });
    return data;
}
async function placeBid(payload) {
    const { data } = await axios.post(`${BASE}/bid`, payload);
    return data;
}
async function acceptBid(payload) {
    const { data } = await axios.post(`${BASE}/accept-bid`, payload);
    return data;
}
async function listPlayer(payload) {
    const { data } = await axios.post(`${BASE}/list`, payload);
    return data;
}
async function cancelListing(payload) {
    const { data } = await axios.post(`${BASE}/cancel-list`, payload);
    return data;
}
async function getRecentTransfers() {
    const { data } = await axios.get(`${BASE}/recent`);
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
//# sourceMappingURL=transferService.js.map