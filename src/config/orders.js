let LK = {};
export const setOrderLookups = (d) => {
  LK = d || {};
};
const list = (t) => LK[t] || [];

export const flow = () => list("order_status").filter((s) => s.code !== "CANCELLED").map((s) => ({ key: s.code, label: s.label }));
export const allStatuses = () => list("order_status").map((s) => s.code);
export const LOCKED = ["DELIVERED", "CANCELLED"];

export const NEXT = {
  CREATED: ["CONFIRMED", "Confirm order"],
  CONFIRMED: ["ASSIGNED", "Assign rider"],
  ASSIGNED: ["OUT_FOR_DELIVERY", "Send out for delivery"],
  OUT_FOR_DELIVERY: ["DELIVERED", "Mark delivered"],
};

export const statusClass = (s) =>
  "st " +
  ({
    CREATED: "st-created",
    CONFIRMED: "st-confirmed",
    ASSIGNED: "st-assigned",
    OUT_FOR_DELIVERY: "st-out",
    DELIVERED: "st-delivered",
    CANCELLED: "st-cancelled",
  }[s] || "st-created");

export const statusLabel = (s, app = false) => {
  const f = list("order_status").find((x) => x.code === s);
  if (!f) return s || "";
  return app && f.data?.app_label ? f.data.app_label : f.label;
};

export const CHANNEL_COLORS = { Web: "#a066e8", App: "#ff9422", "Call Center": "#38d6ff" };

export const BULK_ACTIONS = {
  CREATED: ["CONFIRMED", "Confirm selected"],
  ASSIGNED: ["OUT_FOR_DELIVERY", "Send out for delivery"],
  OUT_FOR_DELIVERY: ["DELIVERED", "Mark delivered"],
};

export const ST_GRAD = {
  CONFIRMED: "var(--t-st-confirmed)",
  ASSIGNED: "var(--t-st-assigned)",
  OUT_FOR_DELIVERY: "var(--t-st-out)",
  DELIVERED: "var(--t-st-delivered)",
};

export const payments = () => list("payment_type").map((p) => [p.code, p.label]);
export const payLabel = (p) => {
  const f = list("payment_type").find((x) => x.code === p);
  return f ? f.data?.short || f.label : p || "—";
};
export const channels = (module) => list("channel").filter((c) => !module || c.data?.module === module).map((c) => c.code);

export const platformClass = (ch) =>
  "badge-platform " + ({ "Call Center": "pf-callcenter", Web: "pf-web", App: "pf-app" }[ch] || "pf-callcenter");

