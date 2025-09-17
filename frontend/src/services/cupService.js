import axios from '@/services/axios';
/**
 * GET `/api/cup/log`
 * Fetches all cup rounds with matches.
 *
 * Note: if your axios baseURL already includes `/api`,
 * keep the path as `/cup/log`. Otherwise, change to `/api/cup/log`.
 */
export async function getCupLog() {
    const { data } = await axios.get('/cup/log');
    return data;
}
//# sourceMappingURL=cupService.js.map