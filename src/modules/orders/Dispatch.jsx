import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Icon from "../../config/icons";
import { money } from "../../config/format";
import { statusLabel, payLabel } from "../../config/orders";
import { useApi } from "../../hooks/useApi";
import { useLive } from "../../context/LiveContext";
import { useLookups } from "../../context/LookupsContext";
import { ordersApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import { deliveryStatus } from "../../config/riders";
import { loadGoogleMaps, roadRoute, navLink, makeMarker } from "../../config/googleMaps";

const agoText = (s) => (s == null ? "" : s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`);

const whereText = (r, road) => {
  if (r.lat == null || r.shop_lat == null) return null;
  if (r.at_shop && r.fresh) return `✓ At the shop · ${r.metres_to_shop} m`;
  if (!r.fresh) return null;
  return road ? `${road.km} km · ${road.min} min to shop` : `${r.km_to_shop} km · ${r.eta_to_shop_min} min to shop`;
};
const seenText = (r) => {
  if (r.seconds_ago == null) return "";
  if (r.conn === "LIVE") return `Live · ${agoText(r.seconds_ago)}`;
  if (r.conn === "WEAK") return `Weak signal · ${agoText(r.seconds_ago)}`;
  return `Last seen ${agoText(r.seconds_ago)}`;
};
const blockText = (r) =>
  ({
    off_duty: `${r.name} is off duty`,
    on_delivery: `${r.name} is on delivery`,
    no_gps: `${r.name} has no live location`,
    stale: `${r.name} has no live location`,
    far: `${r.name} is not at the shop`,
  }[r.assign_block] || "");
const RIDER_ROUTES = 8;
const RIDER_COL = { AVAILABLE: "#16a34a", ORDER_ASSIGNED: "#d97706", ON_DELIVERY: "#7c3aed" };
const mapsLink = (r, shop) =>
  r.fresh && shop && !r.at_shop ? navLink({ lat: r.lat, lng: r.lng }, shop) : `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`;

function RiderMap({ riders, shop, customer, selId, onPick, roads }) {
  const box = useRef(null);
  const st = useRef({ map: null, marks: [], line: null });
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then((maps) => {
        if (!alive || !box.current || st.current.map) return;
        st.current.map = new maps.Map(box.current, { center: shop || { lat: 31.52, lng: 74.35 }, zoom: 13, disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "cooperative" });
        setOk(true);
      })
      .catch(() => setOk(false));
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const m = st.current.map;
    if (!ok || !m) return;
    const maps = window.google.maps;
    st.current.marks.forEach((x) => x.setMap(null));
    st.current.marks = [];
    const b = new maps.LatLngBounds();
    let n = 0;
    if (customer) {
      st.current.marks.push(makeMarker({ position: customer, map: m, title: "Customer", zIndex: 15,
        icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }, label: { text: "🏠", fontSize: "11px" } }));
      b.extend(customer); n++;
    }
    if (!st.current.line) st.current.line = new maps.Polyline({ map: m, strokeColor: "#1a73e8", strokeOpacity: 0.85, strokeWeight: 5, zIndex: 5 });
    const path = (roads[selId] && roads[selId].path) || [];
    st.current.line.setPath(path);
    path.forEach((p) => b.extend(p));
    if (shop) {
      st.current.marks.push(makeMarker({ position: shop, map: m, title: "Shop", zIndex: 20,
        icon: { path: maps.SymbolPath.CIRCLE, scale: 12, fillColor: "#6d28d9", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }, label: { text: "🏪", fontSize: "12px" } }));
      b.extend(shop); n++;
    }
    riders.filter((r) => r.lat != null).forEach((r) => {
      const sel = r.id === selId;
      const mk = makeMarker({ position: { lat: r.lat, lng: r.lng }, map: m, title: `${r.name} · ${deliveryStatus(r.delivery_status).label}`, zIndex: sel ? 30 : 10,
        opacity: r.online ? 1 : 0.55,
        icon: { path: maps.SymbolPath.CIRCLE, scale: sel ? 13 : 10, fillColor: RIDER_COL[r.delivery_status] || "#16a34a", fillOpacity: 1, strokeColor: sel ? "#111827" : "#fff", strokeWeight: 3 },
        label: { text: "🛵", fontSize: sel ? "13px" : "11px" } });
      if (r.can_assign) mk.addListener("click", () => onPick(r.id));
      st.current.marks.push(mk);
      b.extend({ lat: r.lat, lng: r.lng }); n++;
    });
    if (n > 1) m.fitBounds(b, 30);
    else if (n === 1) { m.setCenter(b.getCenter()); m.setZoom(14); }
  }, [ok, riders, shop?.lat, shop?.lng, customer?.lat, customer?.lng, selId, roads]);
  return <div ref={box} className={`dov-gmap ${ok ? "on" : ""}`} />;
}

const shortDT = (d) =>
  d
    ? `${new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${new Date(
        d
      ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : "—";

export default function Dispatch() {
  const toast = useToast();
  const { can } = useAuth();
  useLookups();
  const { data, loading, error, reload } = useApi(() => ordersApi.dispatch(), [], ["orders", "order_items", "customers", "shops"]);
  const orders = data || [];

  const search = usePageSearch("dispatch");
  const [selId, setSelId] = useState(null);
  const [selRider, setSelRider] = useState(null);
  const [riderQ, setRiderQ] = useState("");
  const [full, setFull] = useState(null);
  const [busy, setBusy] = useState(false);

  const q = search.query.toLowerCase();
  const ready = useMemo(
    () =>
      orders
        .filter((o) => o.status === "CONFIRMED")
        .filter((o) => !q || o.code.toLowerCase().includes(q) || String(o.customer_name || "").toLowerCase().includes(q)),
    [orders, q]
  );

  const selected = ready.find((o) => o.id === selId) || ready[0] || null;

  const [shopRiders, setShopRiders] = useState([]);
  const loadRiders = useCallback(() => {
    if (!selected) {
      setShopRiders([]);
      return;
    }
    const id = selected.id;
    ordersApi
      .riders(id)
      .then((r) => setShopRiders((cur) => (selectedRef.current === id ? r || [] : cur)))
      .catch(() => setShopRiders([]));
  }, [selected?.id]);
  const selectedRef = useRef(null);
  selectedRef.current = selected?.id || null;
  useEffect(() => {
    setShopRiders([]);
    setSelRider(null);
    loadRiders();
  }, [loadRiders]);
  useLive(["riders", "rider_locations", "orders"], loadRiders);

  const s0 = shopRiders[0];
  const shopPos = s0 && s0.shop_lat != null ? { lat: s0.shop_lat, lng: s0.shop_lng } : null;
  const custPos = selected && selected.customer_lat != null ? { lat: Number(selected.customer_lat), lng: Number(selected.customer_lng) } : null;

  const [roads, setRoads] = useState({});
  const gpsKey = shopRiders.map((r) => `${r.id}:${r.lat != null ? r.lat.toFixed(4) : ""},${r.lng != null ? r.lng.toFixed(4) : ""}`).join("|");
  useEffect(() => {
    if (!shopPos) {
      setRoads({});
      return undefined;
    }
    let alive = true;
    const todo = shopRiders.filter((r) => r.lat != null && r.fresh && !r.at_shop).slice(0, RIDER_ROUTES);
    Promise.all(todo.map((r) => roadRoute({ lat: r.lat, lng: r.lng }, shopPos, { alternatives: false }).then((x) => [r.id, x]).catch(() => [r.id, null]))).then(
      (list) => {
        if (!alive) return;
        const next = {};
        list.forEach(([id, x]) => {
          if (x) next[id] = { km: x.km, min: x.min, path: x.path };
        });
        setRoads(next);
      }
    );
    return () => {
      alive = false;
    };
  }, [gpsKey, shopPos?.lat, shopPos?.lng]);

  const ranked = useMemo(() => {
    const km = (r) => (r.at_shop ? 0 : roads[r.id] ? roads[r.id].km : r.km_to_shop == null ? 1e5 : r.km_to_shop);
    const rank = (r) => (r.can_assign ? 0 : r.on_duty ? 1e6 : 2e6) + km(r);
    return [...shopRiders].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [shopRiders, roads]);
  const assignable = ranked.filter((r) => r.can_assign);
  const activeRider = assignable.find((r) => r.id === selRider) || assignable[0] || null;

  useEffect(() => {
    let alive = true;
    if (selected) {
      ordersApi
        .get(selected.id)
        .then((o) => alive && setFull(o))
        .catch(() => alive && setFull(null));
    } else setFull(null);
    return () => {
      alive = false;
    };
  }, [selected?.id]);

  const filteredRiders = ranked.filter((r) => !riderQ || r.name.toLowerCase().includes(riderQ.toLowerCase()));

  const assign = async () => {
    if (!selected || !activeRider) return;
    setBusy(true);
    try {
      await ordersApi.assign(selected.id, activeRider.id);
      toast.success(`${selected.code} assigned to ${activeRider.name}`);
      setSelId(null);
      setSelRider(null);
      reload();
      loadRiders();
    } catch (e) {
      toast.error(e.message);
      loadRiders();
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className="ord-head">
      <h1>Order Dispatch</h1>
      <div className="ord-head__actions">
        {search.query && (
          <span className="search-chip">
            "{search.query}"
            <button onClick={search.clear} aria-label="Clear search">
              <Icon name="x" />
            </button>
          </span>
        )}
        <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}>
          <Icon name="search" />
        </button>
      </div>
    </div>
  );

  if (loading || error)
    return (
      <>
        {head}
        <div className="empty" style={{ padding: 40 }}>{error || "Loading…"}</div>
      </>
    );

  const scrollQueue = (dx) => {
    const el = document.getElementById("disp-queue");
    if (el) el.scrollBy({ left: dx, behavior: "smooth" });
  };

  const queue = (
    <div className="dq-wrap">
      <button className="dq-btn" onClick={() => scrollQueue(-280)} aria-label="Scroll left">‹</button>
      <div className="dq-list" id="disp-queue">
        {ready.length ? (
          ready.map((x) => (
            <div key={x.id} className={`dq-chip ${x.id === selected?.id ? "on" : ""}`} onClick={() => setSelId(x.id)}>
              <b>{x.code}</b>
              <div>
                {x.customer_name || "Walk-in"} · {x.channel} · {money(x.total)}
              </div>
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: 14 }}>No confirmed orders</div>
        )}
      </div>
      <button className="dq-btn" onClick={() => scrollQueue(280)} aria-label="Scroll right">›</button>
    </div>
  );

  if (!selected) {
    return (
      <>
        {head}
        <div className="dispatch-md">
          {queue}
          <div className="dov">
            <div className="empty" style={{ padding: 36, gridColumn: "1 / -1" }}>No confirmed orders waiting for a rider</div>
          </div>
        </div>
      </>
    );
  }

  const items = full && full.id === selected.id ? full.items || [] : [];
  const qty = items.reduce((t, l) => t + l.qty, 0);
  const appSt = selected.channel !== "Call Center";

  return (
    <>
      {head}
      <div className="dispatch-md">
        {queue}
        <div className="dov">
          <div className="dov-side">
            <div className="dov-id">{selected.code}</div>
            <div className="dov-badges">
              <span className="b">{selected.channel}</span>
              <span className="b">{statusLabel(selected.status, appSt)}</span>
            </div>
            <div className="dov-mini">
              <div className="l">Customer</div>
              <div className="v">{selected.customer_name || "Walk-in"}</div>
            </div>
            <div className="dov-mini">
              <div className="l">Shop</div>
              <div className="v">{selected.shop_name || "N/A"}</div>
            </div>
            <div className="dov-mini">
              <div className="l">Distance</div>
              <div className="v">{Number(selected.distance_km) > 0 ? `${selected.distance_km} km` : "N/A"}</div>
            </div>
            <div className="dov-mini">
              <div className="l">Payment</div>
              <div className="v">{payLabel(selected.payment_type)}</div>
            </div>
            <div className="dov-amt">
              <div className="l">Total amount</div>
              <div className="n">{money(selected.total)}</div>
            </div>
          </div>

          <div className="dov-main">
            <div className="dov-detailcol">
              <div className="dov-sec">Order details</div>
              <div className="dov-grid">
                <div className="kv"><div className="k">Order ID</div><div className="v">{selected.code}</div></div>
                <div className="kv"><div className="k">Order status</div><div className="v">{statusLabel(selected.status, appSt)}</div></div>
                <div className="kv"><div className="k">Payment</div><div className="v">{payLabel(selected.payment_type)}</div></div>
                <div className="kv"><div className="k">Shop</div><div className="v">{selected.shop_name || "N/A"}</div></div>
                <div className="kv" style={{ gridColumn: "span 2" }}>
                  <div className="k">Remarks</div>
                  <div className="v">{selected.remarks || "N/A"}</div>
                </div>
                <div className="kv"><div className="k">Placed</div><div className="v">{shortDT(selected.created_at)}</div></div>
              </div>
              <div className="dov-sec">Items</div>
              {items.length ? (
                items.map((l) => (
                  <div className="dov-item" key={l.id}>
                    <span>{l.qty} × {l.name}</span>
                    <b>{money(l.total)}</b>
                  </div>
                ))
              ) : (
                <div className="sub" style={{ padding: "4px 0" }}>Loading items…</div>
              )}
              <div className="dov-charges">
                <div className="dov-crow">
                  <span className="sub">Subtotal ({qty} item{qty === 1 ? "" : "s"})</span>
                  <b>{money(full?.subtotal ?? 0)}</b>
                </div>
                <div className="dov-crow">
                  <span className="sub">Delivery charges</span>
                  <b>{money(full?.fee ?? 0)}</b>
                </div>
                {Number(full?.discount) > 0 && (
                  <div className="dov-crow">
                    <span className="sub">Discount</span>
                    <b style={{ color: "var(--bad)" }}>− {money(full.discount)}</b>
                  </div>
                )}
                <div className="dov-crow tot">
                  <b>Total amount</b>
                  <span className="dov-total">{money(selected.total)}</span>
                </div>
              </div>
            </div>

            <div className="dov-ridercol">
              <div className="dov-map">
                <RiderMap riders={shopRiders} shop={shopPos} customer={custPos} selId={activeRider?.id} onPick={setSelRider} roads={roads} />
                {Number(selected.distance_km) > 0 && <span className="rt">📍 {selected.distance_km} km</span>}
              </div>
              <div className="dov-sec">Pick a rider</div>
              {shopRiders.length > 3 && (
                <input className="dov-search" placeholder="Enter rider name" value={riderQ} onChange={(e) => setRiderQ(e.target.value)} />
              )}
              <div className="dov-riderlist">
                {filteredRiders.map((r) => {
                  const st = deliveryStatus(r.delivery_status);
                  const where = whereText(r, roads[r.id]);
                  const orders2 = r.open_orders || [];
                  return (
                    <div
                      key={r.id}
                      className={`dov-rcard ${r.id === activeRider?.id ? "sel" : ""} ${r.can_assign ? "" : "busy"}`}
                      onClick={() => r.can_assign && setSelRider(r.id)}
                      title={r.can_assign ? "" : blockText(r)}
                      aria-disabled={!r.can_assign}
                    >
                      <div className="g">
                        <b>{r.name}</b>
                        <span className="dov-chips">
                          <span className={`duty ${r.on_duty ? "duty--on" : "duty--off"}`}>{r.on_duty ? "On duty" : "Off duty"}</span>
                          {r.on_duty && <span className={`badge ${st.cls}`}>{st.label}</span>}
                        </span>
                        {seenText(r) && (
                          <div>
                            <span className={`dov-dot ${r.conn === "LIVE" ? "live" : r.conn === "WEAK" ? "weak" : "off"}`} />
                            {seenText(r)}
                          </div>
                        )}
                        {where && <div className="dov-where">{where}</div>}
                        {orders2.length > 0 && (
                          <div>
                            {orders2.length} order{orders2.length === 1 ? "" : "s"}: {orders2.map((o) => o.code).join(", ")}
                          </div>
                        )}
                        {r.lat != null && (
                          <button
                            type="button"
                            className="gmap-btn dov-gmap-btn"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(mapsLink(r, shopPos), "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Icon name="map" />
                            <span>Open in Google Maps</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {activeRider?.warning && (
                <div className="dsp-warn">
                  <Icon name="alert" />
                  <span>
                    {activeRider.name} already has {activeRider.warning.code}. This customer is {activeRider.warning.km} km away from that customer.
                  </span>
                </div>
              )}
              {can("Order Dispatch", "assign") && (
                <button className="dov-assign" onClick={assign} disabled={!activeRider || busy}>
                  {busy ? "Assigning…" : activeRider ? `Assign ${activeRider.name} → move to Assigned` : "Assign"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
