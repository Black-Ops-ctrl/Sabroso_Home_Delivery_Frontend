import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { themeApi } from "../services/api";
import { applyTheme, resolveTheme } from "../config/theme";

const CACHE = "sabroso.theme";
const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE) || "{}") || {}; } catch { return {}; }
};
const writeCache = (t) => {
  try { localStorage.setItem(CACHE, JSON.stringify(t || {})); } catch { return; }
};
const sig = (t) => JSON.stringify(Object.keys(t || {}).sort().map((k) => [k, t[k]]));

applyTheme(readCache());

const ThemeContext = createContext({ saved: {}, theme: resolveTheme({}), reload: () => {}, setSaved: () => {}, hold: () => {} });

export function ThemeProvider({ children }) {
  const [saved, setSavedState] = useState(readCache);
  const cur = useRef(sig(saved));
  const held = useRef(false);

  const setSaved = useCallback((t) => {
    const v = t && typeof t === "object" ? t : {};
    const s = sig(v);
    if (s === cur.current) return;
    cur.current = s;
    setSavedState(v);
    writeCache(v);
    if (!held.current) applyTheme(v);
  }, []);

  const hold = useCallback((on) => { held.current = !!on; }, []);

  const reload = useCallback(async () => {
    try { setSaved(await themeApi.get()); } catch { return; }
  }, [setSaved]);

  useEffect(() => { reload(); }, [reload]);

  const theme = useMemo(() => resolveTheme(saved), [saved]);
  return <ThemeContext.Provider value={{ saved, theme, reload, setSaved, hold }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
