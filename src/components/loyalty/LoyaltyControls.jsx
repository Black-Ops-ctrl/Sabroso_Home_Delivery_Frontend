
export function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      disabled={disabled}
      className={`ly-sw ${on ? "on" : ""}`}
      onClick={() => !disabled && onChange(!on)}
    />
  );
}

export function Seg({ value, options = ["%", "Rs"], onChange, disabled, label }) {
  return (
    <span className="ly-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={String(value) === String(v)}
            className={String(value) === String(v) ? "on" : ""}
            disabled={disabled}
            onClick={() => onChange(v)}
          >
            {l}
          </button>
        );
      })}
    </span>
  );
}

export function Chips({ value = [], options = [], onChange, disabled }) {
  return (
    <div className="ly-chips">
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        const on = value.map(String).includes(String(v));
        return (
          <button
            type="button"
            key={v}
            className={`ly-chip ${on ? "on" : ""}`}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((x) => String(x) !== String(v)) : [...value, v])}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
