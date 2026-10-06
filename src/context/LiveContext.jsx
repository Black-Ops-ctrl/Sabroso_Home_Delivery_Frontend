import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { API_BASE } from "../config/api";
import { useAuth } from "./AuthContext";

const LiveContext = createContext(null);
const SAFETY_MS = 30000;

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const subs = useRef(new Set());

  const emit = useCallback((tables) => {
    subs.current.forEach((s) => {
      if (!tables || !s.tables || s.tables.some((t) => tables.includes(t))) s.cb(tables);
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let es = null;
    let retry = null;
    let closed = false;
    const open = () => {
      if (closed || typeof EventSource === "undefined") return;
      es = new EventSource(`${API_BASE}/live`);
      es.addEventListener("change", (e) => {
        try {
          const d = JSON.parse(e.data);
          emit(Array.isArray(d.tables) ? d.tables : null);
        } catch {
          emit(null);
        }
      });
      es.onerror = () => {
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          if (!closed) retry = setTimeout(open, 3000);
        }
      };
    };
    open();
    const safety = setInterval(() => {
      if (document.visibilityState === "visible") emit(null);
    }, SAFETY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") emit(null);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(safety);
      document.removeEventListener("visibilitychange", onVisible);
      if (es) es.close();
    };
  }, [user, emit]);

  const subscribe = useCallback((tables, cb) => {
    const s = { tables, cb };
    subs.current.add(s);
    return () => subs.current.delete(s);
  }, []);

  return <LiveContext.Provider value={subscribe}>{children}</LiveContext.Provider>;
}

export function useLive(tables, cb) {
  const subscribe = useContext(LiveContext);
  const ref = useRef(cb);
  ref.current = cb;
  const key = (tables || []).join(",");
  useEffect(() => {
    if (!subscribe || !key) return undefined;
    let t = null;
    const off = subscribe(key.split(","), () => {
      clearTimeout(t);
      t = setTimeout(() => ref.current && ref.current(), 120);
    });
    return () => {
      clearTimeout(t);
      off();
    };
  }, [subscribe, key]);
}

export default LiveProvider;