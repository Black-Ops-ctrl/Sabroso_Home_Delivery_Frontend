import { useEffect, useState } from "react";
import PageHead from "../../components/common/PageHead";
import Modal from "../../components/common/Modal";
import Select from "../../components/common/Select";
import HeadFilter from "../../components/common/HeadFilter";
import Pager from "../../components/common/Pager";
import Icon from "../../config/icons";
import { useApi } from "../../hooks/useApi";
import { auditApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

const MOD = "Activity Log";
const MODULES = ["Orders", "Dispatch", "Rider app", "Riders", "Business setup", "Items & categories", "Chickmate Club", "Loyalty", "Users & roles", "Settings", "Data Sync", "Reports"];
const SOURCE = { WEB: ["s-web", "Web"], APP: ["s-app", "Rider app"], SYNC: ["s-sync", "Data Sync"], SYSTEM: ["s-sys", "System"] };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => ymd(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const dOnly = (v) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const tOnly = (v) => (v ? new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
const full = (v) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(/, (\d{1,2}:)/, " · $1") : "");
const num = (v) => Number(v || 0).toLocaleString("en-US");

function actionCls(a = "") {
  if (/failed|blocked|deleted|cancelled|rejected/i.test(a)) return "a-bad";
  if (/^(created|received|member added|key created|imported)$/i.test(a)) return "a-new";
  if (/delivered|approved|activated|started|resumed/i.test(a)) return "a-ok";
  if (/permissions|settings|deliver anyway|out of range|released|regenerated|paused|deactivated|stopped|timing/i.test(a)) return "a-warn";
  if (/edited|changed|adjusted|price|image|opening/i.test(a)) return "a-edit";
  if (/assigned|confirmed|out for delivery|rider|moved|auto-selected/i.test(a)) return "a-st";
  return "a-log";
}

const opt = (list, cur, label = (x) => x) => [{ value: "ALL", label: "All", selected: cur === "ALL" }, ...list.map((x) => ({ value: x, label: label(x), selected: cur === x }))];

function Changes({ row }) {
  const list = Array.isArray(row.changes) ? row.changes : [];
  if (!list.length) return null;
  const perms = list.filter((c) => c.change);
  const rest = list.filter((c) => !c.change);
  const onlyOld = rest.length && rest.every((c) => c.new === undefined);
  const onlyNew = rest.length && rest.every((c) => c.old === undefined);
  return (
    <>
      {rest.length > 0 && (
        <div className="tablewrap al-chg-wrap">
          <table className="ord-table al-chg">
            <thead>
              <tr>
                <th>Field</th>
                {onlyOld ? <th>Last value</th> : onlyNew ? <th>Value</th> : <><th>Old value</th><th>New value</th></>}
              </tr>
            </thead>
            <tbody>
              {rest.map((c, i) => (
                <tr key={i}>
                  <td className="strong" data-l="Field">{c.field}</td>
                  {onlyOld ? (
                    <td data-l="Last value"><span className="al-old">{c.old ?? "N/A"}</span></td>
                  ) : onlyNew ? (
                    <td data-l="Value"><span className="al-new">{c.new ?? "N/A"}</span></td>
                  ) : (
                    <>
                      <td data-l="Old"><span className="al-old">{c.old ?? "N/A"}</span></td>
                      <td data-l="New"><span className="al-new">{c.new ?? "N/A"}</span></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {perms.length > 0 && (
        <div className="tablewrap al-chg-wrap">
          <table className="ord-table al-chg">
            <thead><tr><th>Module</th><th>Permission</th><th>Change</th></tr></thead>
            <tbody>
              {perms.map((c, i) => (
                <tr key={i}>
                  <td className="strong" data-l="Module">{c.group}</td>
                  <td data-l="Permission">{c.field}</td>
                  <td data-l="Change"><span className={c.change === "Added" ? "al-new" : "al-old"}>{c.change}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function LogModal({ id, onClose }) {
  const { data, loading, error } = useApi(() => auditApi.get(id), [id]);
  const r = data;
  const src = r ? SOURCE[r.source] || ["s-sys", r.source] : null;
  return (
    <Modal wide cls="modal--log" title={r ? `${r.action}${r.record_code ? ` · ${r.record_code}` : ""}` : "Activity"} cancelLabel="Close" submit={null} onClose={onClose}>
      {loading && !r ? (
        <div className="empty">Loading…</div>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : (
        <>
          <div className="al-meta">
            <div><span>User</span><b>{[r.user_name || "Unknown", r.user_role].filter(Boolean).join(" · ")}</b></div>
            <div><span>Date &amp; time</span><b>{full(r.created_at)}</b></div>
            <div><span>Source</span><b>{[src[1], r.device, r.ip].filter(Boolean).join(" · ")}</b></div>
            <div><span>{r.shop_name ? "Shop" : "Module"}</span><b>{r.shop_name || r.module}</b></div>
          </div>
          {r.summary && <div className="al-sum">{r.summary}</div>}
          <Changes row={r} />
        </>
      )}
    </Modal>
  );
}

function PdfModal({ initial, facets, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    if (!f.from || !f.to) return toast.error("Select the from and to dates");
    if (f.to < f.from) return toast.error("To date must be after the from date");
    auditApi.pdf(f);
    onClose();
  };
  const all = (label) => ({ value: "ALL", label });
  return (
    <Modal title="Download PDF" submit="Download PDF" onSubmit={submit} onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>From date</label><input type="date" className="input" value={f.from} max={f.to || undefined} onChange={(e) => set("from", e.target.value)} /></div>
        <div className="field"><label>To date</label><input type="date" className="input" value={f.to} min={f.from || undefined} onChange={(e) => set("to", e.target.value)} /></div>
      </div>
      <div className="field"><label>Module</label>
        <Select value={f.module} onChange={(v) => set("module", v)} options={[all("All modules"), ...MODULES.map((m) => ({ value: m, label: m }))]} />
      </div>
      <div className="field-row">
        <div className="field"><label>User</label>
          <Select value={f.user} onChange={(v) => set("user", v)} options={[all("All users"), ...facets.users.map((m) => ({ value: m, label: m }))]} />
        </div>
        <div className="field"><label>Action</label>
          <Select value={f.action} onChange={(v) => set("action", v)} options={[all("All actions"), ...facets.actions.map((m) => ({ value: m, label: m }))]} />
        </div>
      </div>
      <div className="field-row">
        <div className="field"><label>Source</label>
          <Select value={f.source} onChange={(v) => set("source", v)} options={[all("All sources"), ...Object.entries(SOURCE).map(([k, v]) => ({ value: k, label: v[1] }))]} />
        </div>
        <div className="field"><label>Shop</label>
          <Select value={f.shop} onChange={(v) => set("shop", v)} options={[all("All shops"), ...facets.shops.map((m) => ({ value: m, label: m }))]} />
        </div>
      </div>
    </Modal>
  );
}

export default function ActivityLog() {
  const { can } = useAuth();
  const search = usePageSearch("activity-log");
  const [module, setModule] = useState("ALL");
  const [user, setUser] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [shop, setShop] = useState("ALL");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [pdf, setPdf] = useState(false);
  const filters = { module, user, source, action, shop, from, to, q: search.query };
  const key = JSON.stringify(filters);
  const { data, loading, error } = useApi(() => auditApi.list({ ...filters, page }), [key, page], ["audit_logs"]);
  useEffect(() => setPage(1), [key]);
  const d = data || { rows: [], total: 0, counts: {}, facets: { users: [], actions: [], shops: [], sources: [] } };
  const tabs = ["ALL", ...MODULES];

  return (
    <>
      <PageHead title="Activity Log">
        {can(MOD, "download") && (
          <button className="btn" onClick={() => setPdf(true)}><Icon name="download" /><span>Download PDF</span></button>
        )}
      </PageHead>
      <div className="ord-tools ord-tools--orders">
        <div className="tabs exc-tabs">
          {tabs.map((t) => (
            <button key={t} className={`tab ${module === t ? "is-active" : ""}`} onClick={() => setModule(t)}>
              {t === "ALL" ? "All" : t} <span className="tab__count">({num(d.counts[t])})</span>
            </button>
          ))}
        </div>
        <div className="date-filters">
          <input type="date" className="input" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value || daysAgo(6))} />
          <span className="date-sep">–</span>
          <input type="date" className="input" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value || today())} />
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
          {search.query && (
            <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
          )}
        </div>
      </div>
      <div className="tablewrap">
        <table className="ord-table al-t">
          <thead>
            <tr>
              <th>Date &amp; time</th>
              <th className="th-filter"><HeadFilter label="User" active={user !== "ALL"} options={opt(d.facets.users, user)} onSelect={setUser} placeholder="Enter name" /></th>
              <th className="th-filter"><HeadFilter label="Source" active={source !== "ALL"} searchable={false} options={opt(Object.keys(SOURCE), source, (x) => SOURCE[x][1])} onSelect={setSource} /></th>
              <th className="th-filter"><HeadFilter label="Module" active={module !== "ALL"} searchable={false} options={opt(MODULES, module)} onSelect={setModule} /></th>
              <th className="th-filter"><HeadFilter label="Action" active={action !== "ALL"} options={opt(d.facets.actions, action)} onSelect={setAction} placeholder="Enter action" /></th>
              <th>Record</th>
              <th className="th-filter"><HeadFilter label="Shop" active={shop !== "ALL"} options={opt(d.facets.shops, shop)} onSelect={setShop} placeholder="Enter shop" /></th>
              <th>Details</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={9}><div className="empty">Loading…</div></td></tr>
            ) : error ? (
              <tr><td colSpan={9}><div className="empty">{error}</div></td></tr>
            ) : d.rows.length ? d.rows.map((r) => {
              const s = SOURCE[r.source] || ["s-sys", r.source];
              return (
                <tr key={r.id}>
                  <td><div className="strong">{tOnly(r.created_at)}</div><div className="sub">{dOnly(r.created_at)}</div></td>
                  <td><div className="strong">{r.user_name || "Unknown"}</div><div className="sub">{r.user_role || ""}</div></td>
                  <td><span className={`al-src ${s[0]}`}>{s[1]}</span></td>
                  <td>{r.module}</td>
                  <td><span className={`al-ac ${actionCls(r.action)}`}>{r.action}</span></td>
                  <td>{r.record_code ? <button className="linklike" onClick={() => setOpen(r.id)}>{r.record_code}</button> : <span className="sub">N/A</span>}</td>
                  <td>{r.shop_name || <span className="sub">N/A</span>}</td>
                  <td className="al-d">{r.summary || <span className="sub">N/A</span>}</td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn view" onClick={() => setOpen(r.id)} title="View details" aria-label="View details"><Icon name="eye" /></button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={9}><div className="empty">No activity in these dates</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={d.page || 1} total={d.total} onPage={setPage} />
      {open && <LogModal id={open} onClose={() => setOpen(null)} />}
      {pdf && <PdfModal facets={d.facets} initial={{ ...filters }} onClose={() => setPdf(false)} />}
    </>
  );
}
