import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { brandApi } from "../services/api";

const BrandContext = createContext({ name: "", logo: null, loaded: false, reload: () => {} });

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState({ name: "", logo: null, loaded: false });

  const reload = useCallback(async () => {
    try {
      const b = await brandApi.get();
      setBrand({ name: b?.name || "", logo: b?.logo || null, loaded: true });
    } catch {
      setBrand((x) => ({ ...x, loaded: true }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    document.title = brand.name ? `${brand.name} — Home Delivery Control Centre` : "Home Delivery Control Centre";
  }, [brand.name]);

  return <BrandContext.Provider value={{ ...brand, reload }}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);
