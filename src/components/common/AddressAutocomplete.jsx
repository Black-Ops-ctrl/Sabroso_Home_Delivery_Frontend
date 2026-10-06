import { useEffect, useRef, useState } from "react";
import { getSuggestions, resolveSuggestion, newSessionToken } from "../../config/googleMaps";

let placesBlocked = false;

export default function AddressAutocomplete({ value, onChange, onPick, placeholder = "Delivery address", near = null }) {
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const token = useRef(null);
  const timer = useRef(null);
  const reqNo = useRef(0);
  const wrap = useRef(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!placesBlocked) newSessionToken().then((t) => { token.current = t; }).catch(() => {});
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("mousedown", close); clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!typed.current || placesBlocked) return undefined;
    clearTimeout(timer.current);
    const q = (value || "").trim();
    if (q.length < 3) { setItems([]); setOpen(false); setSearching(false); return undefined; }
    setSearching(true);
    setOpen(true);
    timer.current = setTimeout(() => {
      const my = ++reqNo.current;
      getSuggestions(q, token.current, near)
        .then((list) => {
          if (my !== reqNo.current) return;
          setItems(list);
          setActive(0);
          setOpen(list.length > 0);
        })
        .catch(() => {
          placesBlocked = true;
          if (my === reqNo.current) { setItems([]); setOpen(false); }
        })
        .finally(() => { if (my === reqNo.current) setSearching(false); });
    }, 350);
    return () => clearTimeout(timer.current);
  }, [value, near?.lat, near?.lng]);

  const pick = (s) => {
    setOpen(false);
    setItems([]);
    typed.current = false;
    onChange?.(s.main + (s.secondary ? `, ${s.secondary}` : ""));
    resolveSuggestion(s, token.current)
      .then((r) => { if (r) onPick?.(r); })
      .catch(() => {})
      .finally(() => { newSessionToken().then((t) => { token.current = t; }).catch(() => {}); });
  };

  const onKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + items.length) % items.length); }
    else if (e.key === "Enter") { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
  };

  return (
    <div className="addr-ac" ref={wrap}>
      <input
        className="input"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => { typed.current = true; onChange?.(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={onKey}
      />
      {open && searching && !items.length && (
        <div className="addr-ac__pop"><div className="addr-ac__wait">Searching…</div></div>
      )}
      {open && items.length > 0 && (
        <div className="addr-ac__pop" role="listbox">
          {items.map((s, i) => (
            <button
              type="button"
              key={s.id}
              className={`addr-ac__opt ${i === active ? "on" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
            >
              <span className="addr-ac__ico">📍</span>
              <span className="addr-ac__txt">
                <b>{s.main}</b>
                <small>{s.secondary}</small>
              </span>
              {s.km != null && <span className="addr-ac__km">{s.km} km</span>}
            </button>
          ))}
          <div className="addr-ac__brand">powered by Google</div>
        </div>
      )}
    </div>
  );
}