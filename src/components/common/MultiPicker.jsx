import { useState } from "react";

export default function MultiPicker({ label, value = [], options = [], placeholder = "Enter name", disabled = false, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const picked = value.map((v) => options.find((o) => String(o.value) === String(v))).filter(Boolean);
  const shown = options.filter(
    (o) => !value.some((v) => String(v) === String(o.value)) && (!q || o.label.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className={`mcity ${disabled ? "is-disabled" : ""}`}>
        <div className="mcity-box">
          {picked.map((o) => (
            <span className="mcity-chip" key={o.value}>
              {o.label}
              <button type="button" onClick={() => onChange(value.filter((v) => String(v) !== String(o.value)))} aria-label={`Remove ${o.label}`}>×</button>
            </span>
          ))}
          <input
            className="mcity-input"
            value={q}
            placeholder={placeholder}
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        {open && !disabled && (
          <div className="mcity-drop show">
            {shown.length ? (
              shown.map((o) => (
                <button type="button" className="mcity-opt" key={o.value}
                  onMouseDown={(e) => { e.preventDefault(); onChange([...value, o.value]); setQ(""); }}>
                  {o.label}
                </button>
              ))
            ) : (
              <div className="mcity-empty">Nothing to add</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
