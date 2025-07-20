import axios from '@/services/axios';
/**
 * GET `/api/cup/log`
 * Fetches all cup rounds with matches
 */
export async function getCupLog() {
    const { data } = await axios.get('/cup/log');
    return data;
}
//# sourceMappingURL=cupService.js.map