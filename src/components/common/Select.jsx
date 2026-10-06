import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const ROWS = 6;

const norm = (o) => (o && typeof o === "object" ? o : { value: o, label: String(o) });

export default function Select({
  value,
  options = [],
  onChange,
  placeholder = "Select",
  disabled = false,
  clearable = false,
  className = "",
  compact = false,
  ariaLabel,
  emptyText = "No matches",
}) {
  const opts = useMemo(() => options.map(norm), [options]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState(false);
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const input = useRef(null);
  const pop = useRef(null);
  const list = useRef(null);

  const current = opts.find((o) => String(o.value) === String(value ?? ""));
  const shown = useMemo(() => {
    const k = typed ? q.trim().toLowerCase() : "";
    return k ? opts.filter((o) => String(o.label).toLowerCase().includes(k)) : opts;
  }, [opts, q, typed]);

  const place = useCallback(() => {
    const b = box.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ROW = 2.125 * remPx();
    const width = Math.min(Math.max(r.width, 11.25 * remPx()), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;
    const top = r.bottom + 4;
    setPos({ top, left, width, maxList: Math.max(ROW * 2, Math.min(ROW * ROWS, vh - top - 20)) });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  const close = useCallback(() => {
    setOpen(false);
    setTyped(false);
    setQ("");
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (pop.current?.contains(e.target) || box.current?.contains(e.target)) return;
      close();
    };
    const onScroll = (e) => {
      if (pop.current && e.target instanceof Node && pop.current.contains(e.target)) return;
      const r = box.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) close();
      else place();
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place, close]);

  useEffect(() => {
    if (!open || !list.current) return;
    const el = list.current.children[hi];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const pick = (o) => {
    onChange?.(o ? o.value : "");
    close();
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setHi(Math.max(0, opts.findIndex((o) => o === current)));
  };

  const onKey = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(shown.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[hi]) pick(shown[hi]);
    } else if (e.key === "Tab") close();
  };

  return (
    <>
      <div
        ref={box}
        className={`lov ${compact ? "lov--sm" : ""} ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`}
        onMouseDown={(e) => {
          if (disabled || e.target.closest(".lov__x")) return;
          if (e.target !== input.current) e.preventDefault();
          input.current?.focus();
          if (open && e.target !== input.current) close();
          else openList();
        }}
      >
        <input
          ref={input}
          className="lov__in"
          value={open && typed ? q : current ? current.label : ""}
          placeholder={current ? current.label : placeholder}
          disabled={disabled}
          aria-label={ariaLabel || placeholder}
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setTyped(true);
            setHi(0);
            if (!open) setOpen(true);
          }}
          onFocus={(e) => e.target.select()}
          onKeyDown={onKey}
        />
        {clearable && current && !disabled ? (
          <span
            className="lov__x"
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              pick(null);
            }}
          >
            ×
          </span>
        ) : (
          <span className="lov__caret" aria-hidden="true" />
        )}
      </div>
      {open &&
        pos &&
        createPortal(
          <div ref={pop} className="lov-pop" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <div ref={list} className="lov-pop__list" role="listbox" style={{ maxHeight: pos.maxList }}>
              {shown.length ? (
                shown.map((o, i) => (
                  <button
                    type="button"
                    key={`${o.value}`}
                    role="option"
                    aria-selected={o === current}
                    className={`lov-opt ${o === current ? "sel" : ""} ${i === hi ? "hi" : ""}`}
                    onMouseEnter={() => setHi(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o)}
                  >
                    {o.label}
                  </button>
                ))
              ) : (
                <div className="lov-empty">{emptyText}</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
