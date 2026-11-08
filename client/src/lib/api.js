// Tiny fetch wrapper. All requests go through the Vite dev proxy or
// same-origin in production. Returns parsed JSON or throws on error.
const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || "";
const SESSION_KEY = "smarthack_session";

// Reads the JWT saved at login (see lib/auth.js) so protected routes
// (e.g. creating/editing hackathons, publishing announcements) work.
function authToken() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return session?.token || null;
  } catch {
    return null;
  }
}

async function request(method, path, body) {
  const token = authToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p, b) => request("DELETE", p, b),
};
