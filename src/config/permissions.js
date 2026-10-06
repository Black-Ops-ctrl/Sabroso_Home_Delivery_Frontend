export const PERM_MODULES = [
  { name: "Dashboard", actions: ["view"] },
  { name: "Home Delivery Orders", actions: ["view", "add", "edit", "delete", "assign", "cancel", "reassign", "deliver anyway", "import", "export"] },
  { name: "Shopify & App Orders", actions: ["view", "edit", "cancel", "reassign", "deliver anyway", "import", "export"] },
  { name: "Order Dispatch", actions: ["view", "assign", "edit"] },
  { name: "Riders", actions: ["view", "add", "edit", "delete", "release phone", "import", "export"] },
  { name: "Live Tracking", actions: ["view"] },
  { name: "Business Setup", actions: ["view", "add", "edit", "delete", "import", "export"] },
  { name: "Items & Categories", actions: ["view", "add", "edit", "delete", "import", "export"] },
  { name: "Chickmate Club", actions: ["view", "add", "edit", "delete", "adjust", "approve", "import", "export"] },
  { name: "Tiers", actions: ["view", "add", "edit", "delete"] },
  { name: "Campaigns", actions: ["view", "add", "edit", "delete"] },
  { name: "Loyalty Settings", actions: ["view", "edit"] },
  { name: "Users & Roles", actions: ["view", "add", "edit", "delete", "permissions"] },
  { name: "Appearance", actions: ["view", "edit"] },
  { name: "Data Sync", actions: ["view", "add", "edit", "regenerate", "revoke", "sync now", "download"] },
  { name: "Exception Reporting", actions: ["view", "download"] },
  { name: "Activity Log", actions: ["view", "download"] },
  { name: "Delivery Settings", actions: ["view", "edit"] },
  { name: "Exception Settings", actions: ["view", "edit"] },
];

export const permCount = (perms = {}) =>
  Object.values(perms).reduce(
    (t, arr) => t + (Array.isArray(arr) ? arr.length : 0),
    0
  );

const isAdmin = (user) => user?.role === "Administrator";

export const can = (user, moduleName, action = "view") => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const arr = user.perms?.[moduleName];
  return Array.isArray(arr) && arr.includes(action);
};

export const canView = (user, moduleName) => can(user, moduleName, "view");

export const MODULE_PATH = {
  Dashboard: "/dashboard",
  "Home Delivery Orders": "/orders",
  "Shopify & App Orders": "/app-orders",
  "Order Dispatch": "/dispatch",
  Riders: "/riders",
  "Live Tracking": "/tracking",
  "Business Setup": "/companies",
  "Items & Categories": "/items",
  "Chickmate Club": "/chickmate",
  Tiers: "/tiers",
  Campaigns: "/campaigns",
  "Loyalty Settings": "/loyalty-settings",
  "Users & Roles": "/security",
  Appearance: "/appearance",
  "Data Sync": "/data-sync",
  "Exception Reporting": "/exceptions",
  "Activity Log": "/activity-log",
  "Delivery Settings": "/delivery-settings",
  "Exception Settings": "/exception-settings",
};

export const firstAllowedPath = (user) => {
  const mod = PERM_MODULES.find((m) => canView(user, m.name));
  return mod ? MODULE_PATH[mod.name] : null;
};