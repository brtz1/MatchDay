import axios, { AxiosError } from "axios";

/**
 * ---------------------------------------------------------------------------
 * Axios singleton
 * ---------------------------------------------------------------------------
 *
 * Base URL is taken from:
 *   1.  VITE_API_URL  → e.g. "https://prod.api.matchday.app"
 *   2.  fallback      → "http://localhost:4000"
 *
 * All requests automatically prepend `/api`.
 */
const api = axios.create({
  baseURL: `${
    import.meta.env.VITE_API_URL ?? "http://localhost:4000"
  }/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 8000,
});

/* ------------------------------------------------------------------------- */
/* Response / error interceptors                                             */
/* ------------------------------------------------------------------------- */

/** Add auth token if you later store one in localStorage */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Global error handler → console + toast placeholder */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (import.meta.env.DEV) {
      console.error("[axios]", err.response ?? err.message);
    }
    // TODO: hook your toast/notification system here
    return Promise.reject(err);
  }
);

export default api;
