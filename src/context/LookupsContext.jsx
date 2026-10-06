import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { lookupsApi } from "../services/api";
import { useAuth } from "./AuthContext";
import { useLive } from "./LiveContext";
import { setOrderLookups } from "../config/orders";

const LookupsContext = createContext(null);

export function LookupsProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({});

  const load = useCallback(async () => {
    try {
      setData((await lookupsApi.all()) || {});
    } catch {
      setData((d) => d);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);
  useLive(["lookups"], load);

  const value = useMemo(() => {
    setOrderLookups(data);
    const list = (type) => data[type] || [];
    const find = (type, code) => list(type).find((x) => x.code === code) || null;
    const label = (type, code) => {
      const f = find(type, code);
      return f ? f.label : code || "";
    };
    const short = (type, code) => {
      const f = find(type, code);
      return f ? f.data?.short || f.label : code || "—";
    };
    const options = (type) => list(type).map((x) => ({ value: x.code, label: x.label }));
    const channels = (module) => list("channel").filter((x) => !module || x.data?.module === module).map((x) => x.code);
    const statusLabel = (code, app = false) => {
      const f = find("order_status", code);
      if (!f) return code || "";
      return app && f.data?.app_label ? f.data.app_label : f.label;
    };
    return { ready: Object.keys(data).length > 0, list, find, label, short, options, channels, statusLabel, reload: load };
  }, [data, load]);

  return <LookupsContext.Provider value={value}>{children}</LookupsContext.Provider>;
}

export const useLookups = () => useContext(LookupsContext);
export default LookupsProvider;
