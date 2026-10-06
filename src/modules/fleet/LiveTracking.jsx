import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Icon from "../../config/icons";
import { statusClass, statusLabel } from "../../config/orders";
import { useLive } from "../../context/LiveContext";
import { useLookups } from "../../context/LookupsContext";
import { trackingApi } from "../../services/api";
import { usePageSearch } from "../../context/SearchContext";
import { shopPosition, shopLatLng, roadRoute, metresBetween, navLink, makeMarker } from "../../config/googleMaps";
import { deliveryStatus } from "../../config/riders";
import { themeColor } from "../../config/theme";
import { useGoogleMap, dot, pt, nearestIndex } from "../../components/fleet/mapKit";

const REROUTE_MS = 45000;
const REROUTE_M = 80;
const AT_SHOP_M = 150;

const ago = (s) =>
  s == null ? "—" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} hr ago`;
const km = (v) => (v == null || v === "" ? "—" : `${Number(v).toFixed(1)} km`);

function LiveTab({ data, query }) {
  const mapEl = useRef(null);
  const { map, error } = useGoogleMap(mapEl);
  const [selId, setSelId] = useState(null);
  const [road, setRoad] = useState(null);
  const [plan, setPlan] = useState(null);
  const planPath = useRef([]);
  const ov = useRef({ riders: new Map(), customers: new Map(), shops: new Map(), shop: null, plan: null, done: null, left: null, info: null });
  const fitted = useRef(null);

  const orders = useMemo(() => {
    const q = query.toLowerCase();
    return (data?.orders || []).filter(
      (o) =>
        !q ||
        o.code.toLowerCase().includes(q) ||
        String(o.rider_name || "").toLowerCase().includes(q) ||
        String(o.customer_name || "").toLowerCase().includes(q)
    );
  }, [data, query]);
  const riders = data?.riders || [];
  const sel = orders.find((o) => o.id === selId) || orders[0] || null;

  useEffect(() => { setRoad(null); setPlan(null); }, [sel?.id]);

  useEffect(() => {
    if (!map) return;
    const maps = window.google.maps;
    const o = ov.current;
    const seen = new Set();
    riders.forEach((r) => {
      const pos = pt(r);
      if (!pos) return;
      seen.add(r.id);
      const isSel = sel && sel.rider_id === r.id;
      const busy = r.on_order || (r.delivery_status && r.delivery_status !== "AVAILABLE");
      const color = !r.online ? themeColor("map-offline") : isSel ? themeColor("map-selected") : busy ? themeColor("map-busy") : themeColor("map-free");
      const opts = { position: pos, map, title: `${r.name} · ${deliveryStatus(r.delivery_status).label}${r.on_order ? ` · ${r.on_order}` : ""}${r.weak ? ` · weak signal (${ago(r.seconds_ago)})` : ""}`,
        zIndex: isSel ? 50 : 10, opacity: r.weak ? 0.75 : 1, ...dot(maps, color, "🛵", isSel ? 17 : 14) };
      if (o.riders.has(r.id)) o.riders.get(r.id).setOptions(opts);
      else o.riders.set(r.id, makeMarker(opts));
    });
    [...o.riders.keys()].forEach((id) => { if (!seen.has(id)) { o.riders.get(id).setMap(null); o.riders.delete(id); } });

    const seenC = new Set();
    orders.forEach((x) => {
      const pos = pt(x, "customer_lat", "customer_lng");
      if (!pos) return;
      seenC.add(x.id);
      const isSel = sel && sel.id === x.id;
      const opts = { position: pos, map, title: `${x.code} · ${x.customer_name || ""}`, zIndex: isSel ? 40 : 5, ...dot(maps, isSel ? "#dc2626" : "#f59e0b", "🏠", isSel ? 15 : 11) };
      if (o.customers.has(x.id)) o.customers.get(x.id).setOptions(opts);
      else o.customers.set(x.id, makeMarker(opts));
    });
    [...o.customers.keys()].forEach((id) => { if (!seenC.has(id)) { o.customers.get(id).setMap(null); o.customers.delete(id); } });

    const seenS = new Set();
    orders.forEach((x) => {
      const pos = shopLatLng(x);
      if (!pos || seenS.has(x.shop_id)) return;
      seenS.add(x.shop_id);
      const isSel = sel && sel.shop_id === x.shop_id;
      const opts = { position: pos, map, title: `${x.shop_name} shop`, zIndex: isSel ? 35 : 8, ...dot(maps, "#6d28d9", "🏪", isSel ? 15 : 12) };
      if (o.shops.has(x.shop_id)) o.shops.get(x.shop_id).setOptions(opts);
      else o.shops.set(x.shop_id, makeMarker(opts));
    });
    [...o.shops.keys()].forEach((id) => { if (!seenS.has(id)) { o.shops.get(id).setMap(null); o.shops.delete(id); } });

    if (sel) {
      const rpos = pt(sel);
      if (!o.info) o.info = new maps.InfoWindow({ disableAutoPan: true });
      if (rpos) {
        o.info.setContent(
          `<div class="lt-bubble"><b>${sel.rider_name || "Rider"}</b>${sel.speed != null ? ` · ${Math.round(sel.speed)} km/h` : ""}<br><span class="${sel.weak ? "weak" : sel.online ? "on" : "off"}">● ${sel.weak ? `Weak signal · ${ago(sel.seconds_ago)}` : sel.online ? ago(sel.seconds_ago) : `Offline · ${ago(sel.seconds_ago)}`}</span></div>`
        );
        o.info.setPosition(rpos);
        o.info.open({ map });
      } else o.info.close();
    } else {
      o.info?.close();
    }
  }, [map, riders, orders, sel]);

  useEffect(() => {
    if (!map) return undefined;
    let alive = true;
    const maps = window.google.maps;
    const o = ov.current;
    (async () => {
      const shopPos = sel ? await shopPosition(sel) : null;
      if (!alive) return;
      if (o.shop) { o.shop.setMap(null); o.shop = null; }
      if (shopPos && !shopLatLng(sel)) o.shop = makeMarker({ position: shopPos, map, title: `${sel.shop_name} shop`, zIndex: 30, ...dot(maps, "#6d28d9", "🏪", 15) });
      if (fitted.current === (sel ? sel.id : "all")) return;
      const b = new maps.LatLngBounds();
      let n = 0;
      [shopPos, pt(sel), pt(sel, "customer_lat", "customer_lng")].forEach((p) => { if (p) { b.extend(p); n++; } });
      if (!sel) riders.forEach((r) => { const p = pt(r); if (p) { b.extend(p); n++; } });
      if (n > 1) { map.fitBounds(b, 70); fitted.current = sel ? sel.id : "all"; }
      else if (n === 1) { map.setCenter(b.getCenter()); map.setZoom(15); fitted.current = sel ? sel.id : "all"; }
    })();
    return () => { alive = false; };
  }, [map, sel?.id, riders.length]);

  useEffect(() => {
    if (!map || !sel || !plan || !ov.current.plan) return;
    const maps = window.google.maps;
    const b = new maps.LatLngBounds();
    ov.current.plan.getPath().forEach((p) => b.extend(p));
    const r = pt(sel); if (r) b.extend(r);
    if (!b.isEmpty()) map.fitBounds(b, 70);
  }, [map, sel?.id, !!plan]);

  const [pathTick, setPathTick] = useState(0);
  useLive(["rider_locations"], () => setPathTick((x) => x + 1));
  useEffect(() => {
    if (!map || !sel) return undefined;
    const maps = window.google.maps;
    let alive = true;
    trackingApi
      .route(sel.id)
      .then((r) => {
        if (!alive) return;
        const path = (r.points || []).map((p) => ({ lat: p.lat, lng: p.lng }));
        if (!ov.current.done) ov.current.done = new maps.Polyline({ map, strokeColor: themeColor("map-done"), strokeWeight: 6, strokeOpacity: 0.95, zIndex: 20 });
        ov.current.done.setPath(path);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [map, sel?.id, pathTick]);
  useEffect(() => () => ov.current.done?.setPath([]), [sel?.id]);

  const planCache = useRef(new Map());
  useEffect(() => {
    if (!map || !sel) return undefined;
    const maps = window.google.maps;
    let alive = true;
    if (!ov.current.plan) ov.current.plan = new maps.Polyline({ map, strokeColor: themeColor("map-route"), strokeOpacity: 0.45, strokeWeight: 7, zIndex: 10 });
    const to = pt(sel, "customer_lat", "customer_lng");
    ov.current.plan.setPath([]);
    planPath.current = [];
    if (!to) return undefined;
    const draw = (r) => {
      if (!alive) return;
      planPath.current = r.path;
      const rp = pt(sel);
      ov.current.plan.setPath(rp && r.path.length ? r.path.slice(nearestIndex(r.path, rp)) : r.path);
      setPlan({ km: r.km, min: r.min });
    };
    const cached = planCache.current.get(sel.id);
    if (cached) { draw(cached); return () => { alive = false; }; }
    (async () => {
      const from = shopLatLng(sel) || (await shopPosition(sel));
      if (!from || !alive) return;
      const r = await roadRoute(from, to, { alternatives: true });
      if (r && r.path.length) { planCache.current.set(sel.id, r); draw(r); }
    })();
    return () => { alive = false; };
  }, [map, sel?.id]);

  const riderPos = pt(sel);
  const riderKey = riderPos ? `${riderPos.lat.toFixed(5)},${riderPos.lng.toFixed(5)}` : "";
  useEffect(() => {
    const full = planPath.current;
    if (!ov.current.plan || !full.length || !riderPos) return;
    ov.current.plan.setPath(full.slice(nearestIndex(full, riderPos)));
  }, [riderKey, plan]);
  const last = useRef({ at: 0, from: null, id: null });
  useEffect(() => {
    if (!map || !sel) return;
    const maps = window.google.maps;
    const from = pt(sel);
    const to = pt(sel, "customer_lat", "customer_lng");
    if (!ov.current.left) {
      ov.current.left = new maps.Polyline({
        map, strokeOpacity: 0, zIndex: 15,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: themeColor("map-route"), scale: 4 }, offset: "0", repeat: "14px" }],
      });
    }
    if (!from || !to) { ov.current.left.setPath([]); return; }
    const L = last.current;
    const fresh = L.id !== sel.id;
    if (!fresh && Date.now() - L.at < REROUTE_MS && metresBetween(L.from, from) < REROUTE_M) return;
    last.current = { at: Date.now(), from, id: sel.id };
    if (fresh) ov.current.left.setPath([from, to]);
    roadRoute(from, to, { alternatives: false })
      .then((r) => {
        if (last.current.id !== sel.id) return;
        if (!r) { ov.current.left.setPath([from, to]); return; }
        ov.current.left.setPath(r.path.length ? r.path : [from, to]);
        setRoad({ km: r.km, min: r.min });
      })
      .catch(() => ov.current.left.setPath([from, to]));
  }, [map, sel?.id, riderKey]);

  useEffect(() => () => {
    const o = ov.current;
    o.riders.forEach((m) => m.setMap(null));
    o.customers.forEach((m) => m.setMap(null));
    o.shops.forEach((m) => m.setMap(null));
    [o.shop, o.plan, o.done, o.left].forEach((x) => x && x.setMap(null));
    o.info?.close();
  }, []);

  const listEl = useRef(null);
  useEffect(() => {
    if (!sel || !listEl.current) return;
    const el = listEl.current.querySelector(`[data-id="${sel.id}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [sel?.id]);

  const selRider = pt(sel);
  const selCust = pt(sel, "customer_lat", "customer_lng");
  const selShop = shopLatLng(sel);
  const selEta = road?.min ?? sel?.eta_min;
  const selLeft = road?.km ?? sel?.km_left;

  return (
    <div className="lt1__body">
      <div className="lt1__list">
        <div className="lt1__lh">
          <b>Active orders</b>
          <span>{orders.length}</span>
        </div>
        <div className="lt1__items" ref={listEl}>
          {orders.length ? (
            orders.map((x) => {
              const isSel = sel && x.id === sel.id;
              const eta = isSel && road ? road.min : x.eta_min;
              const left = isSel && road ? road.km : x.km_left;
              const rp = pt(x);
              const sp = shopLatLng(x);
              const atShop = x.status === "ASSIGNED" && rp && sp && metresBetween(rp, sp) <= AT_SHOP_M;
              const signal = x.weak ? (
                <span className="lt-weak">● Weak signal · {ago(x.seconds_ago)}</span>
              ) : x.online ? (
                <span className="lt1__on">● {ago(x.seconds_ago)}</span>
              ) : (
                <span className="lt-off">● Offline{x.seconds_ago != null ? ` · ${ago(x.seconds_ago)}` : ""}</span>
              );
              return (
                <button type="button" key={x.id} data-id={x.id} className={`lt1__item ${isSel ? "on" : ""}`} onClick={() => setSelId(x.id)}>
                  <div className="lt1__r1">
                    <b>{x.code}</b>
                    <span className={statusClass(x.status)}>{statusLabel(x.status)}</span>
                    <span className="lt1__eta">{!rp ? "ETA —" : atShop ? "At shop" : eta != null ? `ETA ${eta} min` : "ETA —"}</span>
                  </div>
                  <div className="lt1__r2">{x.rider_name || "No rider"} → {x.customer_name || "Customer"}</div>
                  <div className="lt1__r3">
                    {!rp ? "Waiting for rider location" : <>{atShop ? "At shop" : `${km(left)} left`} · {signal}</>}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="empty">No active orders</div>
          )}
        </div>
      </div>

      <div className="lt1__map">
        <div ref={mapEl} className="lt-map__canvas" />
        {error && (
          <div className="lt-map__msg">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        {sel && (
          <div className="lt1__box">
            <b>{sel.customer_name || "Customer"} · {sel.code}</b>
            <small>
              {selRider ? <>ETA <em>{selEta != null ? `${selEta} min` : "—"}</em> · {km(selLeft)} left</> : `${km(sel.shop_km ?? plan?.km)} from shop`}
            </small>
            {selCust ? (
              <a className="btn btn--sm" href={navLink(selRider || selShop, selCust)} target="_blank" rel="noreferrer">Navigate in Google Maps</a>
            ) : (
              <button className="btn btn--sm" disabled>Navigate in Google Maps</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveTracking() {
  const search = usePageSearch("tracking");
  const [live, setLive] = useState(null);
  const wrap = useRef(null);

  useLookups();
  const loadLive = useCallback(() => trackingApi.live().then(setLive).catch(() => setLive((x) => x || { orders: [], riders: [] })), []);
  useEffect(() => {
    loadLive();
  }, [loadLive]);
  useLive(["rider_locations", "orders", "riders", "shops", "customers"], loadLive);

  useLayoutEffect(() => {
    const fit = () => {
      const el = wrap.current;
      if (!el) return;
      if (window.innerWidth <= 900) {
        el.style.height = "";
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(420, window.innerHeight - top - 16)}px`;
    };
    fit();
    const t = setTimeout(fit, 700);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fit);
    };
  }, []);

  const count = live?.orders?.length ?? 0;

  return (
    <div className="lt1">
      <div className="ord-head">
        <div className="lt1__title">
          <h1>Live Tracking</h1>
          <span className="lt1__count">{count} active {count === 1 ? "order" : "orders"}</span>
        </div>
        <div className="ord-head__actions">
          {search.query && (
            <span className="search-chip">
              "{search.query}"
              <button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button>
            </span>
          )}
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}>
            <Icon name="search" />
          </button>
        </div>
      </div>
      <div className="lt1__wrap" ref={wrap}>
        <LiveTab data={live} query={search.query} />
      </div>
    </div>
  );
}
