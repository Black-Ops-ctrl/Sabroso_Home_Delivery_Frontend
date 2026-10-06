import { useState, useEffect, useCallback, useRef } from "react";
import { useLive } from "../context/LiveContext";

export function useApi(fn, deps = [], live = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (silent = false) => {
    const n = ++seq.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const d = await fnRef.current();
      if (n === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current && !silent) setError(e.message || "Could not load the data.");
    } finally {
      if (n === seq.current && !silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load(false);
  }, [load]);

  useLive(live, () => load(true));

  const reload = useCallback(() => load(true), [load]);
  return { data, loading, error, reload, setData };
}
