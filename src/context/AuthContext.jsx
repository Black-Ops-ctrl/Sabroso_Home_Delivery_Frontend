import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from "react";
import { authApi } from "../services/api";
import { setApiUser } from "../services/api/client";
import { SESSION_MS, WARN_MS } from "../config/api";
import { can as canDo, canView as canViewMod } from "../config/permissions";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [expiry, setExpiry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tick = useRef(null);
  setApiUser(user?.id);

  const login = useCallback(async (username, password) => {
    const u = await authApi.login(username, password);
    setApiUser(u?.id);
    setUser(u);
    setExpiry(Date.now() + SESSION_MS);
    setNow(Date.now());
    return u;
  }, []);

  const logout = useCallback((reason) => {
    authApi.logout(reason === "expired" ? "expired" : undefined).catch(() => {});
    setUser(null);
    setExpiry(0);
  }, []);

  const extendSession = useCallback(() => {
    setExpiry(Date.now() + SESSION_MS);
    setNow(Date.now());
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fresh = await authApi.me(user.id);
      if (fresh) setUser((prev) => ({ ...prev, ...fresh }));
    } catch {
      setUser((prev) => prev);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return undefined;
    tick.current = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (expiry - t <= 0) logout("expired");
    }, 1000);
    return () => clearInterval(tick.current);
  }, [user, expiry, logout]);

  useEffect(() => {
    if (!user) return undefined;
    const onFocus = () => refreshUser();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refreshUser]);

  const remaining = user ? Math.max(0, expiry - now) : 0;
  const warnLeft = user && remaining <= WARN_MS ? Math.ceil(remaining / 1000) : 0;

  const can = useCallback((moduleName, action = "view") => canDo(user, moduleName, action), [user]);
  const canView = useCallback((moduleName) => canViewMod(user, moduleName), [user]);

  const value = {
    user, login, logout, extendSession, remaining, warnLeft,
    refreshUser, can, canView,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;