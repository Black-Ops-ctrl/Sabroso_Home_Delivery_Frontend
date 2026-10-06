import { API_BASE } from "../../config/api";

let userId = null;
export const setApiUser = (id) => {
  userId = id || null;
};

const headers = (json = true) => {
  const h = { "X-Soft-Errors": "1" };
  if (json) h["Content-Type"] = "application/json";
  if (userId) h["X-User-Id"] = String(userId);
  return h;
};

const networkError = () =>
  new Error("Cannot reach the server. Check your internet connection and try again.");

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw networkError();
  }
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  if (!res.ok || json.success === false) {
    const code = Number(res.headers.get("X-Status")) || res.status;
    const err = new Error(json.error || `Request failed (${code})`);
    err.status = code;
    if (Array.isArray(json.errors)) err.errors = json.errors;
    throw err;
  }
  return json;
}

export function download(path) {
  const sep = path.includes("?") ? "&" : "?";
  const a = document.createElement("a");
  a.href = `${API_BASE}${path}${sep}uid=${encodeURIComponent(userId || "")}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body: body ?? {} }),
  put: (p, body) => request(p, { method: "PUT", body: body ?? {} }),
  patch: (p, body) => request(p, { method: "PATCH", body: body ?? {} }),
  del: (p) => request(p, { method: "DELETE" }),
};

export const resource = (name) => ({
  list: () => api.get(`/${name}`).then((r) => r.data),
  get: (id) => api.get(`/${name}/${id}`).then((r) => r.data),
  create: (body) => api.post(`/${name}`, body),
  update: (id, body) => api.put(`/${name}/${id}`, body),
  remove: (id) => api.del(`/${name}/${id}`),
});

export default api;