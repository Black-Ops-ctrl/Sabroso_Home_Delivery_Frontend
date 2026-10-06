const G = (angle, ...stops) => `linear-gradient(${angle}deg, ${stops.map(([c, p]) => `${c} ${p}%`).join(", ")})`;
const HERO = G(135, ["#4c1d95", 0], ["#7e22ce", 55], ["#f59e0b", 145]);
const PURPLE = G(150, ["#2e0654", 0], ["#5b21b6", 100]);
const TH = G(90, ["#2e0654", 0], ["#5b21b6", 100]);
const AMBER = G(90, ["#f59e0b", 0], ["#f97316", 100]);
const AMBER_H = G(90, ["#e8900a", 0], ["#ea670c", 100]);

export const WEB_TABS = [
  { id: "side", name: "Sidebar & header" },
  { id: "page", name: "Page & text" },
  { id: "table", name: "Tables & buttons" },
  { id: "status", name: "Status colours" },
  { id: "form", name: "Forms & inputs" },
  { id: "ops", name: "Orders & dispatch" },
  { id: "dash", name: "Dashboard & loyalty" },
  { id: "login", name: "Login page" },
];

export const THEME_GROUPS = [
  { id: "sidebar", tab: "side", name: "Sidebar", items: [
    ["sb-top", "Top colour", "#2e0654", "#3b0764"],
    ["sb-bottom", "Bottom colour", "#4c1d95", "#2c0450"],
    ["sb-active", "Active item", "#ffffff", HERO],
    ["sb-active-text", "Active item text", "#6d28d9", "#ffffff"],
    ["sb-text", "Menu text", "#f3eefe", "#f4eefb"],
    ["sb-icon", "Menu icons", "#c4b5fd", "#c8b2e6"],
    ["sb-group", "Section headings", "#a78bfa", "#c8b2e6"],
    ["sb-hover", "Hover background", "rgba(255, 255, 255, 0.08)"],
    ["sb-line", "Borders", "rgba(255, 255, 255, 0.12)"],
    ["sb-user-bg", "User box", "rgba(255, 255, 255, 0.08)"],
    ["sb-user-text", "User box text", "#ffffff"],
    ["sb-logout-text", "Log out text", "#f3eefe", "#f4eefb"],
    ["menu-btn-bg", "Menu button", "#ffffff"],
    ["menu-btn-icon", "Menu button icon", "#6d28d9"],
  ] },
  { id: "header", tab: "side", name: "Page header", items: [
    ["head-bg", "Header colour", PURPLE, HERO],
    ["head-text", "Header text", "#ffffff"],
    ["head-btn-bg", "Header buttons", AMBER, "#f59e0b"],
    ["head-btn-text", "Header button text", "#ffffff"],
    ["head-back-bg", "Header back button", AMBER, "#f59e0b"],
    ["head-back-text", "Header back button text", "#ffffff"],
    ["back-bg", "Back button", AMBER, HERO],
    ["back-text", "Back button text", "#1c1726", "#231733"],
  ] },
  { id: "page", tab: "page", name: "Page", items: [
    ["page-bg", "Page background", "#f6f4f1", "#ffffff"],
    ["card-bg", "Card background", "#ffffff"],
    ["border", "Card border", "#ece8f4", "#ece9f2"],
    ["border-2", "Lines and outlines", "#e4dfea", "#ded9ea"],
    ["soft-bg", "Soft background", "#f7f5fb"],
  ] },
  { id: "text", tab: "page", name: "Text", items: [
    ["text-main", "Main text", "#1c1726", "#231733"],
    ["text-2", "Secondary text", "#4a4458", "#403a52"],
    ["text-muted", "Muted text", "#8a8298", "#5e5573"],
    ["accent", "Accent", "#6d28d9"],
    ["accent-soft", "Accent light", "#efe9fe"],
    ["code-text", "Order code", "#6d28d9"],
  ] },
  { id: "tables", tab: "table", name: "Tables", items: [
    ["th-bg", "Table head", TH, HERO],
    ["th-text", "Table head text", "#ffffff"],
    ["row-bg", "Row background", "#ffffff"],
    ["row-hover", "Row hover", "#faf8fd"],
    ["row-line", "Row lines", "#f0ecf5", "#ece9f2"],
    ["row-selected", "Selected row", "#efe9fe"],
    ["page-active", "Active page number", "#6d28d9"],
    ["page-active-text", "Active page number text", "#ffffff"],
  ] },
  { id: "buttons", tab: "table", name: "Buttons", items: [
    ["btn-bg", "Main button", AMBER, "#f59e0b"],
    ["btn-hover", "Main button hover", AMBER_H, "#e08a00"],
    ["btn-text", "Main button text", "#ffffff"],
    ["ghost-bg", "Cancel button", "#ffffff"],
    ["ghost-text", "Cancel button text", "#4a4458", "#403a52"],
    ["ghost-border", "Cancel button border", "#e4dfea", "#ded9ea"],
    ["danger-bg", "Delete button", "#fdeaea"],
    ["danger-text", "Delete button text", "#dc2626"],
  ] },
  { id: "tabs", tab: "table", name: "Tabs", items: [
    ["tab-active", "Active tab", "#6d28d9", HERO],
    ["tab-active-text", "Active tab text", "#ffffff"],
    ["tab-bg", "Tab background", "#ffffff"],
    ["tab-text", "Tab text", "#4a4458", "#403a52"],
    ["tab-border", "Tab border", "#ece8f4", "#ded9ea"],
  ] },
  { id: "icons", tab: "table", name: "Action icons", items: [
    ["view-bg", "View background", "#efe6fd"],
    ["view-icon", "View icon", "#6d28d9"],
    ["edit-bg", "Edit background", "#fff2d9"],
    ["edit-icon", "Edit icon", "#b3720a"],
    ["del-bg", "Delete background", "#fde3e3"],
    ["del-icon", "Delete icon", "#d22a2a"],
  ] },
  { id: "status", tab: "status", name: "Order status colours", wide: true, items: [
    ["st-created", "Created", G(135, ["#fbbf24", 0], ["#f59e0b", 100])],
    ["st-confirmed", "Confirmed", G(135, ["#60a5fa", 0], ["#2563eb", 100])],
    ["st-assigned", "Assigned", G(135, ["#a78bfa", 0], ["#7c3aed", 100])],
    ["st-out", "Out for delivery", G(135, ["#22d3ee", 0], ["#0891b2", 100])],
    ["st-delivered", "Delivered", G(135, ["#4ade80", 0], ["#16a34a", 100])],
    ["st-cancelled", "Cancelled", G(135, ["#f87171", 0], ["#dc2626", 100])],
  ] },
  { id: "badges", tab: "status", name: "Badges", items: [
    ["b-green-bg", "Green badge", "#e6f6ec"], ["b-green-text", "Green badge text", "#15803d"],
    ["b-red-bg", "Red badge", "#fdeaea"], ["b-red-text", "Red badge text", "#dc2626"],
    ["b-amber-bg", "Amber badge", "#fdf0da"], ["b-amber-text", "Amber badge text", "#b45309"],
    ["b-blue-bg", "Blue badge", "#e7edfd"], ["b-blue-text", "Blue badge text", "#1d4ed8"],
    ["b-grey-bg", "Grey badge", "#eef0f3"], ["b-grey-text", "Grey badge text", "#556070"],
    ["b-plum-bg", "Purple badge", "#efe9fe"], ["b-plum-text", "Purple badge text", "#6d28d9"],
  ] },
  { id: "messages", tab: "status", name: "Messages", items: [
    ["toast-ok", "Success message", G(135, ["#16a34a", 0], ["#22c55e", 100])],
    ["toast-err", "Error message", G(135, ["#dc2626", 0], ["#f87171", 100])],
    ["toast-text", "Message text", "#ffffff"],
  ] },
  { id: "inputs", tab: "form", name: "Inputs", items: [
    ["in-bg", "Field background", "#ffffff", "#f7f5fb"],
    ["in-text", "Field text", "#1c1726", "#231733"],
    ["in-border", "Field border", "#e4dfea", "#ded9ea"],
    ["in-focus", "Field focus border", "#6d28d9"],
    ["in-placeholder", "Placeholder", "#8a8298", "#5e5573"],
    ["label", "Field label", "#4a4458", "#403a52"],
    ["drop-bg", "Dropdown list", "#ffffff"],
    ["drop-hover", "Dropdown hover", "#efe9fe"],
  ] },
  { id: "modals", tab: "form", name: "Modals", items: [
    ["overlay", "Overlay behind modals", "rgba(20, 10, 40, 0.45)"],
    ["modal-bg", "Modal background", "#ffffff"],
    ["modal-title", "Modal title", "#1c1726", "#231733"],
    ["view-side", "View side panel", PURPLE, HERO],
    ["view-side-text", "View side panel text", "#ffffff"],
  ] },
  { id: "extras", tab: "ops", name: "Orders & dispatch", items: [
    ["gmap-bg", "Google Maps button", "#f59e0b"],
    ["gmap-text", "Google Maps button text", "#ffffff"],
    ["warn-bg", "Dispatch warning", "#fff8e1"],
    ["warn-border", "Dispatch warning border", "#f5d38a"],
    ["warn-text", "Dispatch warning text", "#8a5a00"],
    ["duty-on-bg", "On duty chip", "#e6f6ec"],
    ["duty-on-text", "On duty chip text", "#15803d"],
    ["duty-off-bg", "Off duty chip", "#eef0f3"],
    ["duty-off-text", "Off duty chip text", "#556070"],
    ["incart-bg", "In cart tag", "#f59e0b"],
    ["incart-text", "In cart tag text", "#ffffff"],
    ["noimg-border", "No image box border", "#e4dfea", "#ded9ea"],
    ["noimg-text", "No image text", "#8a8298", "#5e5573"],
    ["imp-err-bg", "Import error panel", "#fff5f5"],
    ["imp-err-border", "Import error border", "#f5c2c2"],
    ["imp-err-text", "Import error text", "#b91c1c"],
    ["appr-bg", "Approval pending tag", "#fdf0da"],
    ["appr-text", "Approval pending text", "#b45309"],
  ] },
  { id: "delivery", tab: "ops", name: "Delivery times", items: [
    ["tl-line", "Timeline line", "#6d28d9"],
    ["tl-todo", "Timeline line ahead", "#e4dfea", "#ded9ea"],
    ["tl-dot", "Timeline dot", "#6d28d9"],
    ["tl-time", "Timeline time", "#1c1726", "#231733"],
    ["tl-label", "Timeline label", "#8a8298", "#5e5573"],
    ["tbox-bg", "Time box background", "#ffffff"],
    ["tbox-border", "Time box border", "#e4dfea", "#ded9ea"],
    ["tbox-edge", "Time box edge", "#6d28d9"],
    ["tbox-label", "Time box label", "#8a8298", "#5e5573"],
    ["tbox-text", "Time box value", "#1c1726", "#231733"],
    ["time-chip-bg", "Delivery time chip", "#e6f6ec"],
    ["time-chip-text", "Delivery time chip text", "#15803d"],
  ] },
  { id: "map", tab: "ops", name: "Map", items: [
    ["map-free", "Rider online", "#94a3b8"],
    ["map-busy", "Rider on an order", "#16a34a"],
    ["map-selected", "Selected rider", "#1a73e8"],
    ["map-offline", "Rider offline", "#cbd5e1"],
    ["map-route", "Route to customer", "#1a73e8"],
    ["map-done", "Route already driven", "#6d28d9"],
  ] },
  { id: "dashboard", tab: "dash", name: "Dashboard", items: [
    ["db-revenue", "Revenue card", G(135, ["#4c1d95", 0], ["#7e22ce", 100])],
    ["db-live", "Live orders card", G(135, ["#1e40af", 0], ["#3b82f6", 100])],
    ["db-delivered", "Delivered card", G(135, ["#15803d", 0], ["#22c55e", 100])],
    ["db-riders", "Riders card", G(135, ["#0e7490", 0], ["#06b6d4", 100])],
    ["db-card-text", "Card text", "#ffffff"],
    ["db-orders", "Chart orders", "#7c3aed"],
    ["db-new-members", "Chart new members", "#f59e0b"],
  ] },
  { id: "loyalty", tab: "dash", name: "Loyalty", items: [
    ["ly-member", "Member strip", G(135, ["#fff7e6", 0], ["#fdecc8", 100])],
    ["ly-member-border", "Member strip border", "#f5d38a"],
    ["ly-new", "New customer strip", "#eefbf3"],
    ["ly-selected", "Selected tag", "#6d28d9"],
    ["ly-best", "Best tag", "#f59e0b"],
    ["ly-points", "Points badge", "#6d28d9"],
    ["ly-earn-bg", "Points to earn box", "#e6f6ec"],
    ["ly-earn-text", "Points to earn text", "#15803d"],
  ] },
  { id: "login", tab: "login", name: "Login page", wide: true, items: [
    ["lg-bg", "Page background", "#f6f4f1", "#ffffff"],
    ["lg-left-top", "Left panel start", "#2e0654", "#3b0764"],
    ["lg-left-bottom", "Left panel end", "#5b21b6", "#2c0450"],
    ["lg-line", "Divider line", "#f59e0b"],
    ["lg-heading", "Left heading", "#ffffff"],
    ["lg-card-bg", "Sign-in box", "#ffffff"],
    ["lg-card-title", "Sign-in title", "#1c1726", "#231733"],
    ["lg-btn-bg", "Sign-in button", AMBER, "#f59e0b"],
    ["lg-btn-text", "Sign-in button text", "#ffffff"],
  ] },
];

export const THEME_ITEMS = THEME_GROUPS.flatMap((g) => g.items.map(([k, label, d]) => ({ k, label, d, group: g.id })));
export const THEME_DEFAULTS = Object.fromEntries(THEME_ITEMS.map((i) => [i.k, i.d]));
export const CLASSIC_THEME = Object.fromEntries(
  THEME_GROUPS.flatMap((g) => g.items.filter((it) => it.length > 3).map(([k, , , c]) => [k, c]))
);
export const THEME_PRESETS = [
  { id: "default", name: "Default", theme: {} },
  { id: "classic", name: "Classic", theme: CLASSIC_THEME },
];
export const isGradient = (v) => /gradient\(/i.test(String(v || ""));

export const APP_THEME_GROUPS = [
  { id: "a-head", tab: "nav", name: "Header & background", items: [
    { k: ["header-top", "header-bottom"], label: "Header colour", d: ["#2e0654", "#5b21b6"], pv: "header" },
    { k: ["background"], label: "Background", d: ["#f6f4f1"], pv: "background" },
    { k: ["card"], label: "Cards", d: ["#ffffff"], pv: "card" },
    { k: ["accent"], label: "Accent", d: ["#6d28d9"], pv: "accent" },
    { k: ["text"], label: "Text", d: ["#1c1726"], pv: "text" },
    { k: ["muted"], label: "Muted text", d: ["#8a8298"], pv: "muted" },
  ] },
  { id: "a-nav", tab: "nav", name: "Bottom navigation", items: [
    { k: ["nav-top", "nav-bottom"], label: "Bar colour", d: ["#2e0654", "#6d28d9"], pv: "nav" },
    { k: ["nav-pill"], label: "Active pill", d: ["#ffffff"], pv: "pill" },
    { k: ["nav-active"], label: "Active tab text", d: ["#6d28d9"], pv: "pill" },
    { k: ["slide-top", "slide-bottom"], label: "Slide button", d: ["#3b0764", "#6d28d9"], pv: "slide" },
  ] },
  { id: "a-buttons", tab: "buttons", name: "Order buttons", items: [
    { k: ["ofd-top", "ofd-bottom"], label: "Out for delivery", d: ["#22d3ee", "#0891b2"], pv: "ofd" },
    { k: ["delivered-top", "delivered-bottom"], label: "Delivered", d: ["#4ade80", "#16a34a"], pv: "delivered" },
    { k: ["cancel"], label: "Cancel", d: ["#dc2626"], pv: "cancel" },
    { k: ["go-shop-top", "go-shop-bottom"], label: "Go to shop", d: ["#f59e0b", "#f97316"], pv: "shop" },
  ] },
  { id: "a-msg", tab: "msgs", name: "Messages", items: [
    { k: ["success"], label: "Success", d: ["#16a34a"], pv: "success" },
    { k: ["error"], label: "Error", d: ["#dc2626"], pv: "error" },
    { k: ["info"], label: "Info", d: ["#6d28d9"], pv: "info" },
  ] },
  { id: "a-home", tab: "msgs", name: "Home", items: [
    { k: ["ring"], label: "Ring progress", d: ["#16a34a"], pv: "ring" },
    { k: ["chart-bar"], label: "Week chart", d: ["#7c3aed"], pv: "chart" },
  ] },
];
export const APP_TABS = [
  { id: "nav", name: "Header & navigation" },
  { id: "buttons", name: "Order buttons" },
  { id: "msgs", name: "Messages & home" },
];
export const APP_DEFAULTS = Object.fromEntries(
  APP_THEME_GROUPS.flatMap((g) => g.items.flatMap((it) => it.k.map((k, i) => [k, it.d[i]])))
);

export const resolveTheme = (saved = {}) => ({ ...THEME_DEFAULTS, ...(saved || {}) });
export function applyTheme(theme, root = document.documentElement) {
  for (const [k, v] of Object.entries(resolveTheme(theme))) root.style.setProperty(`--t-${k}`, v);
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function parseColor(str) {
  const s = String(str || "").trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255), a: clamp(a, 0, 1) };
  }
  return null;
}
const hx = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
export const toHex = ({ r, g, b }) => `#${hx(r)}${hx(g)}${hx(b)}`.toUpperCase();
export const toCss = (c) => (c.a >= 1 ? toHex(c) : `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Math.round(c.a * 100) / 100})`);
export function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: mx ? d / mx : 0, v: mx };
}
export function hsvToRgb({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function parseGradient(str) {
  const s = String(str || "");
  const inner = s.slice(s.indexOf("(") + 1, s.lastIndexOf(")"));
  const parts = []; let depth = 0, cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  let angle = 180;
  if (parts[0] && /deg$/.test(parts[0])) angle = parseFloat(parts.shift());
  const stops = parts.map((p, i) => {
    const m = p.match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/);
    return { c: (m && m[1]) || p, p: m && m[2] !== undefined ? parseFloat(m[2]) : Math.round((i / Math.max(1, parts.length - 1)) * 100) };
  });
  return { angle, stops: stops.length >= 2 ? stops : [{ c: "#6d28d9", p: 0 }, { c: "#f59e0b", p: 100 }] };
}
export const gradientCss = ({ angle, stops }) => `linear-gradient(${Math.round(angle)}deg, ${stops.map((s) => `${s.c} ${Math.round(s.p)}%`).join(", ")})`;

export const themeColor = (k) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--t-${k}`).trim();
    return v || THEME_DEFAULTS[k];
  } catch {
    return THEME_DEFAULTS[k];
  }
};