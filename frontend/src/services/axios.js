import axios from "axios";
/**
 * ---------------------------------------------------------------------------
 * Axios singleton
 * ---------------------------------------------------------------------------
 *
 * Base URL is taken from:
 *   1.  VITE_API_URL  → e.g. "https://prod.api.matchday.app"
 *   2.  fallback      → "http://localhost:4000"
 *
 * All requests automatically prepend `/api` — do NOT include `/api` in your paths.
 */
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api`,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 8000,
});
/* ------------------------------------------------------------------------- */
/* Interceptors                                                              */
/* ------------------------------------------------------------------------- */
/** Add auth token if stored in localStorage */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
/** Global error handler → console + toast placeholder */
api.interceptors.response.use((res) => res, (err) => {
    if (import.meta.env.DEV) {
        console.error("[axios]", err.response ?? err.message);
    }
    // TODO: Add toast/notification hook here
    return Promise.reject(err);
});
/**
 * ---------------------------------------------------------------------------
 * WARNING: DO NOT prepend `/api` manually to axios calls. Use relative paths.
 *   ❌ axios.get('/api/teams')     ← BAD
 *   ✅ axios.get('/teams')         ← GOOD
 * ---------------------------------------------------------------------------
 */
export default api;
//# sourceMappingURL=axios.js.map