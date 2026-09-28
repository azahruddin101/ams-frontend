import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

/** The single Axios instance. All network access goes through /services which use this. */
export const http = axios.create({ baseURL: "/api/v1", withCredentials: true, timeout: 20_000 });

// Separate bare client for the refresh call so it never triggers its own interceptors.
const bare = axios.create({ baseURL: "/api/v1", withCredentials: true, timeout: 20_000 });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

/** Single-flight refresh: concurrent 401s share one refresh request (tokens rotate, so parallel refreshes would self-revoke). */
export function refreshSession() {
  refreshing ??= bare
    .post("/auth/refresh")
    .catch(async (err) => {
      // Another tab / a resumed app may have rotated the token a moment ago. Its Set-Cookie has landed by now: retry once.
      if (err.response?.status !== 401) throw err;
      await new Promise((r) => setTimeout(r, 400));
      return bare.post("/auth/refresh");
    })
    .then(({ data }) => {
      useAuthStore.getState().setSession(data.data);
      return data.data.accessToken;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || !config || config._retried || AUTH_PATHS.some((p) => config.url?.endsWith(p))) throw error;
    config._retried = true;
    try {
      const token = await refreshSession();
      config.headers.Authorization = `Bearer ${token}`;
      return http(config);
    } catch (refreshError) {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Hard navigation on purpose: this module has no router, and a full reload also resets all in-memory state.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      throw refreshError;
    }
  }
);

export const unwrap = (promise) => promise.then((r) => r.data);
