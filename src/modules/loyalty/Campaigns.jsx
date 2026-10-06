import { useMemo, useState } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import MultiPicker from "../../components/common/MultiPicker";
import { Switch, Seg, Chips } from "../../components/loyalty/LoyaltyControls";
import Icon from "../../config/icons";
import { money } from "../../config/format";
import { discText } from "../../config/loyalty";
import { channels } from "../../config/orders";
import { useLookups } from "../../context/LookupsContext";
import { usePaged } from "../../components/common/Pager";
import { amount } from "../../config/inputs";
import { useApi } from "../../hooks/useApi";
import { campaignsApi, categoriesApi, itemsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

const MOD = "Campaigns";
const TABS = ["All", "Running", "Scheduled", "Ended", "Paused"];
const STATE_CLS = { Running: "b-green", Scheduled: "b-blue", Ended: "b-grey", Paused: "b-amber" };
const DAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]];
const APPLIES = [["ALL", "Entire menu"], ["CATEGORIES", "Categories"], ["ITEMS", "Items"]];

const toLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v) => (v ? new Date(v).toISOString() : null);
const dShort = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : "");
const hm = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};
const dayText = (days) => {
  const d = (days || []).map(Number);
  if (!d.length || d.length === 7) return "";
  return DAYS.filter(([v]) => d.includes(v)).map(([, l]) => l).join(", ");
};
export function periodText(c) {
  const parts = [];
  if (c.starts_at || c.ends_at) parts.push(`${c.starts_at ? dShort(c.starts_at) : "Now"} – ${c.ends_at ? dShort(c.ends_at) : "No end"}`);
  const dt = dayText(c.days);
  if (dt) parts.push(`Every ${dt}`);
  if (c.time_from && c.time_to) parts.push(`${hm(c.time_from.slice(0, 5))}–${hm(c.time_to.slice(0, 5))}`);
  return parts.join(" · ") || "Always";
}

const blank = () => ({
  mode: "new", name: "", discount_type: "%", discount_value: "", max_discount: "", applies_to: "ALL",
  category_ids: [], item_ids: [], min_order: "", starts_at: "", ends_at: "",
  days: DAYS.map(([v]) => v), time_from: "", time_to: "", channels: channels(), active: true,
});

export default function Campaigns() {
  const toast = useToast();
  const { can } = useAuth();
  const search = usePageSearch("campaigns");
  useLookups();
  const CHANNELS = channels();
  const { data, loading, error, reload } = useApi(
    () => Promise.all([campaignsApi.list(), categoriesApi.list(), itemsApi.list()]),
    [],
    ["campaigns", "categories", "items", "orders"]
  );
  const [rows, categories, items] = data || [[], [], []];
  const [tab, setTab] = useState("All");
  const [form, setForm] = useState(null);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const catName = (id) => (categories.find((c) => c.id === Number(id)) || {}).name;
  const itemName = (id) => (items.find((c) => c.id === Number(id)) || {}).name;
  const appliesText = (c) =>
    c.applies_to === "CATEGORIES"
      ? (c.category_ids || []).map(catName).filter(Boolean).join(", ") + ((c.category_ids || []).length ? " (category)" : "")
      : c.applies_to === "ITEMS"
      ? (c.item_ids || []).length === 1 ? itemName(c.item_ids[0]) : `${(c.item_ids || []).length} items`
      : "Entire menu";
  const chText = (c) => (!(c.channels || []).length || c.channels.length === CHANNELS.length ? "All" : c.channels.join(", "));

  const q = search.query.toLowerCase();
  const shown = useMemo(
    () => (rows || []).filter((c) => (tab === "All" || c.state === tab) && (!q || c.name.toLowerCase().includes(q))),
    [rows, tab, q]
  );
  const paged = usePaged(shown, `${tab}|${q}`);
  const count = (t) => (t === "All" ? rows.length : rows.filter((c) => c.state === t).length);

  const openEdit = (c) =>
    setForm({
      mode: "edit", id: c.id, name: c.name, discount_type: c.discount_type, discount_value: String(Number(c.discount_value)),
      max_discount: c.max_discount != null ? String(Number(c.max_discount)) : "", applies_to: c.applies_to,
      category_ids: (c.category_ids || []).map(Number), item_ids: (c.item_ids || []).map(Number),
      min_order: c.min_order != null ? String(Number(c.min_order)) : "", starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at),
      days: (c.days || []).length ? c.days.map(Number) : DAYS.map(([v]) => v),
      time_from: c.time_from ? c.time_from.slice(0, 5) : "", time_to: c.time_to ? c.time_to.slice(0, 5) : "",
      channels: (c.channels || []).length ? c.channels : [...CHANNELS], active: c.status !== "Paused",
    });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const f = form;
    const err = !f.name.trim()
      ? "Campaign name is required"
      : !(Number(f.discount_value) > 0)
      ? "Discount is required"
      : f.discount_type === "%" && Number(f.discount_value) > 100
      ? "Discount % cannot be more than 100"
      : f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)
      ? "End must be after start"
      : (f.time_from && !f.time_to) || (!f.time_from && f.time_to)
      ? "Enter both times or leave both empty"
      : !f.days.length
      ? "Pick at least one day"
      : !f.channels.length
      ? "Pick at least one channel"
      : f.applies_to === "CATEGORIES" && !f.category_ids.length
      ? "Pick at least one category"
      : f.applies_to === "ITEMS" && !f.item_ids.length
      ? "Pick at least one item"
      : null;
    if (err) return toast.error(err);
    const body = {
      name: f.name.trim(), discount_type: f.discount_type, discount_value: Number(f.discount_value),
      max_discount: f.discount_type === "%" && f.max_discount !== "" ? Number(f.max_discount) : null,
      applies_to: f.applies_to,
      category_ids: f.applies_to === "CATEGORIES" ? f.category_ids : [],
      item_ids: f.applies_to === "ITEMS" ? f.item_ids : [],
      min_order: f.min_order !== "" ? Number(f.min_order) : null,
      starts_at: fromLocal(f.starts_at), ends_at: fromLocal(f.ends_at),
      days: f.days.length === 7 ? [] : f.days,
      time_from: f.time_from || null, time_to: f.time_to || null,
      channels: f.channels.length === CHANNELS.length ? [] : f.channels,
      status: f.active ? "Active" : "Paused",
    };
    setBusy(true);
    try {
      if (f.mode === "edit") await campaignsApi.update(f.id, body);
      else await campaignsApi.create(body);
      toast.success(`Campaign ${f.mode === "edit" ? "updated" : "added"}`);
      setForm(null);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await campaignsApi.remove(del.id);
      toast.success("Campaign deleted");
      setDel(null);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className="ord-head">
      <h1>Campaigns</h1>
      <div className="ord-head__actions">
        {search.query && (
          <span className="search-chip">
            "{search.query}"
            <button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button>
          </span>
        )}
        <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
        {can(MOD, "add") && (
          <button className="btn" onClick={() => setForm(blank())}>
            <Icon name="plus" />
            <span>Add campaign</span>
          </button>
        )}
      </div>
    </div>
  );

  if (loading || error)
    return (
      <>
        {head}
        <div className="empty" style={{ padding: 40 }}>{error || "Loading campaigns…"}</div>
      </>
    );

  return (
    <>
      {head}
      <div className="ord-tools">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
              {t} <span className="tab__count">({count(t)})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tablewrap">
        <table className="ord-table cb-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Discount</th>
              <th>Applies to</th>
              <th>Period</th>
              <th>Channels</th>
              <th>Orders</th>
              <th>Discount given</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.length ? (
              paged.rows.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.name}</td>
                  <td>
                    {discText(c.discount_type, c.discount_value)}
                    {c.discount_type === "Rs" ? " off" : ""}
                    {c.max_discount != null && c.discount_type === "%" && <span className="sub"> (max {money(c.max_discount)})</span>}
                  </td>
                  <td>{appliesText(c) || "—"}</td>
                  <td>{periodText(c)}</td>
                  <td>{chText(c)}</td>
                  <td>{Number(c.orders_count) || "—"}</td>
                  <td>{Number(c.discount_given) ? money(c.discount_given) : "—"}</td>
                  <td><span className={`badge ${STATE_CLS[c.state] || "b-grey"}`}>{c.state === "Running" ? "● " : ""}{c.state}</span></td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn view" onClick={() => setView(c)} title="View" aria-label="View campaign"><Icon name="eye" /></button>
                      {can(MOD, "edit") && (
                        <button className="iconbtn edit" onClick={() => openEdit(c)} title="Edit" aria-label="Edit campaign"><Icon name="edit" /></button>
                      )}
                      {can(MOD, "delete") && (
                        <button className="iconbtn del" onClick={() => setDel(c)} title="Delete" aria-label="Delete campaign"><Icon name="trash" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={9}><div className="empty">{rows.length ? "No campaigns match." : "No campaigns yet. Add one."}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {paged.pager}

      {form && (
        <Modal
          title={form.mode === "edit" ? "Edit campaign" : "Add campaign"}
          submit={form.mode === "edit" ? "Save changes" : "Save campaign"}
          wide
          cls="ly-modal"
          busy={busy}
          onClose={() => setForm(null)}
          onSubmit={save}
        >
          <div className="field">
            <label>Campaign name</label>
            <input placeholder="Enter campaign name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Discount</label>
              <div className="ly-inrow">
                <Seg value={form.discount_type} label="Discount type" onChange={(v) => set("discount_type", v)} />
                <input placeholder={form.discount_type === "Rs" ? "Enter amount" : "Enter %"} className="input" inputMode="decimal" aria-label="Discount value" value={form.discount_value}
                  onChange={(e) => set("discount_value", amount(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label>Max discount per order (Rs)</label>
              <input className="input" inputMode="decimal" value={form.max_discount} disabled={form.discount_type === "Rs"}
                onChange={(e) => set("max_discount", amount(e.target.value))} placeholder={form.discount_type === "Rs" ? "" : "Enter max discount"} />
            </div>
          </div>
          <div className="field">
            <label>Applies to</label>
            <Seg value={form.applies_to} options={APPLIES} label="Applies to" onChange={(v) => set("applies_to", v)} />
          </div>
          {form.applies_to === "CATEGORIES" && (
            <MultiPicker label="Categories" value={form.category_ids} placeholder="Enter category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set("category_ids", v)} />
          )}
          {form.applies_to === "ITEMS" && (
            <MultiPicker label="Items" value={form.item_ids} placeholder="Enter item"
              options={items.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set("item_ids", v)} />
          )}
          <div className="field-row">
            <div className="field">
              <label>Starts</label>
              <input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </div>
            <div className="field">
              <label>Ends</label>
              <input className="input" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Only on these days</label>
              <Chips value={form.days} options={DAYS} onChange={(v) => set("days", v)} />
            </div>
            <div className="field">
              <label>Only between</label>
              <div className="ly-inrow">
                <input className="input" type="time" aria-label="From time" value={form.time_from} onChange={(e) => set("time_from", e.target.value)} />
                <span>–</span>
                <input className="input" type="time" aria-label="To time" value={form.time_to} onChange={(e) => set("time_to", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Min order amount (Rs)</label>
              <input className="input" inputMode="decimal" value={form.min_order} onChange={(e) => set("min_order", amount(e.target.value))} placeholder="Enter min order amount" />
            </div>
            <div className="field">
              <label>Channels</label>
              <Chips value={form.channels} options={CHANNELS} onChange={(v) => set("channels", v)} />
            </div>
          </div>
          <div className="rowline">
            <span><b>Active</b></span>
            <Switch on={form.active} label="Active" onChange={(v) => set("active", v)} />
          </div>
        </Modal>
      )}

      {view && (
        <Modal title={view.name} submit="Close" hideCancel onClose={() => setView(null)} onSubmit={() => setView(null)}>
          <div className="dl ly-dl">
            <div><span className="dl-k">Status</span><span className="dl-v"><span className={`badge ${STATE_CLS[view.state]}`}>{view.state}</span></span></div>
            <div><span className="dl-k">Discount</span><span className="dl-v">{discText(view.discount_type, view.discount_value)}{view.max_discount != null && view.discount_type === "%" ? ` · max ${money(view.max_discount)}` : ""}</span></div>
            <div><span className="dl-k">Applies to</span><span className="dl-v">{appliesText(view)}</span></div>
            <div><span className="dl-k">Min order</span><span className="dl-v">{view.min_order != null ? money(view.min_order) : "None"}</span></div>
            <div><span className="dl-k">Period</span><span className="dl-v">{periodText(view)}</span></div>
            <div><span className="dl-k">Channels</span><span className="dl-v">{chText(view)}</span></div>
            <div><span className="dl-k">Orders</span><span className="dl-v">{Number(view.orders_count) || 0}</span></div>
            <div><span className="dl-k">Discount given</span><span className="dl-v">{money(view.discount_given)}</span></div>
          </div>
        </Modal>
      )}

      {del && (
        <ConfirmDelete what="campaign" note="The campaign will be removed. Orders that used it keep their discount." busy={busy}
          onClose={() => setDel(null)} onConfirm={doDelete} />
      )}
    </>
  );
}
