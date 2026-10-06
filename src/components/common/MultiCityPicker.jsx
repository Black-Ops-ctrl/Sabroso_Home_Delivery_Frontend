import { useState } from "react";

export default function MultiCityPicker({ value = [], options = [], disabled = false, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const add = (name) => {
    if (!value.includes(name)) onChange([...value, name]);
    setQ("");
  };
  const remove = (name) => onChange(value.filter((v) => v !== name));

  const shown = options.filter(
    (c) => !value.includes(c) && (!q || c.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="field">
      <label>Except cities</label>
      <div className={`mcity ${disabled ? "is-disabled" : ""}`}>
        <div className="mcity-box">
          {value.map((c) => (
            <span className="mcity-chip" key={c}>
              {c}
              <button type="button" onClick={() => remove(c)} aria-label="Remove">
                ×
              </button>
            </span>
          ))}
          <input
            className="mcity-input"
            value={q}
            placeholder="Enter city"
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        {open && !disabled && (
          <div className="mcity-drop show">
            {shown.length ? (
              shown.map((c) => (
                <button
                  type="button"
                  className="mcity-opt"
                  key={c}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(c);
                  }}
                >
                  {c}
                </button>
              ))
            ) : (
              <div className="mcity-empty">No cities</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
