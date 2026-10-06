import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, PieChart, Pie, Cell } from "recharts";
import PageHead from "../../components/common/PageHead";
import Modal from "../../components/common/Modal";
import Select from "../../components/common/Select";
import Pager from "../../components/common/Pager";
import Icon from "../../config/icons";
import { useApi } from "../../hooks/useApi";
import { exceptionsApi, ordersApi, shopsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import OrderViewModal from "../orders/OrderViewModal";

const MOD = "Exception Reporting";
const LIVE = ["orders", "order_events", "loyalty_ledger", "cards", "riders", "rider_duty_sessions", "sync_logs", "sync_queue", "sync_keys", "audit_logs", "app_settings", "shops", "items", "loyalty_settings"];
const CATS = ["Delivery", "Distance & charges", "Cancellations", "Money", "Loyalty", "Riders", "Shops & catalogue", "Data Sync", "Users & settings"];
const SEV = { High: "#e11d48", Medium: "#f59e0b", Low: "#64748b" };
const PURPLE = "#6d28d9";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => ymd(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const dayLabel = (s) => new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const at = (v) => (v ? new Date(v) : null);
const dOnly = (v) => (v ? at(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const tOnly = (v) => (v ? at(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
const num = (v) => Number(v || 0).toLocaleString("en-US");
const sevCls = { High: "sev-h", Medium: "sev-m", Low: "sev-l" };
const Sev = ({ s }) => <span className={`exc-sev ${sevCls[s]}`}>{s}</span>;

const Stat = ({ label, value, sub, grad }) => (
  <div className="db-stat" style={{ background: grad }}>
    <div className="db-stat__l">{label}</div>
    <div className="db-stat__v">{value}</div>
    <div className="db-stat__s">{sub}</div>
  </div>
);

function Stats({ list, range }) {
  const sum = (sev) => list.filter((r) => !sev || r.severity === sev).reduce((t, r) => t + r.count, 0);
  const period = range ? `${dayLabel(range.from)} – ${dayLabel(range.to)} · ${list.length} rule${list.length === 1 ? "" : "s"}` : "";
  return (
    <div className="db-stats">
      <Stat label="Total exceptions" value={num(sum())} sub={period} grad="linear-gradient(135deg,#4c1d95,#7c3aed)" />
      <Stat label="High" value={num(sum("High"))} sub="needs action today" grad="linear-gradient(135deg,#b91c1c,#ef4444)" />
      <Stat label="Medium" value={num(sum("Medium"))} sub="review this week" grad="linear-gradient(135deg,#c2410c,#f59e0b)" />
      <Stat label="Low" value={num(sum("Low"))} sub="for information" grad="linear-gradient(135deg,#334155,#64748b)" />
    </div>
  );
}

const trend = (r) => {
  if (!r.count) return "all clear";
  if (r.prev === null || r.prev === undefined) return "open now";
  const d = r.count - r.prev;
  return d > 0 ? `↑ ${d} vs last period` : d < 0 ? `↓ ${Math.abs(d)} vs last period` : "same as last period";
};

function Bars({ rows, color }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="exc-hb">
      {rows.map((r) => (
        <div className="hb" key={r.key || r.label}>
          <span className="hb__l" title={r.label}>{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <div className="hb__t">
            <i style={{ width: `${(r.value / max) * 100}%`, background: r.color || color }}>
              {r.part ? <em style={{ width: `${(r.part / Math.max(1, r.value)) * 100}%` }} /> : null}
            </i>
          </div>
          <b>{num(r.value)}</b>
        </div>
      ))}
    </div>
  );
}

const Legend = ({ items }) => (
  <div className="exc-lg">
    {items.map(([l, c]) => <span key={l}><i style={{ background: c }} />{l}</span>)}
  </div>
);

function TotalLabel({ x, y, width, value }) {
  if (!value) return null;
  return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#2e0654">{value}</text>;
}

function DayTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="exc-tip">
      <b>{label}</b>
      {["High", "Medium", "Low"].map((s) => <div key={s}><i style={{ background: SEV[s] }} />{s}<span>{num(p[s])}</span></div>)}
    </div>
  );
}

function Charts({ data, onCategory }) {
  const t = data.totals;
  const perDay = (data.per_day || []).map((d) => ({ ...d, label: dayLabel(d.day), total: d.High + d.Medium + d.Low }));
  const donut = ["High", "Medium", "Low"].map((s) => ({ name: s, value: t[s] }));
  const cats = [...data.categories].sort((a, b) => b.count - a.count);
  const empty = (txt) => <div className="exc-empty">{txt}</div>;
  return (
    <div className="exc-charts">
      <div className="exc-ch exc-ch--wide">
        <div className="exc-ch__h"><b>Exceptions per day</b><span>{dayLabel(data.range.from)} – {dayLabel(data.range.to)} · split by severity</span></div>
        {perDay.length ? (
          <>
            <div className="exc-day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perDay} margin={{ top: 22, right: 6, left: -18, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke="#f0edf6" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6b6478" }} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8a8298" }} />
                  <Tooltip content={<DayTip />} cursor={{ fill: "rgba(109,40,217,.06)" }} />
                  <Bar dataKey="Low" stackId="a" fill={SEV.Low} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
                  <Bar dataKey="Medium" stackId="a" fill={SEV.Medium} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
                  <Bar dataKey="High" stackId="a" fill={SEV.High} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                    <LabelList dataKey="total" content={TotalLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[["High", SEV.High], ["Medium", SEV.Medium], ["Low", SEV.Low]]} />
          </>
        ) : empty("Pick up to 62 days to see the daily chart")}
      </div>
      <div className="exc-ch">
        <div className="exc-ch__h"><b>By severity</b><span>share of all exceptions</span></div>
        <div className="exc-dn">
          <div className="exc-dn__c">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={t.all ? donut : [{ name: "None", value: 1 }]} dataKey="value" innerRadius="64%" outerRadius="96%" startAngle={90} endAngle={-270}
                  paddingAngle={t.all ? 1.5 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                  {(t.all ? donut : [{ name: "None" }]).map((d) => <Cell key={d.name} fill={t.all ? SEV[d.name] : "#ece8f4"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="exc-dn__mid"><b>{num(t.all)}</b><span>exceptions</span></div>
          </div>
          <div className="exc-dn__l">
            {donut.map((d) => (
              <div key={d.name}><i style={{ background: SEV[d.name] }} /><span>{d.name}</span><b>{num(d.value)}</b><small>{t.all ? Math.round((d.value / t.all) * 100) : 0}%</small></div>
            ))}
          </div>
        </div>
      </div>
      <div className="exc-ch">
        <div className="exc-ch__h"><b>By category</b><span>click a bar to open that tab</span></div>
        <div className="exc-hb exc-hb--click">
          {cats.map((c) => {
            const max = Math.max(1, ...cats.map((x) => x.count));
            return (
              <button type="button" className="hb" key={c.name} onClick={() => onCategory(c.name)}>
                <span className="hb__l">{c.name}</span>
                <div className="hb__t"><i style={{ width: `${(c.count / max) * 100}%`, background: PURPLE }}>{c.high ? <em style={{ width: `${(c.high / Math.max(1, c.count)) * 100}%` }} /> : null}</i></div>
                <b>{num(c.count)}</b>
              </button>
            );
          })}
        </div>
        <Legend items={[["All exceptions", PURPLE], ["High part", SEV.High]]} />
      </div>
      <div className="exc-ch">
        <div className="exc-ch__h"><b>Top rules</b><span>rules hit the most</span></div>
        {data.top.length ? (
          <>
            <Bars rows={data.top.map((r) => ({ key: r.key, label: r.name, sub: r.category, value: r.count, color: SEV[r.severity] }))} />
            <Legend items={[["High", SEV.High], ["Medium", SEV.Medium], ["Low", SEV.Low]]} />
          </>
        ) : empty("No exceptions in these dates")}
      </div>
      <div className="exc-ch">
        <div className="exc-ch__h"><b>By shop</b><span>where exceptions happened</span></div>
        {data.by_shop.length ? <Bars rows={data.by_shop.map((s) => ({ label: s.name, value: s.count }))} color={PURPLE} /> : empty("No shop exceptions in these dates")}
      </div>
    </div>
  );
}

function PdfModal({ initial, shops, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    if (!f.from || !f.to) return toast.error("Select the from and to dates");
    if (f.to < f.from) return toast.error("To date must be after the from date");
    exceptionsApi.pdf({ from: f.from, to: f.to, category: f.category, severity: f.severity, shop: f.shop, rule: f.rule, who: f.who, full: f.full ? undefined : "0" });
    onClose();
  };
  return (
    <Modal title="Download PDF" submit="Download PDF" onSubmit={submit} onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>From date</label><input type="date" className="input" value={f.from} max={f.to || undefined} onChange={(e) => set("from", e.target.value)} /></div>
        <div className="field"><label>To date</label><input type="date" className="input" value={f.to} min={f.from || undefined} onChange={(e) => set("to", e.target.value)} /></div>
      </div>
      {!f.rule && (
        <div className="field"><label>Category</label>
          <Select value={f.category} onChange={(v) => set("category", v)} options={[{ value: "ALL", label: "All categories" }, ...CATS.map((c) => ({ value: c, label: c }))]} />
        </div>
      )}
      <div className="field-row">
        {!f.rule && (
          <div className="field"><label>Severity</label>
            <Select value={f.severity} onChange={(v) => set("severity", v)} options={[{ value: "ALL", label: "All" }, "High", "Medium", "Low"].map((o) => (typeof o === "string" ? { value: o, label: o } : o))} />
          </div>
        )}
        <div className="field"><label>Shop</label>
          <Select value={f.shop} onChange={(v) => set("shop", v)} options={[{ value: "ALL", label: "All shops" }, ...shops.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>
      {!f.rule && (
        <label className="exc-chk">
          <input type="checkbox" checked={f.full} onChange={(e) => set("full", e.target.checked)} />
          <span>Include full list of every exception</span>
        </label>
      )}
    </Modal>
  );
}

function Detail({ ruleKey, from, to, setFrom, setTo, onBack, shops }) {
  const toast = useToast();
  const { can } = useAuth();
  const search = usePageSearch("exception-detail");
  const [shop, setShop] = useState("ALL");
  const [who, setWho] = useState("ALL");
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const [pdf, setPdf] = useState(false);
  const key = JSON.stringify([ruleKey, from, to, shop, who, search.query]);
  const { data, loading, error } = useApi(() => exceptionsApi.rule(ruleKey, { from, to, shop, who, q: search.query, page }), [key, page], LIVE);
  useEffect(() => setPage(1), [key]);
  const d = data;
  const r = d ? d.rule : null;
  const openOrder = async (id) => {
    try { setView(await ordersApi.get(id)); } catch (e) { toast.error(e.message); }
  };
  const isOrder = (x) => x.ref_type === "order" && x.id;
  const showLimit = d && d.rows.some((x) => x.limit_text);
  const showValue = d && d.rows.some((x) => x.value_text);
  const showOver = d && d.rows.some((x) => x.over_text);
  const cols = 6 + (showValue ? 1 : 0) + (showLimit ? 1 : 0) + (showOver ? 1 : 0);
  return (
    <>
      <PageHead title={r ? r.name : "Exception"} onBack={onBack}>
        {can(MOD, "download") && (
          <button className="btn" onClick={() => setPdf(true)}><Icon name="download" /><span>Download PDF</span></button>
        )}
      </PageHead>
      <div className="ord-tools exc-dtools">
        <div className="exc-rule-line">
          {r && (
            <>
              <span className="exc-cat">{r.category}</span>
              <Sev s={r.severity} />
              <span className="exc-rule-txt">Rule: {r.desc}{r.limit_text ? <> <b>{r.limit_text}</b></> : null}</span>
            </>
          )}
        </div>
        <div className="date-filters">
          <div className="exc-sel">
            <Select compact ariaLabel="Shop" value={shop} onChange={setShop} options={[{ value: "ALL", label: "All shops" }, ...((d && d.facets.shops) || []).map((s) => ({ value: s, label: s }))]} />
          </div>
          <div className="exc-sel">
            <Select compact ariaLabel="Rider or user" value={who} onChange={setWho} options={[{ value: "ALL", label: "All riders / users" }, ...((d && d.facets.people) || []).map((s) => ({ value: s, label: s }))]} />
          </div>
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
        <table className="ord-table exc-table">
          <thead>
            <tr>
              <th>Record</th><th>Date &amp; time</th><th>Shop</th><th>Rider / User</th><th>Details</th>
              {showValue && <th className="right">Value</th>}
              {showLimit && <th className="right">Limit</th>}
              {showOver && <th className="right">Over by</th>}
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !d ? (
              <tr><td colSpan={cols}><div className="empty">Loading…</div></td></tr>
            ) : error ? (
              <tr><td colSpan={cols}><div className="empty">{error}</div></td></tr>
            ) : d.rows.length ? d.rows.map((x, i) => (
              <tr key={`${x.ref}-${x.at}-${i}`}>
                <td>{isOrder(x) ? <button className="linklike" onClick={() => openOrder(x.id)}>{x.ref}</button> : <span className="strong">{x.ref || "N/A"}</span>}</td>
                <td><div className="strong">{tOnly(x.at)}</div><div className="sub">{dOnly(x.at)}</div></td>
                <td>{x.shop_name || <span className="sub">N/A</span>}</td>
                <td>{x.who || <span className="sub">N/A</span>}</td>
                <td className="exc-det">{x.details || <span className="sub">N/A</span>}</td>
                {showValue && <td className="right strong">{x.value_text || <span className="sub">N/A</span>}</td>}
                {showLimit && <td className="right">{x.limit_text || <span className="sub">N/A</span>}</td>}
                {showOver && <td className="right exc-over">{x.over_text || ""}</td>}
                <td>
                  <div className="actions">
                    {isOrder(x) && <button className="iconbtn view" onClick={() => openOrder(x.id)} title="View order" aria-label="View order"><Icon name="eye" /></button>}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={cols}><div className="empty">No exceptions in these dates</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {d && <Pager page={d.page} total={d.total} onPage={setPage} />}
      {view && <OrderViewModal order={view} onClose={() => setView(null)} />}
      {pdf && r && (
        <PdfModal shops={shops} onClose={() => setPdf(false)}
          initial={{ from, to, category: "ALL", severity: "ALL", shop, who, rule: r.key, full: true }} />
      )}
    </>
  );
}

export default function ExceptionReport() {
  const { can } = useAuth();
  const [tab, setTab] = useState("ALL");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [detail, setDetail] = useState(null);
  const [pdf, setPdf] = useState(false);
  const { data, loading, error } = useApi(() => exceptionsApi.report({ from, to }), [from, to], LIVE);
  const shopsQ = useApi(() => shopsApi.list(), [], ["shops"]);
  const shopNames = useMemo(() => [...new Set((shopsQ.data || []).map((s) => s.name))].sort(), [shopsQ.data]);
  const search = usePageSearch(detail || tab === "ALL" ? null : "exceptions");

  if (detail) {
    return <Detail ruleKey={detail} from={from} to={to} setFrom={setFrom} setTo={setTo} onBack={() => setDetail(null)} shops={shopNames} />;
  }

  const counts = {};
  if (data) {
    counts.ALL = data.totals.all;
    for (const c of data.categories) counts[c.name] = c.count;
  }
  const all = data ? (tab === "ALL" ? data.rules : data.rules.filter((r) => r.category === tab)) : [];
  const text = tab === "ALL" ? "" : search.query.toLowerCase();
  const list = text ? all.filter((r) => `${r.name} ${r.desc}`.toLowerCase().includes(text)) : all;
  const tabs = ["ALL", ...CATS.filter((c) => !data || data.categories.find((x) => x.name === c && x.rules > 0))];

  return (
    <>
      <PageHead title="Exception Reporting">
        {can(MOD, "download") && (
          <button className="btn" onClick={() => setPdf(true)}><Icon name="download" /><span>Download PDF</span></button>
        )}
      </PageHead>
      <div className="ord-tools ord-tools--orders">
        <div className="tabs exc-tabs">
          {tabs.map((t) => (
            <button key={t} className={`tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
              {t === "ALL" ? "All" : t} <span className="tab__count">({num(counts[t] || 0)})</span>
            </button>
          ))}
        </div>
        <div className="date-filters">
          <input type="date" className="input" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value || daysAgo(6))} />
          <span className="date-sep">–</span>
          <input type="date" className="input" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value || today())} />
          {tab !== "ALL" && (
            <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
          )}
          {tab !== "ALL" && search.query && (
            <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
          )}
        </div>
      </div>
      {loading && !data ? (
        <div className="empty" style={{ padding: 40 }}>Loading…</div>
      ) : error ? (
        <div className="empty" style={{ padding: 40 }}>{error}</div>
      ) : (
        <>
          <Stats list={list} range={data.range} />
          {tab === "ALL" ? (
            <Charts data={data} onCategory={setTab} />
          ) : list.length ? (
            <div className="exc-grid">
              {list.map((r) => (
                <button type="button" className={`exc-card ${r.count ? "" : "ok"}`} key={r.key} onClick={() => setDetail(r.key)}>
                  <div className="exc-card__top"><span className="exc-cat">{r.category}</span><Sev s={r.severity} /></div>
                  <b className="exc-name">{r.name}</b>
                  <div className="exc-n">{num(r.count)}<small>{trend(r)}</small></div>
                  <div className="exc-rule">{r.desc}{r.limit_text ? <> <b>{r.limit_text}</b></> : null}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 40 }}>{text ? "No exception matches your search" : "All rules of this category are turned off"}</div>
          )}
        </>
      )}
      {pdf && (
        <PdfModal shops={shopNames} onClose={() => setPdf(false)}
          initial={{ from, to, category: tab, severity: "ALL", shop: "ALL", who: "ALL", rule: null, full: true }} />
      )}
    </>
  );
}
