
export const tierCls = (card) =>
  ({ basic: "b-blue", silver: "b-grey", gold: "b-amber", platinum: "b-plum", bronze: "b-amber", rosegold: "b-red", emerald: "b-green",
    sapphire: "b-blue", ruby: "b-red", diamond: "b-blue", blackgold: "b-amber", royal: "b-plum", ocean: "b-blue", sunset: "b-amber",
    pearl: "b-grey", carbon: "b-grey" }[
    card
  ] || "b-grey");

export const tierRange = (tiers, t) => {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  const idx = sorted.findIndex((x) => x.id === t.id);
  const next = sorted[idx + 1];
  const n = (v) => Number(v || 0).toLocaleString("en-US");
  return next ? `${n(t.threshold)} – ${n(Number(next.threshold) - 1)}` : `${n(t.threshold)}+`;
};

const fmtPts = (v) => Number(v || 0).toLocaleString("en-US");
export const tierPointsRange = (tiers, t) => {
  if (!t) return "";
  const next = [...tiers].sort((a, b) => a.threshold - b.threshold).find((x) => Number(x.threshold) > Number(t.threshold));
  return next ? `${fmtPts(t.threshold)} – ${fmtPts(Number(next.threshold) - 1)} points` : `${fmtPts(t.threshold)}+ points`;
};
export const tierRangeError = (tiers, t, points) => {
  if (!t) return null;
  const p = Math.max(0, Math.floor(Number(points) || 0));
  const min = Number(t.threshold) || 0;
  const next = [...tiers].sort((a, b) => a.threshold - b.threshold).find((x) => Number(x.threshold) > min);
  if (p < min) return `${t.name} needs at least ${fmtPts(min)} points (entered ${fmtPts(p)}). Enter ${fmtPts(min)} or more, or pick a lower tier.`;
  if (next && p >= Number(next.threshold))
    return `${fmtPts(p)} points is ${next.name} level (${fmtPts(next.threshold)}+). ${t.name} is ${fmtPts(min)} – ${fmtPts(Number(next.threshold) - 1)} points — pick the right tier.`;
  return null;
};

export const customerStatusCls = (s) =>
  s === "Active" ? "b-green" : s === "Blocked" ? "b-red" : "b-grey";
export const discText = (type, value) =>
  type === "Rs" ? `Rs ${Number(value || 0).toLocaleString("en-US")}` : `${Number(value || 0)}%`;

export const ledgerKind = (e) => {
  const p = Number(e.points);
  switch (e.kind) {
    case "EARN": return p < 0 ? ["Reversed", "b-orange"] : ["Earned", "b-green"];
    case "REDEEM": return p > 0 ? ["Returned", "b-blue"] : ["Redeemed", "b-plum"];
    case "REFERRAL": return p < 0 ? ["Reversed", "b-orange"] : ["Referral", "b-blue"];
    case "ADJUST": return ["Adjusted", "b-grey"];
    case "EXPIRE": return ["Expired", "b-red"];
    case "TIER": return ["Tier up", "b-amber"];
    case "OPENING": return ["Opening", "b-grey"];
    default: return [e.kind, "b-grey"];
  }
};
