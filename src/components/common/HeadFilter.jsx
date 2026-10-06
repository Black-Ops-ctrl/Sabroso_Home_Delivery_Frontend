import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Icon from "../../config/icons";

export default function HeadFilter({
  label,
  active,
  options,
  onSelect,
  searchable = true,
  placeholder = "Enter name",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, list: 0 });

  const place = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const pw = pop.offsetWidth || 210;
    let left = r.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (left < 8) left = 8;
    const top = r.bottom + 6;
    const head = pop.querySelector(".hf-search")?.offsetHeight || 0;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const list = Math.max(4.5 * rem, Math.min(21.25 * rem, window.innerHeight - top - head - 12));
    setPos({ top, left, list });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const close = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    let raf = 0;
    const onScroll = (e) => {
      if (popRef.current && e.target instanceof Node && popRef.current.contains(e.target)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const btn = btnRef.current;
        if (!btn) return setOpen(false);
        const r = btn.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) setOpen(false);
        else place();
      });
    };
    const onResize = () => place();
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, place]);

  const shown = searchable
    ? options.filter(
        (o) =>
          o.value === "ALL" ||
          !q ||
          String(o.label).toLowerCase().includes(q.toLowerCase())
      )
    : options;

  return (
    <>
      <span className="th-label">{label}</span>
      <button
        ref={btnRef}
        className={`th-fbtn ${active ? "is-active" : ""}`}
        title={`Filter ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ▾
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="hf-pop open hf-pop--shop"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {searchable && (
              <div className="hf-search">
                <Icon name="search" />
                <input
                  placeholder={placeholder}
                  value={q}
                  autoComplete="off"
                  onChange={(e) => setQ(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="hf-list" style={pos.list ? { maxHeight: pos.list } : undefined}>
              {shown.map((o) => (
                <button
                  key={o.value}
                  className={`hf-opt ${o.selected ? "sel" : ""}`}
                  onClick={() => {
                    onSelect(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
