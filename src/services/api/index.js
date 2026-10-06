import api, { resource, download } from "./client";
import { API_BASE } from "../../config/api";

const qs = (o = {}) => {
  const q = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const authApi = {
  login: (username, password) => api.post("/auth/login", { username, password }).then((r) => r.data),
  me: (id) => api.get(`/auth/me/${id}`).then((r) => r.data),
  logout: (reason) => api.post("/auth/logout", { reason }),
};

export const exceptionsApi = {
  report: (params) => api.get(`/exceptions/report${qs(params)}`).then((r) => r.data),
  rule: (key, params) => api.get(`/exceptions/rules/${key}${qs(params)}`).then((r) => r.data),
  settings: () => api.get("/exceptions/settings").then((r) => r.data),
  saveSettings: (body) => api.put("/exceptions/settings", body),
  pdf: (params) => download(`/exceptions/pdf${qs(params)}`),
};

export const auditApi = {
  list: (params) => api.get(`/audit${qs(params)}`).then((r) => r.data),
  get: (id) => api.get(`/audit/${id}`).then((r) => r.data),
  pdf: (params) => download(`/audit/pdf${qs(params)}`),
};

export const brandApi = { get: () => api.get("/brand").then((r) => r.data) };

export const lookupsApi = { all: () => api.get("/lookups").then((r) => r.data) };

export const themeApi = {
  get: () => api.get("/theme").then((r) => r.data),
  save: (theme) => api.put("/theme", theme).then((r) => r.data),
  reset: () => api.del("/theme").then((r) => r.data),
};

export const appThemeApi = {
  get: () => api.get("/app-theme").then((r) => r.data),
  save: (theme) => api.put("/app-theme", theme).then((r) => r.data),
  reset: () => api.del("/app-theme").then((r) => r.data),
};

export const riderViewApi = {
  overview: (id) => api.get(`/rider-view/${id}/overview`).then((r) => r.data),
  assignments: (id, params) => api.get(`/rider-view/${id}/assignments${qs(params)}`).then((r) => r.data),
  dutyLog: (id, params) => api.get(`/rider-view/${id}/duty-log${qs(params)}`).then((r) => r.data),
  performance: (id, params) => api.get(`/rider-view/${id}/performance${qs(params)}`).then((r) => r.data),
  lastLocation: (id) => api.get(`/rider-view/${id}/last-location`).then((r) => r.data),
  releasePhone: (id) => api.post(`/rider-view/${id}/release-phone`),
};

export const settingsApi = {
  delivery: () => api.get("/settings/delivery").then((r) => r.data),
  saveDelivery: (body) => api.put("/settings/delivery", body),
};

export const syncApi = {
  modules: () => api.get("/sync/modules").then((r) => r.data),
  keys: () => api.get("/sync/keys").then((r) => r.data),
  createKey: (body) => api.post("/sync/keys", body),
  updateKey: (id, body) => api.put(`/sync/keys/${id}`, body),
  regenerate: (id) => api.post(`/sync/keys/${id}/regenerate`),
  revoke: (id) => api.del(`/sync/keys/${id}`),
  queue: () => api.get("/sync/queue").then((r) => r.data),
  runQueue: (body) => api.post("/sync/queue/run", body),
  logs: (params) => api.get(`/sync/logs${qs(params)}`).then((r) => r.data),
  test: (body) => api.post("/sync/test", body).then((r) => r.data),
  format: (modules) => download(`/sync/format${qs({ modules: (modules || []).join(",") })}`),
};

export const dashboardApi = {
  overview: (from, to) => api.get(`/dashboard${qs({ from, to })}`).then((r) => r.data),
};

export const ordersApi = {
  list: (params) => api.get(`/orders${qs(params)}`).then((r) => r.data),
  dispatch: () => api.get("/orders/dispatch").then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (body) => api.post("/orders", body),
  update: (id, body) => api.put(`/orders/${id}`, body),
  setStatus: (id, status, reason) => api.patch(`/orders/${id}/status`, reason ? { status, reason } : { status }),
  reassign: (ids, module) => api.post("/orders/reassign", { ids, module }),
  assign: (id, rider_id) => api.patch(`/orders/${id}/assign`, { rider_id }),
  riders: (id) => api.get(`/orders/${id}/riders`).then((r) => r.data),
  remove: (id) => api.del(`/orders/${id}`),
  deliverAnyway: (id) => api.post(`/orders/${id}/deliver-anyway`),
};

export const trackingApi = {
  live: () => api.get("/tracking/live").then((r) => r.data),
  delivered: (from, to) => api.get(`/tracking/delivered${qs({ from, to })}`).then((r) => r.data),
  route: (id) => api.get(`/tracking/orders/${id}/route`).then((r) => r.data),
};

export const transferApi = {
  exportCsv: (kind, params) => download(`/transfer/${kind}/export${qs(params)}`),
  template: (kind, params) => download(`/transfer/${kind}/template${qs(params)}`),
  importRows: (kind, rows, params) => api.post(`/transfer/${kind}/import${qs(params)}`, { rows }),
};

export const usersApi = resource("users");
export const rolesApi = resource("roles");
export const companiesApi = resource("companies");
export const shopsApi = resource("shops");
export const regionsApi = resource("regions");
export const citiesApi = resource("cities");
export const categoriesApi = resource("categories");
export const itemsApi = {
  ...resource("items"),
  imageUrl: (item) => (item && item.has_image ? `${API_BASE}/items/${item.id}/image?v=${encodeURIComponent(item.image_at || "")}` : null),
  saveImage: (id, image) => api.post(`/items/${id}/image`, { image }),
  removeImage: (id) => api.del(`/items/${id}/image`),
};
export const customersApi = resource("customers");
export const ridersApi = resource("riders");
export const tiersApi = resource("tiers");
export const cardsApi = resource("cards");
export const campaignsApi = resource("campaigns");

export const loyaltyApi = {
  settings: () => api.get("/loyalty/settings").then((r) => r.data),
  saveSettings: (body) => api.put("/loyalty/settings", body).then((r) => r.data),
  quote: (body) => api.post("/loyalty/quote", body).then((r) => r.data),
  addMember: (body) => api.post("/loyalty/members", body),
  approve: (cardId) => api.post(`/loyalty/members/${cardId}/approve`),
  removeMember: (cardId) => api.del(`/loyalty/members/${cardId}`),
  ledger: (customerId) => api.get(`/loyalty/members/${customerId}/ledger`).then((r) => r.data),
  adjust: (customerId, body) => api.post(`/loyalty/members/${customerId}/adjust`, body).then((r) => r.data),
  opening: (customerId, body) => api.put(`/loyalty/members/${customerId}/opening`, body),
};
