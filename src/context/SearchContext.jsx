import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Icon from "../config/icons";

const SearchContext = createContext(null);
export const useSearch = () => useContext(SearchContext);

const PLACEHOLDERS = {
  orders: "Enter order ID, customer or phone",
  "app-orders": "Enter order ID, customer or phone",
  dispatch: "Enter order ID, customer or phone",
  riders: "Enter rider name, ID, phone or shop",
  companies: "Enter company name",
  shops: "Enter shop name, ID or company",
  regions: "Enter region name",
  cities: "Enter city or region",
  items: "Enter item, category or company",
  categories: "Enter category name",
  chickmate: "Enter member name, card ID or phone",
  users: "Enter user name, username or role",
  roles: "Enter role name",
  tiers: "Enter tier name",
  campaigns: "Enter campaign name",
  tracking: "Enter order ID, rider or customer",
  "sync-keys": "Enter key name or module",
  "sync-queue": "Enter key name or module",
  "sync-logs": "Enter key name, module or message",
  exceptions: "Enter exception name",
  "exception-detail": "Enter record, shop, rider or details",
  "exception-settings": "Enter exception name",
  "activity-log": "Enter record, user, phone or details",
  "rider-assignments": "Enter order ID or customer",
};

export function SearchProvider({ children }) {
  const [queries, setQueries] = useState({});
  const [openCtx, setOpenCtx] = useState(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const activeCtxRef = useRef(null);

  const stackRef = useRef([]);
  const registerContext = useCallback((ctx) => {
    if (!ctx) return () => {};
    const entry = { ctx };
    stackRef.current.push(entry);
    activeCtxRef.current = ctx;
    return () => {
      stackRef.current = stackRef.current.filter((x) => x !== entry);
      const top = stackRef.current[stackRef.current.length - 1];
      activeCtxRef.current = top ? top.ctx : null;
    };
  }, []);

  const getQuery = useCallback((ctx) => queries[ctx] || "", [queries]);

  const clear = useCallback((ctx) => {
    setQueries((q) => ({ ...q, [ctx]: "" }));
  }, []);

  const open = useCallback(
    (ctx) => {
      setOpenCtx(ctx);
      setDraft(queries[ctx] || "");
    },
    [queries]
  );

  const close = useCallback(() => setOpenCtx(null), []);

  const commit = useCallback(() => {
    if (openCtx == null) return;
    setQueries((q) => ({ ...q, [openCtx]: draft.trim() }));
    setOpenCtx(null);
  }, [openCtx, draft]);

  useEffect(() => {
    if (openCtx != null && inputRef.current) {
      const t = setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 10);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [openCtx]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (activeCtxRef.current) {
          e.preventDefault();
          open(activeCtxRef.current);
        }
      }
      if (e.key === "Escape" && openCtx != null) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, openCtx]);

  const value = { getQuery, clear, open, registerContext };

  return (
    <SearchContext.Provider value={value}>
      {children}
      <div
        className={`qsearch-overlay ${openCtx != null ? "show" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="qsearch-box">
          <div className="qsearch-inputwrap">
            <Icon name="search" />
            <input
              ref={inputRef}
              value={draft}
              placeholder={PLACEHOLDERS[openCtx] || "Enter text to search"}
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") close();
              }}
            />
          </div>
        </div>
      </div>
    </SearchContext.Provider>
  );
}

export function usePageSearch(ctx) {
  const search = useSearch();
  const { registerContext } = search;
  useEffect(() => registerContext(ctx), [registerContext, ctx]);
  return {
    query: search.getQuery(ctx),
    open: () => search.open(ctx),
    clear: () => search.clear(ctx),
  };
}

export default SearchProvider;
