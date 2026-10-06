import Icon from "../../config/icons";

const Side = ({ active = true, hover, group, user, out, line }) => (
  <div className="ap-sbar">
    {group && <span className="grp">Operations</span>}
    {active && <span className="on"><Icon name="grid" />Dashboard</span>}
    <span className={hover ? "hv" : ""}><Icon name="bike" />Riders</span>
    {line && <i />}
    {user && <span className="usr">Admin</span>}
    {out && <span className="out"><Icon name="power" />Log out</span>}
  </div>
);

const Head = ({ btn, back }) => (
  <div className="ap-hd">
    {back && <span className="backc backc--head"><span className="ic"><Icon name="back" /></span>Back</span>}
    <span>Home Delivery Orders</span>
    {btn && <span className="hb">+ New order</span>}
  </div>
);

const Table = ({ hover, sel }) => (
  <div className="ap-tbl">
    <div className="h"><span>Order ID</span><span>Customer</span><span>Amount</span></div>
    <div><span className="c">SB-20094</span><span>Sana Khan</span><span>Rs 2,320</span></div>
    {hover && <div className="hv"><span className="c">SB-20095</span><span>Ali Raza</span><span>Rs 1,400</span></div>}
    {sel && <div className="sl"><span className="c">SB-20096</span><span>Usman</span><span>Rs 750</span></div>}
  </div>
);

const Badge = ({ c }) => <span className={`badge b-${c}`}>{{ green: "Active", red: "Inactive", amber: "Pending", blue: "Web", grey: "Off", plum: "Call Center" }[c]}</span>;

const MapPv = ({ k }) => {
  if (k === "map-route" || k === "map-done") return <div className="ap-map"><s style={{ background: `var(--t-${k})` }} /><i style={{ left: "12%", background: `var(--t-${k})` }} /><i style={{ left: "88%", background: "var(--t-map-busy)" }} /></div>;
  return <div className="ap-map"><i style={{ left: "30%", background: `var(--t-${k})` }} /><i style={{ left: "62%", background: "var(--t-map-free)", opacity: k === "map-free" ? 1 : 0.35 }} /></div>;
};

export default function WebPreview({ k }) {
  if (k.startsWith("sb-")) {
    const p = {
      "sb-hover": { hover: true }, "sb-group": { group: true }, "sb-user-bg": { user: true, active: false }, "sb-user-text": { user: true, active: false },
      "sb-logout-text": { out: true, active: false }, "sb-line": { line: true, user: true, active: false }, "sb-icon": { hover: false },
    }[k] || {};
    return <Side {...p} />;
  }
  if (k.startsWith("menu-btn")) return <span className="ap-fab"><Icon name="menu" /></span>;
  if (k === "head-bg" || k === "head-text") return <Head />;
  if (k.startsWith("head-btn")) return <Head btn />;
  if (k.startsWith("head-back")) return <Head back />;
  if (k.startsWith("back-")) return <span className="backc"><span className="ic"><Icon name="back" /></span><span>Back</span></span>;
  if (["page-bg", "card-bg", "border", "border-2", "soft-bg"].includes(k)) return <div className="ap-page"><b /><em /></div>;
  if (k === "text-main") return <span className="ap-txt" style={{ color: "var(--t-text-main)" }}>Ahmed Ali</span>;
  if (k === "text-2") return <span className="ap-txt" style={{ color: "var(--t-text-2)" }}>+92 333 1112233</span>;
  if (k === "text-muted") return <span className="ap-txt" style={{ color: "var(--t-text-muted)" }}>Sep 30 · 12:16 PM</span>;
  if (k === "accent") return <><span className="ap-txt" style={{ color: "var(--t-accent)" }}>View order</span><span className="ap-pg on" style={{ background: "var(--t-accent)" }}>1</span></>;
  if (k === "accent-soft") return <span className="badge" style={{ background: "var(--t-accent-soft)", color: "var(--t-accent)" }}>Selected</span>;
  if (k === "code-text") return <span className="ap-txt" style={{ color: "var(--t-code-text)", fontWeight: 600 }}>SB-20094</span>;
  if (k === "th-bg" || k === "th-text") return <div className="ap-tbl"><div className="h"><span>Order ID</span><span>Customer</span><span>Amount</span></div></div>;
  if (k === "row-hover") return <Table hover />;
  if (k === "row-selected") return <Table sel />;
  if (k === "row-bg" || k === "row-line") return <Table hover={false} sel={false} />;
  if (k.startsWith("page-active")) return <><span className="ap-pg">‹</span><span className="ap-pg on">1</span><span className="ap-pg">2</span><span className="ap-pg">3</span></>;
  if (k === "btn-bg" || k === "btn-text") return <span className="btn">Save</span>;
  if (k === "btn-hover") return <span className="btn" style={{ background: "var(--t-btn-hover)" }}>Save</span>;
  if (k.startsWith("ghost")) return <span className="btn btn--ghost">Cancel</span>;
  if (k.startsWith("danger")) return <span className="btn btn--danger">Delete</span>;
  if (k.startsWith("tab")) return <><span className="tab is-active">All (15)</span><span className="tab">Created (2)</span></>;
  if (k.startsWith("view-") && k !== "view-side" && k !== "view-side-text") return <span className="iconbtn view"><Icon name="eye" /></span>;
  if (k.startsWith("edit-")) return <span className="iconbtn edit"><Icon name="edit" /></span>;
  if (k.startsWith("del-")) return <span className="iconbtn del"><Icon name="trash" /></span>;
  if (k.startsWith("st-")) {
    const t = { "st-created": "Created", "st-confirmed": "Confirmed", "st-assigned": "Assigned", "st-out": "Out for delivery", "st-delivered": "Delivered", "st-cancelled": "Cancelled" }[k];
    return <span className={`st ${k}`}>{t}</span>;
  }
  if (k.startsWith("b-")) return <Badge c={k.split("-")[1]} />;
  if (k === "toast-err") return <div className="toast toast--error"><span className="toast__ic">!</span><span>No internet</span></div>;
  if (k.startsWith("toast")) return <div className="toast toast--success"><span className="toast__ic">✓</span><span>Order saved</span></div>;
  if (k === "in-focus") return <span className="input" style={{ borderColor: "var(--t-in-focus)", boxShadow: "0 0 0 3px rgba(109,40,217,.12)" }}>Ahmed Ali</span>;
  if (k === "in-text") return <span className="input" style={{ color: "var(--t-in-text)" }}>Ahmed Ali</span>;
  if (k === "label") return <div className="ap-lbl"><small>Customer name</small><span className="input" style={{ color: "var(--t-in-placeholder)" }}>Enter name</span></div>;
  if (k.startsWith("in-")) return <span className="input" style={{ color: "var(--t-in-placeholder)" }}>Enter name</span>;
  if (k.startsWith("drop")) return <div className="ap-drop"><span>Lahore</span><span className="hv">Karachi</span></div>;
  if (k === "overlay" || k.startsWith("modal")) return <div className="ap-ov"><b>Edit order</b></div>;
  if (k.startsWith("view-side")) return <div className="ap-side"><b>SB-20094</b><i /></div>;
  if (k.startsWith("gmap")) return <span className="gmap-btn"><Icon name="map" />Google Maps</span>;
  if (k.startsWith("warn")) return <div className="dsp-warn"><Icon name="alert" /><span>Rider is far from the shop</span></div>;
  if (k.startsWith("duty-on")) return <span className="duty duty--on">On duty</span>;
  if (k.startsWith("duty-off")) return <span className="duty duty--off">Off duty</span>;
  if (k.startsWith("incart")) return <span className="pos-qb">2 in cart</span>;
  if (k.startsWith("noimg")) return <div className="pos-img noimg"><Icon name="image" />No image</div>;
  if (k.startsWith("imp-err")) return <div className="err-line"><Icon name="alert" /><span>Row 4: Phone is required</span></div>;
  if (k.startsWith("appr")) return <span className="appr">Approval pending</span>;
  if (k.startsWith("tl-")) {
    return (
      <div className="tl">
        <div className="tl-s done"><i /><b>12:16</b><span>Placed</span></div>
        <div className="tl-s done"><i /><b>12:20</b><span>Assigned</span></div>
        <div className="tl-s"><i /><b>—</b><span>Delivered</span></div>
      </div>
    );
  }
  if (k.startsWith("tbox")) return <div className="tbox"><span>Delivery time</span><b>24 min</b></div>;
  if (k.startsWith("time-chip")) return <div className="ra-times"><span>Delivered in <b>24 min</b></span></div>;
  if (k.startsWith("map-")) return <MapPv k={k} />;
  if (["db-revenue", "db-live", "db-delivered", "db-riders"].includes(k)) {
    const t = { "db-revenue": ["Revenue", "Rs 6,500"], "db-live": ["Live orders", "2"], "db-delivered": ["Delivered", "4"], "db-riders": ["Riders on delivery", "0 / 3"] }[k];
    return <div className="ap-dbs" style={{ background: `var(--t-${k})` }}><small>{t[0]}</small><b>{t[1]}</b></div>;
  }
  if (k === "db-card-text") return <div className="ap-dbs" style={{ background: "var(--t-db-revenue)" }}><small>Revenue</small><b>Rs 6,500</b></div>;
  if (k === "db-orders" || k === "db-new-members") {
    const h = [40, 70, 55, 90, 30, 65];
    return <div className="ap-bars">{h.map((x, i) => <i key={i} style={{ height: `${x}%`, background: `var(--t-${k})` }} />)}</div>;
  }
  if (k.startsWith("ly-member")) return <div className="ly-strip gold"><b>Member One</b><span>Gold · 1,250 pts</span></div>;
  if (k === "ly-new") return <div className="ly-strip new"><b>New customer</b></div>;
  if (k === "ly-selected") return <span className="ly-sel">Selected</span>;
  if (k === "ly-best") return <span className="ly-tag">Best</span>;
  if (k === "ly-points") return <span className="ly-xtag">120 pts</span>;
  if (k.startsWith("ly-earn")) return <div className="ly-earn">Earns 24 points</div>;
  if (k.startsWith("lg-")) {
    return (
      <div className="ap-lg">
        <div className="l">Every order</div>
        <div className="r"><div className="c"><b>Sign in</b><i /><i /><em>Sign in</em></div></div>
      </div>
    );
  }
  return <span className="ap-txt" style={{ background: `var(--t-${k})`, width: "3rem", height: "1.25rem", borderRadius: 5 }} />;
}
