import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../config/icons";
import { trackingApi } from "../../services/api";
import { loadGoogleMaps, roadRoute, makeMarker } from "../../config/googleMaps";

const RIDER = "#f59e0b";
const BEST = "#7c3aed";
const ZONE = "#15803d";

const hm = (d) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—");
const n1 = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 10) / 10);
const pt = (lat, lng) => (lat == null || lng == null ? null : { lat: Number(lat), lng: Number(lng) });

function mins(r) {
  if (r.minutes_taken != null) return Number(r.minutes_taken);
  if (r.dispatched_at && r.delivered_at) return Math.max(0, Math.round((new Date(r.delivered_at) - new Date(r.dispatched_at)) / 60000));
  return null;
}

function SvgRoute({ data }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 1000, h: 560 });
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(160, el.clientHeight) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const shop = pt(data.shop_lat, data.shop_lng);
  const cust = pt(data.customer_lat, data.customer_lng);
  const pts = (data.points || []).map((p) => pt(p.lat, p.lng)).filter(Boolean);
  const all = [...pts, shop, cust].filter(Boolean);
  if (!all.length) return <div className="rt-empty">No route recorded</div>;
  const W = size.w, H = size.h, pad = 48;
  const lat0 = Math.min(...all.map((p) => p.lat)), lat1 = Math.max(...all.map((p) => p.lat));
  const lng0 = Math.min(...all.map((p) => p.lng)), lng1 = Math.max(...all.map((p) => p.lng));
  const kx = Math.cos(((lat0 + lat1) / 2) * (Math.PI / 180));
  const spanX = Math.max((lng1 - lng0) * kx, 0.002), spanY = Math.max(lat1 - lat0, 0.002);
  const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const ox = (W - spanX * s) / 2, oy = (H - spanY * s) / 2;
  const xy = (p) => [ox + (p.lng - lng0) * kx * s, H - (oy + (p.lat - lat0) * s)];
  const rPx = cust ? Math.max(10, ((data.arrive_radius_m || 150) / 111320) * s) : 0;
  const line = pts.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join(" ");
  return (
    <svg ref={ref} className="rt-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rider route">
      {cust && <circle cx={xy(cust)[0]} cy={xy(cust)[1]} r={rPx} fill="rgba(21,128,61,.10)" stroke={ZONE} strokeDasharray="5 5" />}
      {pts.length > 1 && <polyline points={line} fill="none" stroke={RIDER} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
      {shop && (
        <g transform={`translate(${xy(shop)[0]},${xy(shop)[1]})`}>
          <circle r="16" fill="#6d28d9" stroke="#fff" strokeWidth="4" />
          <text y="5" textAnchor="middle" fontSize="14">🏪</text>
        </g>
      )}
      {cust && (
        <g transform={`translate(${xy(cust)[0]},${xy(cust)[1]})`}>
          <circle r="16" fill="#dc2626" stroke="#fff" strokeWidth="4" />
          <text y="5" textAnchor="middle" fontSize="13">🏠</text>
        </g>
      )}
    </svg>
  );
}

export default function RoutePopup({ order, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [best, setBest] = useState(null);
  const [mapState, setMapState] = useState("loading");
  const box = useRef(null);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    trackingApi.route(order.id).then((r) => live && setData(r)).catch((e) => live && setErr(e.message || "Could not load the route"));
    return () => { live = false; };
  }, [order.id]);

  useEffect(() => {
    if (!data || !box.current) return undefined;
    let dead = false;
    const made = [];
    const shop = pt(data.shop_lat, data.shop_lng);
    const cust = pt(data.customer_lat, data.customer_lng);
    const pts = (data.points || []).map((p) => pt(p.lat, p.lng)).filter(Boolean);
    loadGoogleMaps()
      .then((maps) => {
        if (dead || !box.current) return;
        const map = new maps.Map(box.current, {
          center: cust || shop || { lat: 31.52, lng: 74.35 },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        const bounds = new maps.LatLngBounds();
        [...pts, shop, cust].filter(Boolean).forEach((p) => bounds.extend(p));
        if (pts.length > 1) made.push(new maps.Polyline({ map, path: pts, strokeColor: RIDER, strokeWeight: 6, strokeOpacity: 1, zIndex: 20 }));
        if (cust) {
          made.push(new maps.Circle({ map, center: cust, radius: data.arrive_radius_m || 150, strokeColor: ZONE, strokeOpacity: 0.8, strokeWeight: 1.5, fillColor: ZONE, fillOpacity: 0.1, clickable: false }));
          made.push(makeMarker({ map, position: cust, title: "Customer", zIndex: 40, label: { text: "🏠", fontSize: "13px" }, icon: { scale: 13, fillColor: "#dc2626", strokeColor: "#fff", strokeWeight: 3 } }));
        }
        if (shop) made.push(makeMarker({ map, position: shop, title: "Shop", zIndex: 40, label: { text: "🏪", fontSize: "13px" }, icon: { scale: 13, fillColor: "#6d28d9", strokeColor: "#fff", strokeWeight: 3 } }));
        if (!bounds.isEmpty()) map.fitBounds(bounds, 48);
        setMapState("map");
        if (shop && cust) {
          roadRoute(shop, cust, { alternatives: true })
            .then((r) => {
              if (dead || !r) return;
              setBest(r);
              if (r.path?.length > 1) {
                made.push(new maps.Polyline({
                  map,
                  path: r.path,
                  strokeOpacity: 0,
                  zIndex: 10,
                  icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.95, strokeColor: BEST, strokeWeight: 5, scale: 3 }, offset: "0", repeat: "16px" }],
                }));
                r.path.forEach((p) => bounds.extend(p));
                map.fitBounds(bounds, 48);
              }
            })
            .catch(() => null);
        }
      })
      .catch(() => { if (!dead) setMapState("svg"); });
    return () => {
      dead = true;
      made.forEach((m) => m.setMap && m.setMap(null));
    };
  }, [data]);

  const view = useMemo(() => {
    if (!data) return null;
    const actual = n1(data.actual_km);
    const est = n1(data.distance_km) || n1(best?.km);
    const m = mins(data);
    return {
      riderSub: [actual != null ? `${actual} km` : null, m != null ? `${m} min` : null].filter(Boolean).join(" · ") || "—",
      bestSub: best ? `${n1(best.km)} km · ${best.min} min` : est != null ? `${est} km` : "—",
      dist: `${actual != null ? actual : "—"} / ${est != null ? est : "—"} km`,
      mins: m != null ? `${m} min` : "—",
    };
  }, [data, best]);

  return createPortal(
    <div className="overlay rt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rt-pop" role="dialog" aria-modal="true" aria-label={`${order.code} rider route`}>
        <div className="rt-head">
          <h3>{order.code}</h3>
          <span className="rt-head__sub">Rider route</span>
          <button className="rt-x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="rt-body">
          <div className="rt-map">
            {err ? (
              <div className="rt-empty">{err}</div>
            ) : !data ? (
              <div className="rt-empty">Loading route…</div>
            ) : mapState === "svg" ? (
              <SvgRoute data={data} />
            ) : null}
            <div ref={box} className={`rt-gmap ${mapState === "map" ? "on" : ""}`} />
          </div>
          {view && (
            <>
              <div className="rt-leg">
                <div className="rt-li"><i className="solid" /><div><b>Rider's route</b><small>{view.riderSub}</small></div></div>
                <div className="rt-li"><i className="dash" /><div><b>Google best route</b><small>{view.bestSub}</small></div></div>
                <div className="rt-li"><i className="circ" /><div><b>Arrived zone</b><small>{data.arrive_radius_m || 150} m around customer</small></div></div>
              </div>
              <div className="rt-stats">
                <div className="rt-st"><small>Out for delivery</small><b>{hm(data.dispatched_at)}</b></div>
                <div className="rt-st"><small>Arrived</small><b>{hm(data.arrived_at)}</b></div>
                <div className="rt-st"><small>Delivered</small><b>{hm(data.delivered_at)}</b></div>
                <div className="rt-st"><small>Delivery time</small><b>{view.mins}</b></div>
                <div className="rt-st"><small>Actual / Est. distance</small><b>{view.dist}</b></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
