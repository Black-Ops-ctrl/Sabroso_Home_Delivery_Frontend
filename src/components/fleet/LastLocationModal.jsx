import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../config/icons";
import Modal from "../common/Modal";
import { riderViewApi } from "../../services/api";
import { makeMarker } from "../../config/googleMaps";
import { useLive } from "../../context/LiveContext";
import { useGoogleMap, dot, pt } from "./mapKit";

const agoText = (s) =>
  s == null ? "—" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} hr ago` : `${Math.round(s / 86400)} d ago`;
const distText = (m) => (m == null ? null : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export default function LastLocationModal({ riderId, name, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const mapEl = useRef(null);
  const { map, error } = useGoogleMap(mapEl, { fullscreenControl: false });
  const ov = useRef({ rider: null });
  const fitted = useRef(false);

  const load = useCallback(
    () =>
      riderViewApi
        .lastLocation(riderId)
        .then((x) => {
          setD(x);
          setErr("");
        })
        .catch((e) => setErr(e.message || "Could not load the last location.")),
    [riderId]
  );
  useEffect(() => {
    load();
  }, [load]);
  useLive(["rider_locations", "riders", "rider_duty_sessions"], load);

  useEffect(() => {
    if (!map || !d) return;
    const maps = window.google.maps;
    const o = ov.current;
    const last = pt(d.last);
    if (last) {
      const color = d.conn === "LIVE" ? "#6d28d9" : d.conn === "WEAK" ? "#f59e0b" : "#8a8298";
      const opts = { position: last, map, title: d.rider?.name || name, zIndex: 30, ...dot(maps, color, "🛵", 16) };
      if (o.rider) o.rider.setOptions(opts);
      else o.rider = makeMarker(opts);
    } else if (o.rider) {
      o.rider.setMap(null);
      o.rider = null;
    }
    if (!fitted.current && last) {
      map.setCenter(last);
      map.setZoom(16);
      fitted.current = true;
    }
  }, [map, d, name]);

  useEffect(
    () => () => {
      const o = ov.current;
      if (o.rider) o.rider.setMap(null);
    },
    []
  );

  const last = pt(d?.last);
  const conn = d?.conn || "OFFLINE";
  const shopDist = distText(d?.metres_to_shop);
  const gmaps = last ? `https://www.google.com/maps/search/?api=1&query=${last.lat},${last.lng}` : null;

  return (
    <Modal cls="rv-loc" hideFoot onClose={onClose}>
      <div className="rv-loc__head">
        <b>{name} · Last location</b>
        <button className="rv-loc__x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="rv-loc__map">
        <div ref={mapEl} className="lt-map__canvas" />
        {(error || err) && (
          <div className="lt-map__msg">
            <Icon name="alert" />
            <span>{err || error}</span>
          </div>
        )}
        {d && !last && !err && !error && <div className="lt-map__note">No location received yet</div>}
        {d && last && (
          <div className="rv-loc__chips">
            <span className="rv-loc__chip">
              <i className={`rv-conn rv-conn--${conn.toLowerCase()}`} />
              {agoText(d.seconds_ago)}
              {d.last.speed != null ? ` · ${Math.round(Number(d.last.speed))} km/h` : ""}
            </span>
            {shopDist && d.shop && <span className="rv-loc__chip">{shopDist} from {d.shop.name}</span>}
          </div>
        )}
      </div>
      <div className="rv-loc__foot">
        {gmaps ? (
          <a className="btn btn--sm" href={gmaps} target="_blank" rel="noreferrer">Open in Google Maps</a>
        ) : (
          <button className="btn btn--sm" disabled>Open in Google Maps</button>
        )}
      </div>
    </Modal>
  );
}
