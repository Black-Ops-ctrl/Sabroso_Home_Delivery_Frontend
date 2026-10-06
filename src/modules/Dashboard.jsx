import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import Icon from "../config/icons";
import { useApi } from "../hooks/useApi";
import { dashboardApi } from "../services/api";
import { money, num } from "../config/format";
import { tierCls } from "../config/loyalty";
import { useTheme } from "../context/ThemeContext";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const dayLabel = (s) => new Date(`${s}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const SRC = { TIER: ["Tier", "#7c3aed"], POINTS: ["Points", "#f59e0b"], CAMPAIGN: ["Campaign", "#0891b2"], REFERRAL: ["Referral", "#16a34a"], MANUAL: ["Manual", "#94a3b8"] };
const TIER_COL = { basic: "#94a3b8", silver: "#64748b", gold: "#f59e0b", platinum: "#7c3aed" };
const discTxt = (c) => (c.discount_type === "Rs" ? `Rs ${num(c.discount_value)} off` : `${num(c.discount_value)}% off`);
const scope = (c) => (c.applies_to === "CATEGORIES" ? "Selected categories" : c.applies_to === "ITEMS" ? "Selected items" : "Entire menu");

const Stat = ({ label, value, sub, grad }) => (
  <div className="db-stat" style={{ background: grad }}>
    <div className="db-stat__l">{label}</div>
    <div className="db-stat__v">{value}</div>
    <div className="db-stat__s">{sub}</div>
  </div>
);

export default function Dashboard() {
  const { theme } = useTheme();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const { data, loading, error } = useApi(() => dashboardApi.overview(from, to), [from, to], ["orders", "riders", "cards", "loyalty_ledger", "tiers", "campaigns"]);

  const head = (
    <>
      <div className="ord-head"><h1>Dashboard</h1></div>
      <div className="db-bar">
        <div className="date-filters">
          <input type="date" className="input" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value || today())} />
          <span className="date-sep">–</span>
          <input type="date" className="input" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value || today())} />
          <button className="iconbtn" title="Back to today" aria-label="Back to today" onClick={() => { setFrom(today()); setTo(today()); }}>
            <Icon name="x" />
          </button>
        </div>
      </div>
    </>
  );

  if (loading && !data) return <>{head}<div className="empty" style={{ padding: 40 }}>Loading…</div></>;
  if (error) return <>{head}<div className="empty" style={{ padding: 40 }}>{error}</div></>;
  const d = data;
  const s = d.stats;
  const chart = d.buckets.map((b) => ({ label: d.one_day ? hourLabel(b.k) : dayLabel(b.k), Orders: b.orders, "New members": b.members }));
  const maxTier = Math.max(1, ...d.tiers.map((t) => t.members));
  const discTotal = d.discounts.reduce((t, x) => t + x.orders, 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <>
      {head}
      <div className="db-stats">
        <Stat label="Revenue" value={money(s.revenue)} sub={`${num(s.orders)} orders · avg ${money(s.avg_basket)}`} grad="var(--t-db-revenue)" />
        <Stat label="Live orders" value={num(s.live)} sub={`${num(s.out_for_delivery)} out for delivery · ${num(s.assigned)} assigned`} grad="var(--t-db-live)" />
        <Stat label="Delivered" value={num(s.delivered)} sub={`${s.avg_delivery_min != null ? `avg delivery ${s.avg_delivery_min} min · ` : ""}${num(s.cancelled)} cancelled`} grad="var(--t-db-delivered)" />
        <Stat label="Riders on delivery" value={`${num(s.riders_on_delivery)} / ${num(s.riders_total)}`} sub={`${num(s.riders_available)} available · ${num(s.riders_order_assigned)} order assigned`} grad="var(--t-db-riders)" />
      </div>

      <div className="db-grid">
        <div className="db-card">
          <div className="db-h"><h3>📈 Orders &amp; new members</h3><small>{d.one_day ? "by hour" : "by day"}</small></div>
          <div className="db-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(124,58,237,.06)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Orders" fill={theme["db-orders"]} radius={[5, 5, 0, 0]} maxBarSize={22} />
                <Bar dataKey="New members" fill={theme["db-new-members"]} radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="db-card">
          <div className="db-h"><h3>🏅 Members by tier</h3></div>
          {d.tiers.length ? (
            <div className="db-tiers">
              {d.tiers.map((t) => (
                <div key={t.id}>
                  <b style={{ height: `${Math.max(6, (t.members / maxTier) * 140)}px`, background: TIER_COL[t.card] || "#7c3aed" }} />
                  <span>{t.name}</span>
                  <small>{num(t.members)}</small>
                </div>
              ))}
            </div>
          ) : <div className="empty">No tiers.</div>}
        </div>

        <div className="db-card">
          <div className="db-h"><h3>🎟️ Campaigns running</h3><small>{d.campaigns.filter((c) => c.state === "Running").length} running · {d.campaigns.filter((c) => c.state === "Scheduled").length} scheduled</small></div>
          <div className="db-scroll">
            {d.campaigns.length ? d.campaigns.map((c) => (
              <div className="db-camp" key={c.id}>
                <div className="db-camp__t"><b>{c.name}</b><span className={`badge ${c.state === "Running" ? "b-green" : "b-blue"}`}>{c.state}</span></div>
                <div className="sub">{discTxt(c)} · {scope(c)} · used {num(c.used)} time{c.used === 1 ? "" : "s"}</div>
              </div>
            )) : <div className="empty">No running campaigns.</div>}
          </div>
        </div>

        <div className="db-card">
          <div className="db-h"><h3>👑 Top members</h3><small>top 10 · by lifetime points</small></div>
          <div className="dash-top-scroll">
          {d.top_members.length ? d.top_members.map((m, i) => (
            <div className="db-li" key={m.id}>
              <span className="db-rank">{i + 1}</span>
              <div className="db-li__n"><b title={m.name || ""}>{m.name || "—"}</b><small>{m.code}</small></div>
              {m.tier_name && <span className={`badge ${tierCls(m.tier_card)}`}>{m.tier_name}</span>}
              <b className="db-li__v">{num(m.lifetime)} pts</b>
            </div>
          )) : <div className="empty">No members yet</div>}
          </div>
        </div>

        <div className="db-card">
          <div className="db-h"><h3>🎁 Discounts used</h3><small>{num(discTotal)} orders</small></div>
          {d.discounts.length ? (
            <div className="db-donut">
              <div className="db-donut__c">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.discounts} dataKey="orders" nameKey="source" innerRadius="62%" outerRadius="100%" stroke="none">
                      {d.discounts.map((x) => <Cell key={x.source} fill={(SRC[x.source] || ["", "#94a3b8"])[1]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="db-legend">
                {d.discounts.map((x) => (
                  <div key={x.source}><i style={{ background: (SRC[x.source] || ["", "#94a3b8"])[1] }} /><span>{(SRC[x.source] || [x.source])[0]}</span><b>{pct(x.orders, discTotal)}%</b></div>
                ))}
              </div>
            </div>
          ) : <div className="empty">No discounts in these dates.</div>}
        </div>

        <div className="db-card">
          <div className="db-h"><h3>🤝 Referrals</h3></div>
          <div className="db-big">{num(d.referrals.referred)}</div>
          <div className="sub">new customers came by referral</div>
          <div className="db-prog"><i style={{ width: `${pct(d.referrals.came_back, d.referrals.referred)}%` }} /></div>
          <div className="sub">{pct(d.referrals.came_back, d.referrals.referred)}% placed a 2nd order</div>
        </div>
      </div>
    </>
  );
}
