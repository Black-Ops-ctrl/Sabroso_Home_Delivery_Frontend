export const money = (n) => "Rs " + Number(n || 0).toLocaleString("en-US");

export const num = (n) => Number(n || 0).toLocaleString("en-US");

export const pad = (id, n = 3) => String(id).padStart(n, "0");

export const statusBadgeCls = (s) =>
  s === "Active" || s === "ACTIVE"
    ? "b-green"
    : s === "Blocked"
    ? "b-red"
    : "b-grey";
