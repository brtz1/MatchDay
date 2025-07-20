/**
 * refereeService.ts
 * -----------------
 * Simple wrapper for referee-related endpoints.
 */
import axios from "@/services/axios";
/* ------------------------------------------------------------------ API */
const BASE = "/referees";
/** GET `/referees` – list all referees */
async function getReferees() {
    const { data } = await axios.get(BASE);
    return data;
}
/* ------------------------------------------------------------------ Export */
export default {
    getReferees,
};
//# sourceMappingURL=refereeService.js.map