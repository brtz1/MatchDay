// frontend/src/services/axios.ts
import axios from "axios";
/**
 * Axios Singleton
 * ----------------------------------------------------------------------------
 * Automatically prepends `/api` to all requests.
 * Set base URL from:
 *   1. VITE_API_URL  → e.g., https://prod.api.matchday.app
 *   2. Fallback      → http://localhost:4000
 *
 * ❗️DO NOT include `/api` manually in service calls.
 *    ✅ api.get('/teams')
 *    ❌ api.get('/api/teams')
 */
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api`,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 20000, // Extended timeout for slow backends
});
/* ------------------------------------------------------------------------- */
/* Interceptors                                                              */
/* ------------------------------------------------------------------------- */
// Add Bearer token from localStorage if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
// Log errors in dev mode
api.interceptors.response.use((res) => res, (err) => {
    if (import.meta.env.DEV) {
        console.error("[axios]", err.response ?? err.message);
    }
    // TODO: Integrate toast/notification feedback here
    return Promise.reject(err);
});
export default api;
//# sourceMappingURL=axios.js.map