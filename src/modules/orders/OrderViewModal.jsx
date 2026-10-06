import Modal from "../../components/common/Modal";
import Icon from "../../config/icons";
import { money } from "../../config/format";
import { statusClass, statusLabel, payLabel } from "../../config/orders";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const hm = (d) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—");
const dm = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const km = (v) => (v === null || v === undefined || v === "" ? "—" : `${Number(v).toFixed(1)} km`);
const viaLabel = (v) => (v === "APP" ? "App" : v === "WEB" ? "Web" : v || "");
const ST_KEY = { CREATED: "created", CONFIRMED: "confirmed", ASSIGNED: "assigned", OUT_FOR_DELIVERY: "out", DELIVERED: "delivered", CANCELLED: "cancelled" };

function Timeline({ order, app }) {
  const events = order.events || [];
  if (!events.length) return null;
  const sameDay = events.every((e) => dm(e.created_at) === dm(events[0].created_at));
  return (
    <div className="ov-tl" style={{ "--n": Math.min(events.length, 7) }}>
      {events.map((e) => {
        const label = e.kind === "CREATED" ? statusLabel("CREATED", app) : e.kind === "REASSIGN" ? "Reassigned" : e.kind === "CANCELLED" ? statusLabel("CANCELLED", app) : statusLabel(e.status_to, app);
        const key = e.kind === "REASSIGN" ? "confirmed" : ST_KEY[e.kind === "CREATED" ? "CREATED" : e.status_to] || "created";
        const who = [e.by_name, viaLabel(e.via)].filter(Boolean).join(" · ");
        return (
          <div key={e.id} className={`ov-tl__s is-${key}`}>
            <i />
            <b>{hm(e.created_at)}{!sameDay && <em> · {dm(e.created_at)}</em>}</b>
            <span>{label}</span>
            <small title={e.kind === "ASSIGNED" && e.rider_name ? `${who} → ${e.rider_name}` : who}>{e.kind === "ASSIGNED" && e.rider_name ? e.rider_name : who}</small>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderViewModal({ order, onClose }) {
  if (!order) return null;
  const delivered = order.status === "DELIVERED";
  const cancelled = order.status === "CANCELLED";
  const app = order.module ? order.module === "app" : !["Call Center"].includes(order.channel);
  const mins = order.dispatched_at && order.delivered_at
    ? Math.max(0, Math.round((new Date(order.delivered_at) - new Date(order.dispatched_at)) / 60000))
    : null;
  const qty = (order.items || []).reduce((t, l) => t + l.qty, 0);
  const rows = [
    ["Platform", order.channel],
    ["Payment type", payLabel(order.payment_type)],
    ["Quantity", `${qty} item${qty === 1 ? "" : "s"}`],
    ...(delivered ? [] : [["Total distance", order.distance_km != null ? `${Number(order.distance_km)} km` : "N/A"]]),
    ["Subtotal", money(order.subtotal)],
    ["Delivery charges", money(order.fee)],
    ["Discount", Number(order.discount) ? `− ${money(order.discount)}` : "No discount"],
    ["Placed", fmt(order.created_at)],
    ["Updated at", order.updated_at ? fmt(order.updated_at) : "Not updated yet"],
  ];

  return (
    <Modal wide cls="ov-modal ovx" hideFoot onClose={onClose}>
      <button className="ov__close" onClick={onClose} aria-label="Close">
        <Icon name="x" />
      </button>
      <div className="ov">
        <div className="ov__side">
          <div className="ov__id">{order.code}</div>
          <span className={statusClass(order.status)}>{statusLabel(order.status, app)}</span>
          <div className="ov__mini">
            <div className="lbl">Customer</div>
            <div className="val">{order.customer_name || "Walk-in"}</div>
            {order.customer_phone && <div className="val sm">{order.customer_phone}</div>}
          </div>
          <div className="ov__mini">
            <div className="lbl">Shop</div>
            <div className="val">{order.shop_name || "N/A"}{order.shop_city ? ` · ${order.shop_city}` : ""}</div>
          </div>
          <div className="ov__mini">
            <div className="lbl">Rider</div>
            <div className="val">{order.rider_name ? `${order.rider_name}${order.rider_code ? ` · ${order.rider_code}` : ""}` : "N/A"}</div>
          </div>
          <div className="ov__mini">
            <div className="lbl">Customer address</div>
            <div className="val ovx-addr" title={order.customer_address || ""}>{order.customer_address || "N/A"}</div>
          </div>
          <div className="ov__amt">
            <div className="lbl">Total amount</div>
            <div className="num">{money(order.total)}</div>
          </div>
        </div>
        <div className="ov__main">
          <h3 className="sec">Order details</h3>
          <Timeline order={order} app={app} />
          {cancelled && (
            <div className="ovx-reason">
              <span>Reason</span>
              <b>{order.cancel_reason || "N/A"}</b>
              {order.cancelled_at && (
                <small>{[order.cancelled_via === "APP" ? "Rider" : order.cancelled_by, viaLabel(order.cancelled_via), `${dm(order.cancelled_at)} ${hm(order.cancelled_at)}`].filter(Boolean).join(" · ")}</small>
              )}
            </div>
          )}
          {delivered && (
            <div className="tbox-row ovx-boxes">
              <div className="tbox"><span>Delivery time</span><b>{mins != null ? `${mins} min` : "—"}</b></div>
              <div className="tbox"><span>Actual distance</span><b>{km(order.actual_km)}</b></div>
              <div className="tbox"><span>Est. distance</span><b>{Number(order.distance_km) > 0 ? km(order.distance_km) : "—"}</b></div>
            </div>
          )}
          <div className="dl ovx-dl">
            {rows.map((x) => (
              <div key={x[0]}>
                <span className="dl-k">{x[0]}</span>
                <span className="dl-v">{x[1]}</span>
              </div>
            ))}
            <div className="ovx-span">
              <span className="dl-k">Remarks</span>
              <span className="dl-v">{order.remarks || "N/A"}</span>
            </div>
          </div>
          {(order.discount_source && order.discount_source !== "NONE") || order.card_code || order.referrer_customer_id ? (
            <div className="ovx-loy">
              {order.discount_source && order.discount_source !== "NONE" && (
                <div className="rowline">
                  <span>
                    Discount{order.discount_label ? ` · ${order.discount_label}` : ""}
                    {order.discount_by && <span className="sub"> · {order.discount_by}</span>}
                  </span>
                  <span className="strong" style={{ color: Number(order.discount) ? "var(--bad)" : undefined }}>
                    {Number(order.discount) ? `− ${money(order.discount)}` : "None"}
                  </span>
                </div>
              )}
              {Number(order.points_redeemed) > 0 && (
                <div className="rowline"><span>⭐ Points redeemed</span><span className="strong">{Number(order.points_redeemed).toLocaleString("en-US")} pts</span></div>
              )}
              {order.card_code && (
                <div className="rowline">
                  <span>⭐ Points earned <span className="sub">{order.card_code}{order.tier_name ? ` · ${order.tier_name}` : ""}</span></span>
                  <span className="strong" style={{ color: "var(--ok)" }}>
                    {delivered ? `+ ${Number(order.points_earned || 0).toLocaleString("en-US")} pts` : cancelled ? "—" : "Added on delivery"}
                  </span>
                </div>
              )}
              {order.referrer_customer_id && (
                <div className="rowline">
                  <span>🤝 Referred by {order.referrer_name || "—"}</span>
                  <span className="sub">{delivered ? `+ ${order.referral_points || 0} pts to referrer` : "Referrer rewarded on delivery"}</span>
                </div>
              )}
            </div>
          ) : null}
          <h3 className="sec ovx-sec">Order items</h3>
          <div className="ovx-items">
            {(order.items || []).map((l) => (
              <div className="rowline" key={l.id}>
                <span>{l.qty} × {l.name}</span>
                <span className="strong">{money(l.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
