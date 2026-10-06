import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, LabelList } from "recharts";
import Icon from "../../config/icons";
import Pager from "../common/Pager";
import { money } from "../../config/format";
import { statusClass, statusLabel } from "../../config/orders";
import { useApi } from "../../hooks/useApi";
import { riderViewApi } from "../../services/api";
import { useLookups } from "../../context/LookupsContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import Modal from "../common/Modal";
import RoutePopup from "../orders/RoutePopup";
import LastLocationModal from "./LastLocationModal";

const LIVE = ["orders", "riders", "rider_duty_sessions", "rider_locations"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => ymd(new Date());
const monthStart = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};
const time = (d) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—");
const dateText = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const when = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  const now = new Date();
  if (sameDay(d, now)) return time(v);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return `Yesterday ${time(v)}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time(v)}`;
};
const ago = (v) => {
  if (!v) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)} d ago`;
};
const dur = (m) => {
  if (m == null) return "—";
  const n = Math.max(0, Math.round(Number(m)));
  const h = Math.floor(n / 60);
  return h ? `${h}h ${n % 60}m` : `${n}m`;
};
const kmText = (v) => (v == null || v === "" || Number(v) === 0 ? "—" : `${Number(v).toFixed(1)} km`);
const kmVal = (v) => `${Number(v || 0).toFixed(1)} km`;

function DateRange({ from, to, setFrom, setTo }) {
  return (
    <div className="date-filters">
      <input type="date" className="input" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value || monthStart())} />
      <span className="date-sep">–</span>
      <input type="date" className="input" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value || today())} />
      <button className="iconbtn" title="Reset dates" aria-label="Reset dates" onClick={() => { setFrom(monthStart()); setTo(today()); }}>
        <Icon name="x" />
      </button>
    </div>
  );
}

function Assignments({ riderId, range }) {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [route, setRoute] = useState(null);
  const search = usePageSearch("rider-assignments");
  useEffect(() => setPage(1), [range.from, range.to, status, search.query]);
  const { data, loading, error } = useApi(
    () => riderViewApi.assignments(riderId, { from: range.from, to: range.to, status, page, q: search.query }),
    [riderId, range.from, range.to, status, page, search.query],
    LIVE
  );
  const c = data?.counts || {};
  const chips = [
    ["ALL", "All", c.all],
    ["ACTIVE", "Active", c.active],
    ["DELIVERED", "Delivered", c.delivered],
    ["CANCELLED", "Cancelled", c.cancelled],
  ];
  const rows = data?.rows || [];
  return (
    <div className="rv-panel">
      <div className="rv-bar">
        <div className="rv-chips">
          {chips.map(([k, l, n]) => (
            <button key={k} className={`rv-chip ${status === k ? "on" : ""}`} onClick={() => setStatus(k)}>
              {l} {n ?? 0}
            </button>
          ))}
        </div>
        <div className="rv-bar__r">
          <DateRange {...range} />
          {search.query && (
            <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
          )}
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
        </div>
      </div>
      <div className="tablewrap rv-table">
        <table className="ord-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Delivery time</th>
              <th>Distance</th>
              <th className="right">Amount</th>
              <th className="right rv-act" aria-label="Route" />
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={8}><div className="empty">Loading…</div></td></tr>
            ) : error ? (
              <tr><td colSpan={8}><div className="empty">{error}</div></td></tr>
            ) : rows.length ? (
              rows.map((o) => (
                <tr key={o.id}>
                  <td className="rv-code">{o.code}</td>
                  <td>
                    <div className="strong">{o.customer_name || "Walk-in"}</div>
                    {o.customer_address && <div className="rv-sub" title={o.customer_address}>{o.customer_address}</div>}
                  </td>
                  <td>
                    <span className={statusClass(o.status)} title={o.status === "CANCELLED" && o.cancel_reason ? o.cancel_reason : undefined}>
                      {statusLabel(o.status, o.channel !== "Call Center")}
                    </span>
                  </td>
                  <td className="nowrap">{when(o.assigned_at)}</td>
                  <td className="nowrap">{o.status === "DELIVERED" && o.delivery_min != null ? `${o.delivery_min} min` : "—"}</td>
                  <td className="nowrap">{kmText(o.status === "DELIVERED" ? o.actual_km ?? o.distance_km : o.status === "CANCELLED" ? null : o.distance_km)}</td>
                  <td className="right strong nowrap">{money(o.total)}</td>
                  <td className="right">
                    {o.status === "DELIVERED" && (
                      <button className="rv-route" title="View route" aria-label="View route" onClick={() => setRoute(o)}>
                        <Icon name="route" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8}><div className="empty">No orders for the selected dates</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={data?.page || page} total={data?.total || 0} perPage={data?.per_page || 15} onPage={setPage} />
      {route && <RoutePopup order={route} onClose={() => setRoute(null)} />}
    </div>
  );
}

function DutyLog({ riderId, range }) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [range.from, range.to]);
  const { data, loading, error } = useApi(
    () => riderViewApi.dutyLog(riderId, { from: range.from, to: range.to, page }),
    [riderId, range.from, range.to, page],
    LIVE
  );
  const s = data?.summary || {};
  const rows = data?.rows || [];
  return (
    <div className="rv-panel">
      <div className="rv-bar">
        <div className="rv-sum">
          <span>Total on duty <b>{dur(s.total_min || 0)}</b></span>
          <span>Sessions <b>{s.sessions ?? 0}</b></span>
          <span>Avg. per day <b>{dur(s.avg_day_min || 0)}</b></span>
        </div>
        <DateRange {...range} />
      </div>
      <div className="tablewrap rv-table">
        <table className="ord-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>On duty</th>
              <th>Off duty</th>
              <th>Duration</th>
              <th>Delivered</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={6}><div className="empty">Loading…</div></td></tr>
            ) : error ? (
              <tr><td colSpan={6}><div className="empty">{error}</div></td></tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{dateText(r.on_at)}</td>
                  <td><span className="rv-tag rv-tag--on">{time(r.on_at)}</span></td>
                  <td>
                    {r.running ? (
                      <span className="rv-tag rv-tag--now">On duty now</span>
                    ) : (
                      <span className="rv-tag rv-tag--off" title={r.off_reason || undefined}>{r.off_at && !sameDay(new Date(r.off_at), new Date(r.on_at)) ? when(r.off_at) : time(r.off_at)}</span>
                    )}
                  </td>
                  <td className="strong nowrap">{dur(r.minutes)}{r.running ? " · running" : ""}</td>
                  <td>{r.delivered ?? 0}</td>
                  <td className="nowrap">{kmVal(r.km)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6}><div className="empty">No duty sessions for the selected dates</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={data?.page || page} total={data?.total || 0} perPage={data?.per_page || 15} onPage={setPage} />
    </div>
  );
}

const TIP = { contentStyle: { borderRadius: 8, border: "1px solid #ece8f4", fontSize: 12, fontFamily: "inherit" }, cursor: { fill: "rgba(109,40,217,.06)" } };
const AX = { tick: { fontSize: 10.5, fill: "#8a8298" }, axisLine: false, tickLine: false };

function Ring({ pct, color, label }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  return (
    <div className="rv-ring">
      <div className="rv-ring__c">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={[{ v }, { v: 100 - v }]} dataKey="v" innerRadius="76%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" cornerRadius={v > 0 && v < 100 ? 6 : 0} isAnimationActive={false}>
              <Cell fill={color} />
              <Cell fill="#f0ecf5" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <b>{v}%</b>
      </div>
      <span>{label}</span>
    </div>
  );
}

function Performance({ riderId, range }) {
  const { data, loading, error } = useApi(
    () => riderViewApi.performance(riderId, { from: range.from, to: range.to }),
    [riderId, range.from, range.to],
    LIVE
  );
  const days = data?.days || [];
  const multiMonth = days.length && days[0].day.slice(0, 7) !== days[days.length - 1].day.slice(0, 7);
  const label = (d) => {
    const x = new Date(`${d}T00:00:00`);
    return multiMonth ? x.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : String(x.getDate());
  };
  const rows = days.map((d) => ({ ...d, label: label(d.day), delivered: Number(d.delivered || 0), km: Number(Number(d.km || 0).toFixed(1)), avg_min: d.avg_min == null ? null : Number(d.avg_min) }));
  const s = data?.summary || {};
  const t = today();
  const totalKm = rows.reduce((a, r) => a + r.km, 0);
  const dense = rows.length > 16;
  return (
    <div className="rv-perf">
      <div className="rv-bar rv-bar--end">
        <DateRange {...range} />
      </div>
      {loading && !data ? (
        <div className="card"><div className="empty">Loading…</div></div>
      ) : error ? (
        <div className="card"><div className="empty">{error}</div></div>
      ) : (
        <div className="rv-grid">
          <div className="rv-cc">
            <div className="rv-cc__h"><b>Deliveries per day</b><span>{s.delivered ?? 0} delivered</span></div>
            <div className="rv-cc__b">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="label" {...AX} interval={dense ? "preserveStartEnd" : 0} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip {...TIP} formatter={(v) => [v, "Delivered"]} labelFormatter={(l, p) => (p?.[0] ? dateText(`${p[0].payload.day}T00:00:00`) : l)} />
                  <Bar dataKey="delivered" radius={[4, 4, 0, 0]} maxBarSize={22}>
                    {!dense && <LabelList dataKey="delivered" position="top" style={{ fontSize: 10, fill: "#4a4458" }} />}
                    {rows.map((r) => <Cell key={r.day} fill={r.day === t ? "#6d28d9" : "#d9ccf7"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rv-cc">
            <div className="rv-cc__h"><b>Avg. delivery time</b><span>minutes{s.avg_delivery_min != null ? ` · ${s.avg_delivery_min} min avg` : ""}</span></div>
            <div className="rv-cc__b">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0ecf5" />
                  <XAxis dataKey="label" {...AX} interval={dense ? "preserveStartEnd" : 0} />
                  <YAxis {...AX} width={28} allowDecimals={false} />
                  <Tooltip {...TIP} cursor={{ stroke: "#ece8f4" }} formatter={(v) => [v == null ? "—" : `${v} min`, "Avg. delivery"]} labelFormatter={(l, p) => (p?.[0] ? dateText(`${p[0].payload.day}T00:00:00`) : l)} />
                  <Line type="linear" dataKey="avg_min" stroke="#0891b2" strokeWidth={2.5} connectNulls dot={{ r: 3.5, fill: "#fff", stroke: "#0891b2", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rv-cc">
            <div className="rv-cc__h"><b>Distance per day</b><span>{Math.round(Number(s.distance_km ?? totalKm))} km total</span></div>
            <div className="rv-cc__b">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="label" {...AX} interval={dense ? "preserveStartEnd" : 0} />
                  <YAxis hide />
                  <Tooltip {...TIP} formatter={(v) => [`${v} km`, "Distance"]} labelFormatter={(l, p) => (p?.[0] ? dateText(`${p[0].payload.day}T00:00:00`) : l)} />
                  <Bar dataKey="km" fill="#fcd9a8" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rv-cc">
            <div className="rv-cc__h"><b>Summary</b><span>selected dates</span></div>
            <div className="rv-rings">
              <Ring pct={s.delivered_pct} color="#16a34a" label="Delivered" />
              <Ring pct={s.cancelled_pct} color="#dc2626" label="Cancelled" />
              <Ring pct={s.under20_pct} color="#6d28d9" label="Under 20 min" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneModal({ rider, canRelease, onClose }) {
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const has = rider.has_phone && !gone;
  const release = async () => {
    setBusy(true);
    try {
      await riderViewApi.releasePhone(rider.id);
      toast.success("Phone released");
      setGone(true);
      setAsk(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (ask)
    return (
      <Modal title="Release phone?" cls="modal--confirm-grad" submit="Release" danger busy={busy} onClose={() => setAsk(false)} onSubmit={release}>
        <p className="sub">{rider.name} will be signed out on this phone and can sign in on another phone.</p>
      </Modal>
    );
  return (
    <Modal title="Phone" cls="modal--phone" hideFoot onClose={onClose}>
      <button className="ov__close" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      {has ? (
        <>
          <div className="ph-rows">
            <div><span>Phone</span><b>{rider.device_name || "Unknown phone"}</b></div>
            <div><span>Platform</span><b>{rider.device_platform ? rider.device_platform[0].toUpperCase() + rider.device_platform.slice(1) : "—"}</b></div>
            <div><span>Since</span><b>{when(rider.device_at)}</b></div>
          </div>
          {canRelease && <button className="btn btn--danger ph-release" onClick={() => setAsk(true)}><Icon name="phone" /><span>Release phone</span></button>}
        </>
      ) : (
        <div className="ph-none"><Icon name="phone" /><b>No phone registered</b></div>
      )}
    </Modal>
  );
}

export default function RiderView({ riderId, onBack, canRelease }) {
  const lk = useLookups();
  const [tab, setTab] = useState("assignments");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [loc, setLoc] = useState(false);
  const [phone, setPhone] = useState(false);
  const [, setTick] = useState(0);
  const { data: r, error } = useApi(() => riderViewApi.overview(riderId), [riderId], LIVE);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const range = { from, to, setFrom, setTo };

  if (!r)
    return (
      <div className="rv">
        <div className="rv-hero rv-hero--empty">
          <button className="rv-back" onClick={onBack}><span className="rv-back__i"><Icon name="back" /></span>Back</button>
        </div>
        <div className="empty" style={{ padding: 40 }}>{error || "Loading rider…"}</div>
      </div>
    );

  const d = r.today || {};
  const meta = [
    ["Last seen", ago(r.last_seen)],
    ["Last login", when(r.app_login_at)],
    ["On duty since", r.on_duty && r.duty_since ? when(r.duty_since) : "—"],
    ["Joined", dateText(r.joined)],
  ];
  const tiles = [
    [d.delivered ?? 0, "Delivered today", "ok"],
    [d.active ?? 0, "Active orders", "plum"],
    [d.cancelled ?? 0, "Cancelled today", "bad"],
    [d.avg_delivery_min != null ? `${d.avg_delivery_min} min` : "—", "Avg. delivery", ""],
    [kmVal(d.distance_km), "Distance today", ""],
    [dur(d.on_duty_min || 0), "On duty today", ""],
  ];

  return (
    <div className="rv">
      <div className="rv-hero">
        <div className="rv-hero__top">
          <button className="rv-back" onClick={onBack}><span className="rv-back__i"><Icon name="back" /></span>Back</button>
          <div className="rv-hero__btns">
            <button className="rv-ghost" onClick={() => setLoc(true)}><Icon name="pin" /><span>Last location</span></button>
            <button className="btn btn--sm rv-phone" onClick={() => setPhone(true)}><Icon name="phone" /><span>Phone</span></button>
          </div>
        </div>
        <div className="rv-hero__main">
          <div className="rv-id">
            <div className="rv-name">
              <span>{r.name}</span>
              <span className={`rv-duty ${r.on_duty ? "on" : ""}`}>{r.on_duty ? "On duty" : "Off duty"}</span>
              <span className={`rv-st ${r.status === "ACTIVE" ? "" : "off"}`}>{lk.label("rider_status", r.status) || r.status}</span>
            </div>
          </div>
          <div className="rv-meta">
            {meta.map(([k, v]) => (
              <div key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        </div>
      </div>

      <div className="rv-tiles">
        {tiles.map(([v, l, c]) => (
          <div className="rv-tile" key={l}>
            <b className={c ? `rv-c-${c}` : ""}>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="rv-tabs" role="tablist">
        {[["assignments", "Assignments"], ["duty", "Duty log"], ["perf", "Performance"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`rv-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "assignments" && <Assignments riderId={riderId} range={range} />}
      {tab === "duty" && <DutyLog riderId={riderId} range={range} />}
      {tab === "perf" && <Performance riderId={riderId} range={range} />}

      {phone && <PhoneModal rider={r} canRelease={canRelease} onClose={() => setPhone(false)} />}
      {loc && <LastLocationModal riderId={riderId} name={r.name} onClose={() => setLoc(false)} />}
    </div>
  );
}
