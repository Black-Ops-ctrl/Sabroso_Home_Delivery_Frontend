import { useEffect, useMemo, useState } from "react";
import PageHead from "../../components/common/PageHead";
import Select from "../../components/common/Select";
import Icon from "../../config/icons";
import { Switch } from "../../components/loyalty/LoyaltyControls";
import { useApi } from "../../hooks/useApi";
import { exceptionsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

const MOD = "Exception Settings";
const CATS = ["Delivery", "Distance & charges", "Cancellations", "Money", "Loyalty", "Riders", "Shops & catalogue", "Data Sync", "Users & settings"];
const SEVS = ["High", "Medium", "Low"].map((s) => ({ value: s, label: s }));
const WHOLE = ["orders", "in 7 days", "in 30 days", "pts", "min", "m"];

export default function ExceptionSettings() {
  const toast = useToast();
  const { can } = useAuth();
  const search = usePageSearch("exception-settings");
  const editable = can(MOD, "edit");
  const [tab, setTab] = useState(CATS[0]);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useApi(() => exceptionsApi.settings(), [], ["app_settings"]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) setRows(data.rules.map((r) => ({ ...r, limit: r.limit === null ? "" : String(r.limit) })));
  }, [data, dirty]);

  const set = (key, k, v) => {
    setDirty(true);
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [k]: v } : r)));
  };

  const text = search.query.toLowerCase();
  const shown = useMemo(() => {
    if (!rows) return [];
    if (text) return rows.filter((r) => `${r.name} ${r.desc} ${r.category}`.toLowerCase().includes(text));
    return rows.filter((r) => r.category === tab);
  }, [rows, tab, text]);

  const save = async () => {
    for (const r of rows) {
      if (!r.has_limit) continue;
      const v = r.limit === "" ? NaN : Number(r.limit);
      if (!Number.isFinite(v)) { setTab(r.category); return toast.error(`${r.name}: enter the limit`); }
      if (v < 0) { setTab(r.category); return toast.error(`${r.name}: limit cannot be negative`); }
      if (WHOLE.includes(r.unit) && !Number.isInteger(v)) { setTab(r.category); return toast.error(`${r.name}: limit must be a whole number`); }
    }
    setBusy(true);
    try {
      await exceptionsApi.saveSettings({ rules: rows.map((r) => ({ key: r.key, on: r.on, severity: r.severity, ...(r.has_limit ? { limit: Number(r.limit) } : {}) })) });
      toast.success("Exception settings saved");
      setDirty(false);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Exception Settings">
        {editable && (
          <button className="btn" onClick={save} disabled={busy || !dirty}>
            <Icon name="check" /><span>{busy ? "Saving…" : "Save changes"}</span>
          </button>
        )}
      </PageHead>
      <div className="ord-tools ord-tools--orders">
        <div className="tabs exc-tabs">
          {CATS.map((c) => (
            <button key={c} className={`tab ${!text && tab === c ? "is-active" : ""}`} onClick={() => { setTab(c); if (text) search.clear(); }}>{c}</button>
          ))}
        </div>
        <div className="date-filters">
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
          {search.query && (
            <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
          )}
        </div>
      </div>
      {loading && !rows ? (
        <div className="empty" style={{ padding: 40 }}>Loading…</div>
      ) : error && !rows ? (
        <div className="empty" style={{ padding: 40 }}>{error}</div>
      ) : (
        <div className="exc-g">
          <div className="exc-g__h">{text ? "Search results" : tab}</div>
          <div className="tablewrap">
            <table className="ord-table exc-set">
              <thead>
                <tr><th className="exc-set__on">On / Off</th><th>Exception</th><th>Limit</th><th>Severity</th></tr>
              </thead>
              <tbody>
                {shown.length ? shown.map((r) => (
                  <tr key={r.key} className={r.on ? "" : "is-off"}>
                    <td><Switch on={r.on} label={`Turn ${r.name} ${r.on ? "off" : "on"}`} disabled={!editable} onChange={(v) => set(r.key, "on", v)} /></td>
                    <td>
                      <b className="strong">{r.name}</b>
                      <div className="sub">{text ? `${r.category} · ` : ""}{r.desc}</div>
                    </td>
                    <td>
                      {r.has_limit ? (
                        <div className="exc-lim">
                          <input className="input" inputMode="decimal" aria-label={`${r.name} limit`} placeholder="Enter limit" value={r.limit} disabled={!editable}
                            onChange={(e) => set(r.key, "limit", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))} />
                          <span>{r.unit}</span>
                        </div>
                      ) : <span className="sub">N/A</span>}
                    </td>
                    <td className="exc-set__sev">
                      <Select compact ariaLabel={`${r.name} severity`} value={r.severity} options={SEVS} disabled={!editable} onChange={(v) => set(r.key, "severity", v)} />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><div className="empty">No exception matches your search</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
