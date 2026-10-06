import { useEffect, useState } from "react";
import PageHead from "../../components/common/PageHead";
import Icon from "../../config/icons";
import { useApi } from "../../hooks/useApi";
import { settingsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { amount } from "../../config/inputs";

const MOD = "Delivery Settings";
const s = (v) => (v === null || v === undefined ? "" : String(v));

function check(f) {
  if (f.max_km === "") return "Max delivery distance is required";
  const max = Number(f.max_km);
  if (!(max > 0)) return "Max delivery distance must be more than 0 km";
  if (!f.slabs.length) return "Add at least one slab";
  const rows = f.slabs.map((x) => ({ from: x.from === "" ? NaN : Number(x.from), to: x.to === "" ? NaN : Number(x.to), charge: x.charge === "" ? NaN : Number(x.charge) }));
  for (const [i, r] of rows.entries()) {
    if (Number.isNaN(r.from)) return `Slab ${i + 1}: From (km) is required`;
    if (Number.isNaN(r.to)) return `Slab ${i + 1}: To (km) is required`;
    if (Number.isNaN(r.charge)) return `Slab ${i + 1}: Charges are required`;
    if (r.to <= r.from) return `Slab ${i + 1}: To (km) must be more than From (km)`;
  }
  const sorted = [...rows].sort((a, b) => a.from - b.from);
  if (sorted[0].from !== 0) return "The first slab must start from 0 km";
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].from < sorted[i - 1].to) return `Slabs ${sorted[i - 1].from}–${sorted[i - 1].to} km and ${sorted[i].from}–${sorted[i].to} km overlap`;
    if (sorted[i].from > sorted[i - 1].to) return `There is a gap between ${sorted[i - 1].to} km and ${sorted[i].from} km`;
  }
  if (sorted[sorted.length - 1].to < max) return `Slabs must cover up to the max distance (${max} km)`;
  return null;
}

export default function DeliverySettings() {
  const { can } = useAuth();
  const toast = useToast();
  const canEdit = can(MOD, "edit");
  const { data, loading, error, reload } = useApi(() => settingsApi.delivery(), [], ["app_settings"]);
  const [f, setF] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data || dirty) return;
    setF({ max_km: s(data.max_km), slabs: (data.slabs || []).map((x, i) => ({ k: i, from: s(x.from), to: s(x.to), charge: s(x.charge) })) });
  }, [data, dirty]);

  const change = (fn) => { setDirty(true); setF((x) => fn(x)); };
  const setSlab = (k, key, v) => change((x) => ({ ...x, slabs: x.slabs.map((r) => (r.k === k ? { ...r, [key]: v } : r)) }));
  const addSlab = () => change((x) => {
    const last = x.slabs[x.slabs.length - 1];
    return { ...x, slabs: [...x.slabs, { k: Date.now(), from: last ? last.to : "0", to: "", charge: "" }] };
  });
  const removeSlab = (k) => change((x) => ({ ...x, slabs: x.slabs.filter((r) => r.k !== k) }));

  const save = async () => {
    const err = check(f);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      await settingsApi.saveDelivery({ max_km: Number(f.max_km), slabs: f.slabs.map((r) => ({ from: Number(r.from), to: Number(r.to), charge: Number(r.charge) })) });
      toast.success("Delivery settings saved");
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
      <PageHead title="Delivery Settings">
        {canEdit && (
          <button className="btn" onClick={save} disabled={busy || !f}>
            <Icon name="check" />
            <span>{busy ? "Saving…" : "Save changes"}</span>
          </button>
        )}
      </PageHead>
      {loading && !f && <div className="empty" style={{ padding: 40 }}>Loading…</div>}
      {error && !f && <div className="empty" style={{ padding: 40 }}>{error}</div>}
      {f && (
        <div className="dset">
          <div className="card dset-max">
            <div className="field">
              <label>Max delivery distance (km)</label>
              <input className="input" inputMode="decimal" placeholder="Enter max distance" value={f.max_km} disabled={!canEdit}
                onChange={(e) => change((x) => ({ ...x, max_km: amount(e.target.value) }))} />
            </div>
          </div>
          <div className="card dset-slabs">
            <div className="cardhead">
              <h3 className="sec">Delivery charges</h3>
              {canEdit && (
                <button className="btn btn--sm" onClick={addSlab}><Icon name="plus" /><span>Add slab</span></button>
              )}
            </div>
            <div className="tablewrap">
              <table className="ord-table">
                <thead>
                  <tr><th>From (km)</th><th>To (km)</th><th>Charges (Rs)</th>{canEdit && <th className="right">Actions</th>}</tr>
                </thead>
                <tbody>
                  {f.slabs.length ? f.slabs.map((r) => (
                    <tr key={r.k}>
                      <td><input className="input" inputMode="decimal" aria-label="From (km)" placeholder="Enter km" value={r.from} disabled={!canEdit} onChange={(e) => setSlab(r.k, "from", amount(e.target.value))} /></td>
                      <td><input className="input" inputMode="decimal" aria-label="To (km)" placeholder="Enter km" value={r.to} disabled={!canEdit} onChange={(e) => setSlab(r.k, "to", amount(e.target.value))} /></td>
                      <td><input className="input" inputMode="decimal" aria-label="Charges (Rs)" placeholder="Enter charges" value={r.charge} disabled={!canEdit} onChange={(e) => setSlab(r.k, "charge", amount(e.target.value))} /></td>
                      {canEdit && (
                        <td className="right">
                          <div className="actions">
                            <button className="iconbtn del" aria-label="Remove slab" onClick={() => removeSlab(r.k)}><Icon name="trash" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr><td colSpan={canEdit ? 4 : 3}><div className="empty">No slabs yet</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
