import { useEffect, useState } from "react";
import { loadGoogleMaps, metresBetween } from "../../config/googleMaps";

export const pt = (o, a = "lat", b = "lng") =>
  o && o[a] != null && o[b] != null ? { lat: Number(o[a]), lng: Number(o[b]) } : null;

export const dot = (maps, color, emoji, size = 15) => ({
  icon: { path: maps.SymbolPath.CIRCLE, scale: size, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
  label: { text: emoji, fontSize: `${Math.round(size * 0.95)}px` },
});

export const nearestIndex = (path, p) => {
  let best = 0;
  let bd = Infinity;
  path.forEach((q, i) => {
    const d = metresBetween(q, p);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};

export function useGoogleMap(ref, options) {
  const [map, setMap] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(async (maps) => {
        if (maps.importLibrary) await maps.importLibrary("maps");
        if (!alive || !ref.current) return;
        setMap(
          new window.google.maps.Map(ref.current, {
            center: { lat: 31.5204, lng: 74.3587 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
            ...options,
          })
        );
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return { map, error };
}
