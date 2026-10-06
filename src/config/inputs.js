export const onlyLetters = (v) => String(v || "").replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/^[\s.'-]+/, "").replace(/\s{2,}/g, " ");
export const onlyDigits = (v, max) => {
  const d = String(v || "").replace(/\D/g, "");
  return max ? d.slice(0, max) : d;
};
export const mobile10 = (v) => onlyDigits(v, 10).replace(/^0+/, "");
export const amount = (v, decimals = 2) => {
  let s = String(v ?? "").replace(/[^\d.]/g, "");
  const i = s.indexOf(".");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, decimals);
  if (!decimals) s = s.replace(/\./g, "");
  return s;
};
export const wholeNumber = (v) => onlyDigits(v);
export const usernameText = (v) => String(v || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 60);
export const passwordText = (v) => String(v || "").replace(/\s/g, "").slice(0, 200);
export const codeText = (v) => String(v || "").replace(/[^A-Za-z0-9 _./-]/g, "");
export const phoneText = (v) => String(v || "").replace(/[^\d +-]/g, "");
export const decimalSigned = (v) => {
  let s = String(v ?? "").replace(/[^\d.-]/g, "");
  s = s.replace(/(?!^)-/g, "");
  const i = s.indexOf(".");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
  return s;
};

const NAME_RE = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
export const check = {
  name: (v, label = "Name", required = true) => {
    const s = String(v || "").trim();
    if (!s) return required ? `${label} is required` : null;
    return NAME_RE.test(s) ? null : `${label} can contain letters only`;
  },
  mobile: (v, label = "Mobile number", required = true) => {
    const d = onlyDigits(v);
    if (!d) return required ? `${label} is required` : null;
    return /^[1-9]\d{9}$/.test(d) ? null : `${label} must be exactly 10 digits after +92`;
  },
  cnic: (v, label = "CNIC") => {
    const d = onlyDigits(v);
    if (!d) return null;
    return d.length === 13 ? null : `${label} must be exactly 13 digits`;
  },
  username: (v, label = "Username") => {
    const s = String(v || "").trim();
    if (!s) return `${label} is required`;
    if (s.length < 3) return `${label} must be at least 3 characters`;
    return /^[A-Za-z0-9._-]+$/.test(s) ? null : `${label} can contain letters, numbers, dot, dash and underscore only`;
  },
  password: (v, label = "Password") => {
    const s = String(v || "");
    if (!s) return `${label} is required`;
    return s.length < 4 ? `${label} must be at least 4 characters` : null;
  },
  required: (v, label) => (String(v ?? "").trim() ? null : `${label} is required`),
  pick: (v, label) => (v === "" || v === null || v === undefined ? `Please select ${label}` : null),
  number: (v, label, { required = true, min = 0, max = null } = {}) => {
    const s = String(v ?? "").trim();
    if (!s) return required ? `${label} is required` : null;
    const n = Number(s);
    if (!Number.isFinite(n)) return `${label} must be a number`;
    if (min !== null && n < min) return `${label} must be ${min} or more`;
    if (max !== null && n > max) return `${label} must be ${max} or less`;
    return null;
  },
};
export const firstError = (...e) => e.find(Boolean) || null;

export const phoneDigits = (p) => {
  const d = onlyDigits(p);
  return d.length > 10 ? d.slice(-10) : d;
};
