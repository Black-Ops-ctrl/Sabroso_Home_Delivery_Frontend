import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  parseColor, toHex, toCss, rgbToHsv, hsvToRgb, parseGradient, gradientCss, isGradient,
} from "../../config/theme";

const SWATCHES = ["#3b0764", "#6d28d9", "#1e3a8a", "#2563eb", "#0f766e", "#15803d", "#b45309", "#f59e0b", "#be123c", "#dc2626", "#0f172a", "#64748b", "#ffffff", "#000000"];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const toState = (css) => {
  const c = parseColor(css) || { r: 109, g: 40, b: 217, a: 1 };
  return { ...rgbToHsv(c), a: c.a };
};
const fromState = (s) => ({ ...hsvToRgb(s), a: s.a });

function Wheel({ value, onChange }) {
  const ref = useRef(null);
  const st = toState(value);
  const rgb = fromState(st);
  const pure = toHex(hsvToRgb({ h: st.h, s: st.s, v: 1 }));
  const set = (patch) => onChange(toCss(fromState({ ...st, ...patch })));

  const pick = (e) => {
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const s = clamp(Math.hypot(dx, dy) / (r.width / 2), 0, 1);
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    set({ h, s, v: st.v || 1 });
  };
  const down = (e) => {
    e.preventDefault();
    pick(e);
    const move = (ev) => pick(ev);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const key = (e) => {
    const d = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") set({ h: (st.h - d + 360) % 360 });
    else if (e.key === "ArrowRight") set({ h: (st.h + d) % 360 });
    else if (e.key === "ArrowUp") set({ s: clamp(st.s + d / 100, 0, 1) });
    else if (e.key === "ArrowDown") set({ s: clamp(st.s - d / 100, 0, 1) });
    else return;
    e.preventDefault();
  };
  const rad = (st.h * Math.PI) / 180;
  const kx = 50 + Math.cos(rad) * st.s * 50, ky = 50 + Math.sin(rad) * st.s * 50;

  const [hex, setHex] = useState(toHex(rgb));
  useEffect(() => { setHex(toHex(rgb)); }, [value]);
  const typeHex = (v) => {
    setHex(v);
    const t = v.trim().startsWith("#") ? v.trim() : `#${v.trim()}`;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) { const c = parseColor(t); onChange(toCss({ ...c, a: st.a })); }
  };
  const typeCh = (ch, v) => {
    const n = clamp(parseInt(v, 10) || 0, 0, 255);
    onChange(toCss({ ...rgb, [ch]: n, a: st.a }));
  };
  const eye = async () => {
    try {
      const r = await new window.EyeDropper().open();
      const c = parseColor(r.sRGBHex);
      if (c) onChange(toCss({ ...c, a: st.a }));
    } catch { return; }
  };

  return (
    <>
      <div
        ref={ref}
        className="cp-wheel"
        role="slider"
        tabIndex={0}
        aria-label="Colour wheel"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(st.h)}
        onPointerDown={down}
        onKeyDown={key}
      >
        <div className="dim" style={{ opacity: 1 - st.v }} />
        <span className="cp-knob" style={{ left: `${kx}%`, top: `${ky}%`, background: toHex(rgb) }} />
      </div>
      <div className="cp-lab"><span>Brightness</span><span>{Math.round(st.v * 100)}%</span></div>
      <input
        type="range" min="0" max="100" aria-label="Brightness"
        className="cp-range" value={Math.round(st.v * 100)}
        style={{ background: `linear-gradient(90deg,#000,${pure})` }}
        onChange={(e) => set({ v: e.target.value / 100 })}
      />
      <div className="cp-lab"><span>Opacity</span><span>{Math.round(st.a * 100)}%</span></div>
      <input
        type="range" min="0" max="100" aria-label="Opacity"
        className="cp-range cp-range--alpha" value={Math.round(st.a * 100)}
        style={{ backgroundImage: `linear-gradient(90deg,rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},0),${toHex(rgb)}),repeating-conic-gradient(#ddd 0 25%,#fff 0 50%)` }}
        onChange={(e) => set({ a: e.target.value / 100 })}
      />
      <div className="cp-vals">
        <label><input aria-label="Hex" value={hex} placeholder="#000000" maxLength={7} onChange={(e) => typeHex(e.target.value)} /><span>HEX</span></label>
        {["r", "g", "b"].map((ch) => (
          <label key={ch}>
            <input aria-label={ch.toUpperCase()} type="number" min="0" max="255" placeholder="0" value={Math.round(rgb[ch])} onChange={(e) => typeCh(ch, e.target.value)} />
            <span>{ch.toUpperCase()}</span>
          </label>
        ))}
      </div>
      <div className="cp-row">
        {typeof window !== "undefined" && "EyeDropper" in window && (
          <button type="button" className="cp-eye" aria-label="Pick a colour from the screen" onClick={eye}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-3 3-4-4z" /><path d="M14 6L4 16v4h4l10-10" /></svg>
          </button>
        )}
        <div className="cp-sws">
          {SWATCHES.map((c) => (
            <button type="button" key={c} aria-label={`Colour ${c}`} className={toHex(rgb) === c.toUpperCase() ? "on" : ""} style={{ background: c }}
              onClick={() => onChange(toCss({ ...parseColor(c), a: st.a }))} />
          ))}
        </div>
      </div>
    </>
  );
}

function GradientBar({ g, sel, setSel, onChange }) {
  const ref = useRef(null);
  const drag = (i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    setSel(i);
    const move = (ev) => {
      const r = ref.current.getBoundingClientRect();
      const p = clamp(((ev.clientX - r.left) / r.width) * 100, 0, 100);
      onChange({ ...g, stops: g.stops.map((s, k) => (k === i ? { ...s, p } : s)) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const flat = { ...g, angle: 90, stops: [...g.stops].sort((a, b) => a.p - b.p) };
  return (
    <div ref={ref} className="gb" style={{ background: gradientCss(flat) }}>
      {g.stops.map((s, i) => (
        <button
          type="button"
          key={i}
          aria-label={`Colour stop ${i + 1}`}
          className={`gb-st ${i === sel ? "on" : ""}`}
          style={{ left: `${clamp(s.p, 0, 100)}%`, background: s.c }}
          onPointerDown={drag(i)}
          onClick={() => setSel(i)}
        />
      ))}
    </div>
  );
}

export default function ColorPicker({ title, value, gradient = false, anchor, onApply, onClose, onPreview }) {
  const [mode, setMode] = useState(isGradient(value) ? "grad" : "solid");
  const [solid, setSolid] = useState(isGradient(value) ? parseGradient(value).stops[0].c : value);
  const [g, setG] = useState(isGradient(value) ? parseGradient(value) : { angle: 135, stops: [{ c: value, p: 0 }, { c: "#f59e0b", p: 100 }] });
  const [sel, setSel] = useState(0);
  const box = useRef(null);
  const [pos, setPos] = useState(null);

  const current = mode === "grad" ? gradientCss({ ...g, stops: [...g.stops].sort((a, b) => a.p - b.p) }) : solid;

  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  useEffect(() => { if (previewRef.current) previewRef.current(current); }, [current]);

  useLayoutEffect(() => {
    if (!anchor || !box.current || window.innerWidth <= 760) { setPos(null); return; }
    const w = box.current.offsetWidth, h = box.current.offsetHeight;
    let left = anchor.right - w, top = anchor.bottom + 10;
    if (top + h > window.innerHeight - 10) top = Math.max(10, anchor.top - h - 10);
    left = clamp(left, 10, window.innerWidth - w - 10);
    setPos({ left, top });
  }, [anchor, mode, g.stops.length]);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const setStop = (c) => setG((x) => ({ ...x, stops: x.stops.map((s, i) => (i === sel ? { ...s, c } : s)) }));
  const addStop = () => {
    setG((x) => {
      const sorted = [...x.stops].sort((a, b) => a.p - b.p);
      let gap = 0, at = 50;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1].p - sorted[i].p > gap) { gap = sorted[i + 1].p - sorted[i].p; at = (sorted[i + 1].p + sorted[i].p) / 2; }
      }
      const stops = [...x.stops, { c: x.stops[sel]?.c || "#ffffff", p: Math.round(at) }];
      setSel(stops.length - 1);
      return { ...x, stops };
    });
  };
  const delStop = () => {
    if (g.stops.length <= 2) return;
    setG((x) => ({ ...x, stops: x.stops.filter((_, i) => i !== sel) }));
    setSel(0);
  };

  return createPortal(
    <>
      <div className="cp-dim" onMouseDown={onClose} />
      <div
        ref={box}
        className="cp"
        role="dialog"
        aria-label={title}
        style={pos ? { left: pos.left, top: pos.top } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cp-h">
          <b>{title}</b>
          <button type="button" className="cp-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        {gradient && (
          <div className="cp-modes" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "solid"} className={mode === "solid" ? "on" : ""} onClick={() => setMode("solid")}>Solid</button>
            <button type="button" role="tab" aria-selected={mode === "grad"} className={mode === "grad" ? "on" : ""} onClick={() => setMode("grad")}>Gradient</button>
          </div>
        )}

        {mode === "grad" ? (
          <>
            <GradientBar g={g} sel={sel} setSel={setSel} onChange={setG} />
            <div className="g-angle">
              <span className="dial" style={{ "--a": `${g.angle - 90}deg` }} />
              <label>Angle</label>
              <input
                type="number" min="0" max="360" aria-label="Angle" placeholder="135"
                value={Math.round(g.angle)}
                onChange={(e) => setG((x) => ({ ...x, angle: clamp(parseFloat(e.target.value) || 0, 0, 360) }))}
              />
              <span className="g-pos">
                <label>Position</label>
                <input
                  type="number" min="-100" max="200" aria-label="Stop position" placeholder="0"
                  value={Math.round(g.stops[sel]?.p ?? 0)}
                  onChange={(e) => setG((x) => ({ ...x, stops: x.stops.map((s, i) => (i === sel ? { ...s, p: clamp(parseFloat(e.target.value) || 0, -100, 200) } : s)) }))}
                />
              </span>
            </div>
            <div className="g-btns">
              <button type="button" className="btn btn--ghost btn--sm" onClick={addStop} disabled={g.stops.length >= 5}>Add stop</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={delStop} disabled={g.stops.length <= 2}>Remove stop</button>
            </div>
            <Wheel value={g.stops[sel]?.c || "#000000"} onChange={setStop} />
          </>
        ) : (
          <Wheel value={solid} onChange={setSolid} />
        )}

        <div className="cp-cmp" aria-hidden="true">
          <span style={{ background: value }}>Old</span>
          <span style={{ background: current }}>New</span>
        </div>
        <div className="cp-foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={() => onApply(current)}>Apply</button>
        </div>
      </div>
    </>,
    document.body
  );
}
