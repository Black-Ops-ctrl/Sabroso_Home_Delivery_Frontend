import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { loyaltyApi, tiersApi, itemsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Switch, Seg, Chips } from "../../components/loyalty/LoyaltyControls";
import { channels } from "../../config/orders";
import { useLookups } from "../../context/LookupsContext";
import { amount } from "../../config/inputs";

const MOD = "Loyalty Settings";
const s = (v) => (v === null || v === undefined ? "" : String(v));

const Group = ({ icon, title, sub, children, wide }) => (
  <div className={`ls-group ${wide ? "wide" : ""}`}>
    <h4>{icon} {title} {sub && <span>— {sub}</span>}</h4>
    {children}
  </div>
);

const Num = ({ value, onChange, placeholder, disabled, label }) => (
  <input
    className="input"
    inputMode="decimal"
    aria-label={label}
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    onChange={(e) => onChange(amount(e.target.value))}
  />
);

export default function LoyaltySettings() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can(MOD, "edit");
  const { data, loading, error, reload } = useApi(
    () => Promise.all([loyaltyApi.settings(), tiersApi.list(), itemsApi.list()]),
    []
  );
  useLookups();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("points");
  const [settings, tiers, items] = data || [null, [], []];

  const init = () => {
    if (!settings) return;
    const P = settings.points, R = settings.referral;
    setF({
      points: { ...P, earn_pct: s(P.earn_pct), redeem_points: s(P.redeem_points), redeem_value: s(P.redeem_value),
        min_redeem: s(P.min_redeem), max_redeem_pct: s(P.max_redeem_pct) },
      tiers: { ...settings.tiers },
      referral: { ...R, referrer_points: s(R.referrer_points), discount_value: s(R.discount_value), max_discount: s(R.max_discount) },
      product_points: { ...settings.product_points },
      membership: { ...settings.membership, start_tier_id: s(settings.membership.start_tier_id) },
    });
  };
  useEffect(init, [settings]);
  const reset = () => {
    init();
    toast.success("Changes discarded");
  };

  const set = (sec, k, v) => setF((x) => ({ ...x, [sec]: { ...x[sec], [k]: v } }));

  const save = async () => {
    setBusy(true);
    try {
      await loyaltyApi.saveSettings(f);
      toast.success("Loyalty settings saved");
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!error && !f))
    return (
      <>
        <div className="ord-head"><h1>Loyalty Settings</h1></div>
        <div className="empty" style={{ padding: 40 }}>Loading…</div>
      </>
    );
  if (error)
    return (
      <>
        <div className="ord-head"><h1>Loyalty Settings</h1></div>
        <div className="empty" style={{ padding: 40 }}>{error}</div>
      </>
    );

  const P = f.points, R = f.referral, T = f.tiers, M = f.membership, PP = f.product_points;
  const multItems = (items || []).filter((i) => Number(i.points) > 0 || Number(i.points_multiplier) > 1);
  const dis = !canEdit;
  const sortedTiers = [...(tiers || [])].sort((a, b) => a.threshold - b.threshold);

  const TABS = [
    { key: "points", icon: "⭐", name: "Points", on: P.enabled, toggle: (v) => set("points", "enabled", v) },
    { key: "tiers", icon: "🏅", name: "Tiers", on: T.discount_option || T.auto_upgrade },
    { key: "referral", icon: "🤝", name: "Referral", on: R.enabled, toggle: (v) => set("referral", "enabled", v) },
    { key: "product", icon: "🍗", name: "Product points", on: PP.enabled, toggle: (v) => set("product_points", "enabled", v) },
    { key: "membership", icon: "🪪", name: "Membership", on: M.auto_join },
  ];
  const cur = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <>
      <div className="ord-head">
        <h1>Loyalty Settings</h1>
      </div>

      <div className="tabs ls-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${cur.key === t.key ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.name} <span className="tab__count">({t.on ? "ON" : "OFF"})</span>
          </button>
        ))}
      </div>

      <section className="ls-panel">
        <div className="ls-ph">
          <div>
            <h2>{cur.icon} {cur.name}</h2>
          </div>
          {cur.toggle && <Switch on={cur.on} onChange={cur.toggle} label={`${cur.name} on / off`} disabled={dis} />}
        </div>

        <div className={`ls-body ${cur.toggle && !cur.on ? "off" : ""}`}>
          {cur.key === "points" && (
            <div className="ls-grid">
              <Group icon="💰" title="Earning">
                <div className="field"><label>Points on bill (%)</label>
                  <Num label="Points on bill (%)" value={P.earn_pct} placeholder="Enter %" disabled={dis} onChange={(v) => set("points", "earn_pct", v)} /></div>
              </Group>
              <Group icon="🎁" title="Redeeming">
                <div className="ly-rule">
                  <Num label="Redeem points" value={P.redeem_points} placeholder="Enter points" disabled={dis} onChange={(v) => set("points", "redeem_points", v)} />
                  <span>points = Rs</span>
                  <Num label="Redeem value (Rs)" value={P.redeem_value} placeholder="Enter amount" disabled={dis} onChange={(v) => set("points", "redeem_value", v)} />
                </div>
                <div className="field-row">
                  <div className="field"><label>Min points to redeem</label>
                    <Num label="Min points to redeem" value={P.min_redeem} placeholder="Enter points" disabled={dis} step="1" onChange={(v) => set("points", "min_redeem", v)} /></div>
                  <div className="field"><label>Max bill paid by points (%)</label>
                    <Num label="Max bill paid by points" value={P.max_redeem_pct} placeholder="Enter %" disabled={dis} onChange={(v) => set("points", "max_redeem_pct", v)} /></div>
                </div>
              </Group>
            </div>
          )}

          {cur.key === "tiers" && (
            <div className="ls-grid">
              <Group icon="🏷️" title="On orders">
                <div className="rowline"><span>Show tier discount as an option on orders</span>
                  <Switch on={T.discount_option} label="Tier discount option" disabled={dis} onChange={(v) => set("tiers", "discount_option", v)} /></div>
                <div className="rowline"><span>Auto-upgrade tier when points reach threshold</span>
                  <Switch on={T.auto_upgrade} label="Auto-upgrade tier" disabled={dis} onChange={(v) => set("tiers", "auto_upgrade", v)} /></div>
                <div className="rowline"><span>Tier discount works on</span>
                  <Seg value={T.discount_mode || "BILL"} options={[["BILL", "Whole bill"], ["ITEM", "Item-wise"]]} label="Tier discount works on" disabled={dis}
                    onChange={(v) => set("tiers", "discount_mode", v)} /></div>
              </Group>
              <Group icon="🏅" title="Tiers" sub={`${sortedTiers.length} tiers`}>
                {sortedTiers.map((t) => (
                  <div className="rowline" key={t.id}><span>{t.name}</span>
                    <b>{Number(t.threshold).toLocaleString("en-US")} pts · {t.discount_type === "Rs" ? `Rs ${Number(t.discount)}` : `${Number(t.discount)}%`}</b></div>
                ))}
                <div className="rowline"><span /><Link className="ly-link" to="/tiers">Edit on Tiers page →</Link></div>
              </Group>
            </div>
          )}

          {cur.key === "referral" && (
            <div className="ls-grid">
              <Group icon="🎉" title="Referrer reward">
                <div className="field"><label>Referrer gets (points)</label>
                  <Num label="Referrer gets points" value={R.referrer_points} placeholder="Enter points" disabled={dis} step="1" onChange={(v) => set("referral", "referrer_points", v)} /></div>
                <div className="field"><label>Referrer identified by</label>
                  <input className="input" value="Phone number or card ID" disabled readOnly /></div>
              </Group>
              <Group icon="🆕" title="New customer discount">
                <div className="field"><label>Discount</label>
                  <div className="ly-inrow">
                    <Seg value={R.discount_type} label="Referral discount type" disabled={dis} onChange={(v) => set("referral", "discount_type", v)} />
                    <Num label="New customer discount" value={R.discount_value} placeholder={R.discount_type === "Rs" ? "Enter amount" : "Enter %"} disabled={dis} onChange={(v) => set("referral", "discount_value", v)} />
                  </div></div>
                <div className="field"><label>Max new-customer discount (Rs)</label>
                  <Num label="Max new-customer discount" value={R.max_discount} placeholder={R.discount_type === "Rs" ? "" : "Enter max discount"} disabled={dis || R.discount_type === "Rs"} onChange={(v) => set("referral", "max_discount", v)} /></div>
              </Group>
            </div>
          )}

          {cur.key === "product" && (
            <div className="ls-grid">
              <Group icon="🍗" title="Items with points" wide>
                {multItems.length ? multItems.map((i) => (
                  <div className="rowline" key={i.id}><span>{i.name}</span>
                    <b>{Number(i.points) || 0} pts · {Number(i.points_multiplier) || 1}x{Number(i.points_multiplier) > 1 && i.multiplier_until ? ` · until ${String(i.multiplier_until).slice(0, 10)}` : ""}</b></div>
                )) : <div className="sub">No items have points yet.</div>}
                <div className="rowline"><span /><Link className="ly-link" to="/items">Edit on Items page →</Link></div>
              </Group>
            </div>
          )}

          {cur.key === "membership" && (
            <div className="ls-grid">
              <Group icon="🪪" title="Joining">
                <div className="rowline"><span>Auto-join on first delivered order</span>
                  <Switch on={M.auto_join} label="Auto-join" disabled={dis} onChange={(v) => set("membership", "auto_join", v)} /></div>
                <div className="rowline" style={{ marginTop: 12 }}><span>New members start in</span>
                  <b>{sortedTiers[0] ? sortedTiers[0].name : "—"}</b></div>
              </Group>
              <Group icon="📡" title="Channels">
                <Chips value={M.channels || []} options={channels()} disabled={dis} onChange={(v) => set("membership", "channels", v)} />
              </Group>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="ls-save">
            <button className="btn btn--ghost" onClick={reset} disabled={busy}>Cancel</button>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
          </div>
        )}
      </section>
    </>
  );
}
