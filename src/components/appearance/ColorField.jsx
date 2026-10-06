import { isGradient, parseColor, parseGradient, toHex } from "../../config/theme";

const hexOf = (v) => {
  const c = parseColor(v);
  if (!c) return String(v || "");
  return c.a < 1 ? `${toHex(c)} ${Math.round(c.a * 100)}%` : toHex(c);
};

export const valueLines = (v) => {
  if (isGradient(v)) {
    const { stops } = parseGradient(v);
    return [hexOf(stops[0].c), hexOf(stops[stops.length - 1].c)];
  }
  return [hexOf(v)];
};

export default function ColorField({ value, label, active, disabled, onOpen }) {
  const lines = valueLines(value);
  return (
    <button
      type="button"
      className={`ap-cf ${active ? "on" : ""}`}
      aria-label={`${label} colour`}
      disabled={disabled}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
    >
      <i><span style={{ background: value }} /></i>
      {lines.length > 1 ? (
        <code className="two"><span>{lines[0]} →</span><span>{lines[1]}</span></code>
      ) : (
        <code>{lines[0]}</code>
      )}
    </button>
  );
}
