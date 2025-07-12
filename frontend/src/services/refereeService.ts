/**
 * refereeService.ts
 * -----------------
 * Simple wrapper for referee-related endpoints.
 */

import axios from "@/services/axios";

/* ------------------------------------------------------------------ Types */

export interface Referee {
  id: number;
  name: string;
  country?: string;
}

/* ------------------------------------------------------------------ API */

const BASE = "/referees";

/** GET `/referees` – list all referees */
async function getReferees(): Promise<Referee[]> {
  const { data } = await axios.get<Referee[]>(BASE);
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getReferees,
};
