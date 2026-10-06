import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "./BrandLogo";
import Icon from "../../config/icons";
import { canView } from "../../config/permissions";
import ThemeLive from "../appearance/ThemeLive";

const NAV = [
  { group: null, items: [["dashboard", "grid", "Dashboard", "/dashboard"]] },
  {
    group: "Operations",
    items: [
      ["orders", "receipt", "Home Delivery Orders", "/orders"],
      ["app-orders", "globe", "Shopify & App Orders", "/app-orders"],
      ["dispatch", "route", "Order Dispatch", "/dispatch"],
    ],
  },
  {
    group: "Fleet",
    items: [
      ["riders", "bike", "Riders", "/riders"],
      ["tracking", "pin", "Live Tracking", "/tracking"],
    ],
  },
  {
    group: "Catalogue",
    items: [
      ["companies", "building", "Business Setup", "/companies"],
      ["items", "food", "Items & Categories", "/items"],
    ],
  },
  {
    group: "Loyalty",
    items: [
      ["chickmate", "star", "Chickmate Club", "/chickmate"],
      ["tiers", "medal", "Tiers", "/tiers"],
      ["campaigns", "tag", "Campaigns", "/campaigns"],
      ["loyalty-settings", "gear", "Loyalty Settings", "/loyalty-settings"],
    ],
  },
  {
    group: "Security",
    items: [
      ["users", "user", "Users & Roles", "/security"],
      ["appearance", "palette", "Appearance", "/appearance"],
    ],
  },
  { group: "Data", items: [["data-sync", "sync", "Data Sync", "/data-sync"]] },
  {
    group: "Reports",
    items: [
      ["exceptions", "alert", "Exception Reporting", "/exceptions"],
      ["activity-log", "history", "Activity Log", "/activity-log"],
    ],
  },
  {
    group: "Settings",
    items: [
      ["delivery-settings", "bike", "Delivery Settings", "/delivery-settings"],
      ["exception-settings", "sliders", "Exception Settings", "/exception-settings"],
    ],
  },
];

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "SB";

const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
};

export default function Sidebar({ onNavigate }) {
  const { user, logout, remaining } = useAuth();

  return (
    <aside className="side" id="side">
      <ThemeLive />
      <div className="side__logo">
        <BrandLogo />
      </div>
      <nav className="side__nav">
        {NAV.map((sec, i) => {
          const items = sec.items.filter(([, , label]) => canView(user, label));
          if (!items.length) return null;
          return (
            <div key={sec.group || `g${i}`}>
              {sec.group && <div className="nav__group">{sec.group}</div>}
              {items.map(([key, ico, label, to]) => (
                <NavLink
                  key={key}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    "nav__item" + (isActive ? " is-active" : "")
                  }
                >
                  <span className="ico">
                    <Icon name={ico} />
                  </span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="side__foot">
        <div className="side__user">
          <div className="avatar">{initials(user?.name)}</div>
          <div>
            <b>{user?.name || "User"}</b>
            <span>{user?.role || "—"}</span>
          </div>
          <span
            className="sess-badge"
            id="sess-badge"
            title="Session time remaining"
          >
            {mmss(remaining)}
          </span>
        </div>
        <button className="side__logout" onClick={logout}>
          <Icon name="power" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}