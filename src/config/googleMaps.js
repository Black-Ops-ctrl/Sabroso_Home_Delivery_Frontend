export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let loading = null;

export function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary || window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error("Google Maps key is missing (VITE_GOOGLE_MAPS_KEY in .env)."));
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = "__sabrosoMapsReady";
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}` +
      `&v=weekly&loading=async&libraries=places,routes,geometry&region=PK&language=en&callback=${cb}`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google Maps. Check the internet connection and the API key."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

async function lib(name) {
  const maps = await loadGoogleMaps();
  if (maps.importLibrary) return maps.importLibrary(name);
  return maps[name] || maps;
}

export async function newSessionToken() {
  const places = await lib("places");
  return places.AutocompleteSessionToken ? new places.AutocompleteSessionToken() : null;
}

const SUGGEST_RADIUS_M = 25000;
const suggestCache = new Map();
export async function getSuggestions(input, sessionToken, near = null) {
  const key = `${input.trim().toLowerCase()}|${near ? `${near.lat.toFixed(3)},${near.lng.toFixed(3)}` : ""}`;
  if (suggestCache.has(key)) return suggestCache.get(key);
  const places = await lib("places");
  let out = null;
  if (places.AutocompleteSuggestion && !newPlacesOff) {
    try {
      out = await newSuggestions(places, input, sessionToken, near);
    } catch {
      newPlacesOff = true;
      out = null;
    }
  }
  if (!out) {
    out = await legacySuggestions(places, input, sessionToken, near);
  }
  if (suggestCache.size > 200) suggestCache.delete(suggestCache.keys().next().value);
  suggestCache.set(key, out);
  return out;
}

let newPlacesOff = false;

async function newSuggestions(places, input, sessionToken, near) {
  let out;
  {
    const req = { input, sessionToken, includedRegionCodes: ["pk"], language: "en", region: "pk" };
    if (near) { req.locationBias = { center: near, radius: SUGGEST_RADIUS_M }; req.origin = near; }
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    out = (suggestions || [])
      .filter((s) => s.placePrediction)
      .slice(0, 6)
      .map((s) => {
        const p = s.placePrediction;
        const m = typeof p.distanceMeters === "number" ? p.distanceMeters : null;
        return { id: p.placeId, main: p.mainText?.toString() || p.text?.toString(), secondary: p.secondaryText?.toString() || "",
          km: m != null ? Math.round(m / 100) / 10 : null, _raw: p };
      });
  }
  return out;
}

async function legacySuggestions(places, input, sessionToken, near) {
  let out;
  {
    const svc = new places.AutocompleteService();
    const req = { input, sessionToken, componentRestrictions: { country: "pk" } };
    if (near) { req.location = new window.google.maps.LatLng(near.lat, near.lng); req.radius = SUGGEST_RADIUS_M; req.origin = req.location; }
    const preds = await new Promise((res) => svc.getPlacePredictions(req, (r) => res(r || [])));
    out = preds.slice(0, 6).map((p) => ({
      id: p.place_id, main: p.structured_formatting?.main_text || p.description, secondary: p.structured_formatting?.secondary_text || "",
      km: typeof p.distance_meters === "number" ? Math.round(p.distance_meters / 100) / 10 : null, _raw: p,
    }));
  }
  return out;
}

export async function resolveSuggestion(s, sessionToken) {
  const places = await lib("places");
  if (s._raw?.toPlace) {
    const place = s._raw.toPlace();
    await place.fetchFields({ fields: ["formattedAddress", "location", "displayName"] });
    if (!place.location) return null;
    const full = place.formattedAddress || "";
    const address = s.main && !full.startsWith(s.main) ? `${s.main}, ${full}` : full || s.main;
    return { address, lat: place.location.lat(), lng: place.location.lng() };
  }
  const svc = new places.PlacesService(document.createElement("div"));
  const place = await new Promise((res) =>
    svc.getDetails({ placeId: s.id, fields: ["formatted_address", "geometry"], sessionToken }, (p) => res(p)));
  if (!place?.geometry?.location) return null;
  const full = place.formatted_address || "";
  return {
    address: s.main && !full.startsWith(s.main) ? `${s.main}, ${full}` : full,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
  };
}

const geoCache = new Map();
export async function geocode(address) {
  if (!address) return null;
  if (geoCache.has(address)) return geoCache.get(address);
  const geo = await lib("geocoding");
  const Geocoder = geo.Geocoder || window.google.maps.Geocoder;
  const res = await new Geocoder().geocode({ address, region: "pk" }).catch(() => null);
  const loc = res?.results?.[0]?.geometry?.location;
  const out = loc ? { lat: loc.lat(), lng: loc.lng() } : null;
  geoCache.set(address, out);
  return out;
}

export const shopAddress = (s) =>
  s ? [s.address || s.shop_address, s.city || s.shop_city, "Pakistan"].filter(Boolean).join(", ") : "";

export function shopLatLng(s) {
  if (!s) return null;
  const own = s.shop_lat !== undefined || s.shop_lng !== undefined;
  const lat = own ? s.shop_lat : s.lat;
  const lng = own ? s.shop_lng : s.lng;
  if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") return null;
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
}

export async function shopPosition(s) {
  return shopLatLng(s) || (await geocode(shopAddress(s)).catch(() => null));
}

export function parseLatLng(text) {
  const m = String(text || "").trim().match(/^\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
}

export function estimateKm(a, b) {
  if (!a || !b) return null;
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 1.3 * 10) / 10;
}

const toKm = (m) => Math.round((m / 1000) * 10) / 10;
const ptOf = (p) => ({ lat: typeof p.lat === "function" ? p.lat() : p.lat, lng: typeof p.lng === "function" ? p.lng() : p.lng });

async function routesApi(origin, destination, alternatives) {
  const routes = await lib("routes");
  if (!routes.Route?.computeRoutes) return null;
  const { routes: list } = await routes.Route.computeRoutes({
    origin,
    destination,
    travelMode: "DRIVING",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: !!alternatives,
    polylineQuality: "HIGH_QUALITY",
    fields: ["distanceMeters", "durationMillis", "path"],
  });
  const ok = (list || []).filter((r) => Number.isFinite(r.distanceMeters));
  if (!ok.length) return null;
  const r = ok.reduce((a, b) => ((b.durationMillis ?? Infinity) < (a.durationMillis ?? Infinity) ? b : a));
  return { km: toKm(r.distanceMeters), min: Math.max(1, Math.round((r.durationMillis || 0) / 60000)), path: (r.path || []).map(ptOf), via: "routes" };
}

async function directionsApi(origin, destination, alternatives) {
  const maps = await loadGoogleMaps();
  if (!maps.DirectionsService) return null;
  const res = await new maps.DirectionsService().route({
    origin,
    destination,
    travelMode: maps.TravelMode.DRIVING,
    provideRouteAlternatives: !!alternatives,
    drivingOptions: { departureTime: new Date() },
    region: "pk",
  });
  const legs = (res?.routes || []).map((r, i) => ({ leg: r.legs?.[0], i })).filter((x) => x.leg);
  if (!legs.length) return null;
  const dur = (l) => (l.duration_in_traffic || l.duration).value;
  const best = legs.reduce((a, b) => (dur(b.leg) < dur(a.leg) ? b : a));
  const route = res.routes[best.i];
  const detail = [];
  (route.legs || []).forEach((l) => (l.steps || []).forEach((s) => (s.path || []).forEach((p) => detail.push(ptOf(p)))));
  return {
    km: toKm(best.leg.distance.value),
    min: Math.max(1, Math.round(dur(best.leg) / 60)),
    path: detail.length ? detail : (route.overview_path || []).map(ptOf),
    via: "directions",
  };
}

const ROUTE_TTL_MS = 120000;
const routeCache = new Map();
const keyOf = (p) => (typeof p === "string" ? p : `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`);

let routesOff = false;

export async function roadRoute(origin, destination, { alternatives = true } = {}) {
  const key = `${keyOf(origin)}>${keyOf(destination)}|${alternatives ? 1 : 0}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.at < ROUTE_TTL_MS) return hit.value;
  let value = null;
  let routesAvailable = true;
  try {
    const routes = await lib("routes");
    routesAvailable = !!routes.Route?.computeRoutes;
    if (routesAvailable && !routesOff) value = await routesApi(origin, destination, alternatives);
  } catch {
    routesOff = true;
    value = null;
  }
  if (!value) {
    try {
      value = await directionsApi(origin, destination, alternatives);
    } catch {
      value = null;
    }
  }
  if (value) {
    if (routeCache.size > 300) routeCache.delete(routeCache.keys().next().value);
    routeCache.set(key, { at: Date.now(), value });
  }
  return value;
}

export function metresBetween(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const navLink = (from, to) =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.lat},${from.lng}` : ""}&destination=${to.lat},${to.lng}&travelmode=driving`;

export async function roadKmMany(origins, destination) {
  if (!origins.length || !destination) return [];
  let out = null;
  try {
    const maps = await loadGoogleMaps();
    if (maps.DistanceMatrixService) {
      const res = await new maps.DistanceMatrixService().getDistanceMatrix({
        origins, destinations: [destination], travelMode: maps.TravelMode.DRIVING, unitSystem: maps.UnitSystem.METRIC, region: "pk",
      });
      out = (res?.rows || []).map((r) => {
        const e = r.elements?.[0];
        return e && e.status === "OK" ? toKm(e.distance.value) : null;
      });
    }
  } catch {
    out = null;
  }
  if (out && out.length === origins.length && out.some((v) => v != null)) return out;
  return Promise.all(origins.map((o) => roadRoute(o, destination, { alternatives: false }).then((r) => (r ? r.km : null)).catch(() => null)));
}

export function straightKm(a, b) {
  if (!a || !b) return Infinity;
  return metresBetween(a, b) / 1000;
}

export function chargeFor(settings, km) {
  const slabs = settings?.slabs || [];
  if (km == null || !Number.isFinite(Number(km)) || !slabs.length) return null;
  const k = Number(km);
  const hit = slabs.find((s) => k >= s.from && k <= s.to) || slabs.find((s, i) => k >= s.from && (i === slabs.length - 1 || k < slabs[i + 1].from));
  return hit ? hit.charge : null;
}

export async function roadDistance(origin, destination) {
  const r = await roadRoute(origin, destination);
  return r ? { km: r.km, min: r.min } : null;
}

const PIN_ICON = {
  shop: '<path d="M4 10h16v10H4z" fill="none" stroke="#fff" stroke-width="2"/><path d="M3 10l2-5h14l2 5" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-5h4v5" stroke="#fff" stroke-width="2" fill="none"/>',
  rider: '<circle cx="6" cy="17" r="3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="18" cy="17" r="3" fill="none" stroke="#fff" stroke-width="2"/><path d="M6 17l4-6h5l3 6M14 11l1-3h3" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><rect x="5" y="6" width="5" height="4" fill="#fff"/>',
  customer: '<path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-5h4v5" stroke="#fff" stroke-width="2" fill="none"/>',
};
const PIN_COL = { shop: "#5b21b6", rider: "#f59e0b", customer: "#dc2626" };
const KIND_OF = { "🏪": "shop", "🛵": "rider", "🏍": "rider", "🏠": "customer" };

function pinSvg(kind, h) {
  const w = Math.round((h * 40) / 52);
  return `<svg width="${w}" height="${h}" viewBox="0 0 40 52" style="display:block;filter:drop-shadow(0 4px 4px rgba(0,0,0,.35))"><path d="M20 50s16-17 16-30A16 16 0 104 20c0 13 16 30 16 30z" fill="${PIN_COL[kind]}" stroke="#fff" stroke-width="3"/><g transform="translate(10 10) scale(.83)">${PIN_ICON[kind]}</g></svg>`;
}

let MarkerClass = null;
function markerClass(maps) {
  if (MarkerClass) return MarkerClass;
  MarkerClass = class DotMarker extends maps.OverlayView {
    constructor(opts = {}) {
      super();
      this.o = {};
      this.el = document.createElement("div");
      this.el.className = "gm-dot";
      this.el.style.position = "absolute";
      this.el.style.transform = "translate(-50%, -50%)";
      this.el.style.cursor = "pointer";
      this.handlers = [];
      this.el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handlers.forEach((h) => h.event === "click" && h.fn(e));
      });
      this.setOptions(opts);
    }
    setOptions(opts = {}) {
      const mapChanged = "map" in opts && opts.map !== this.o.map;
      this.o = { ...this.o, ...opts };
      if (this.o.position) this.pos = this.o.position instanceof maps.LatLng ? this.o.position : new maps.LatLng(this.o.position.lat, this.o.position.lng);
      this.paint();
      if (mapChanged) super.setMap(this.o.map || null);
      else this.draw();
    }
    paint() {
      const i = this.o.icon || {};
      const d = Math.round((i.scale || 10) * 2);
      const st = this.el.style;
      const kind = this.o.kind || KIND_OF[(this.o.label && this.o.label.text) || ""];
      if (kind) {
        const h = Math.round(Math.max(34, Math.min(56, (i.scale || 12) * 3.3)));
        st.width = "auto";
        st.height = "auto";
        st.background = "transparent";
        st.border = "0";
        st.boxShadow = "none";
        st.borderRadius = "0";
        st.display = "block";
        st.transform = "translate(-50%, -100%)";
        st.opacity = this.o.opacity ?? 1;
        st.zIndex = this.o.zIndex ?? 1;
        if (this.kindKey !== `${kind}:${h}`) {
          this.el.innerHTML = pinSvg(kind, h);
          this.kindKey = `${kind}:${h}`;
        }
        this.el.className = "gm-dot mk-pin-wrap";
        this.el.title = this.o.title || "";
        return;
      }
      st.transform = "translate(-50%, -50%)";
      st.width = `${d}px`;
      st.height = `${d}px`;
      st.borderRadius = "50%";
      st.background = i.fillColor || "#6d28d9";
      st.border = `${i.strokeWeight ?? 3}px solid ${i.strokeColor || "#fff"}`;
      st.boxShadow = "0 2px 6px rgba(0,0,0,.35)";
      st.display = "grid";
      st.placeItems = "center";
      st.boxSizing = "content-box";
      st.opacity = this.o.opacity ?? 1;
      st.zIndex = this.o.zIndex ?? 1;
      st.fontSize = (this.o.label && this.o.label.fontSize) || "11px";
      st.lineHeight = "1";
      this.el.textContent = (this.o.label && this.o.label.text) || "";
      this.el.title = this.o.title || "";
    }
    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(this.el);
    }
    draw() {
      const proj = this.getProjection && this.getProjection();
      if (!proj || !this.pos) return;
      const pt = proj.fromLatLngToDivPixel(this.pos);
      if (!pt) return;
      this.el.style.left = `${pt.x}px`;
      this.el.style.top = `${pt.y}px`;
    }
    onRemove() {
      this.el.remove();
    }
    setMap(m) {
      this.o.map = m;
      super.setMap(m || null);
    }
    setPosition(p) {
      this.setOptions({ position: p });
    }
    getPosition() {
      return this.pos;
    }
    addListener(event, fn) {
      const h = { event, fn };
      this.handlers.push(h);
      return { remove: () => { this.handlers = this.handlers.filter((x) => x !== h); } };
    }
  };
  return MarkerClass;
}

export function makeMarker(opts) {
  const maps = window.google.maps;
  const C = markerClass(maps);
  return new C(opts);
}