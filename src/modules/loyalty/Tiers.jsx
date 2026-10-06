import { useState, useMemo } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import Icon from "../../config/icons";
import { pad } from "../../config/format";
import { tierCls, tierRange, discText } from "../../config/loyalty";
import { Seg } from "../../components/loyalty/LoyaltyControls";
import { LoyaltyCard, StyleMini } from "../../components/loyalty/LoyaltyCards";
import { usePaged } from "../../components/common/Pager";
import { useLookups } from "../../context/LookupsContext";
import { amount, wholeNumber } from "../../config/inputs";
import { useApi } from "../../hooks/useApi";
import { tiersApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

export default function Tiers() {
  const toast = useToast();
  const { can } = useAuth();
  const lk = useLookups();
  const styles = lk.list("card_style");
  const { data, loading, error, reload } = useApi(() => tiersApi.list(), [], ["tiers", "cards"]);
  const tiers = data || [];
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const [form, setFormRaw] = useState(null);
  const setForm = (v) => {
    
    setFormRaw(v);
  };
  const setT = (k, v) => {
    
    setFormRaw((f) => ({ ...f, tier: { ...f.tier, [k]: v } }));
  };
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = usePageSearch("tiers");
  const sorted = useMemo(() => [...tiers].sort((a, b) => a.threshold - b.threshold), [tiers]);
  const text = search.query.toLowerCase();
  const shown = useMemo(() => (text ? sorted.filter((t) => `${t.name} TIER-${pad(t.id)}`.toLowerCase().includes(text)) : sorted), [sorted, text]);
  const paged = usePaged(shown, text);

  const save = async () => {
    const t = form.tier;
    const err = !String(t.name || "").trim()
      ? "Tier name is required"
      : String(t.threshold ?? "").trim() === ""
      ? "Threshold points are required"
      : t.discount_type !== "Rs" && Number(t.discount) > 100
      ? "Tier discount % cannot be more than 100"
      : !t.card
      ? "Please select a card style"
      : null;
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: form.tier.name.trim(),
        threshold: Number(form.tier.threshold) || 0,
        discount: Number(form.tier.discount) || 0,
        discount_type: form.tier.discount_type === "Rs" ? "Rs" : "%",
        earn: Number(form.tier.earn) || 1,
        card: form.tier.card,
        perks: (form.tier.perksText || "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      };
      if (form.mode === "edit") {
        await tiersApi.update(form.tier.id, body);
        toast.success("Tier updated");
      } else {
        await tiersApi.create(body);
        toast.success("Tier added");
      }
      setForm(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await tiersApi.remove(del.id);
      toast.success("Tier deleted");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <>
        <div className="ord-head"><h1>Tiers</h1></div>
        <div className="empty" style={{ padding: 40 }}>Loading tiers…</div>
      </>
    );
  if (error)
    return (
      <>
        <div className="ord-head"><h1>Tiers</h1></div>
        <div className="empty" style={{ padding: 40 }}>{error}</div>
      </>
    );

  return (
    <>
      <div className="ord-head">
        <h1>Tiers</h1>
        <div className="ord-head__actions">
          {can("Tiers", "add") && (
            <button
              className="btn"
              onClick={() =>
                setForm({
                  mode: "new",
                  tier: { name: "", threshold: "", discount: "", discount_type: "%", earn: 1, card: styles[0]?.code || "", perksText: "" },
                })
              }
            >
              <Icon name="plus" />
              <span>Add tier</span>
            </button>
          )}
        </div>
      </div>

      <div className="ord-tools list-tools">
        <div />
        <div className="date-filters">
          {search.query && (
            <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
          )}
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
        </div>
      </div>

      <div className="tablewrap">
        <table className="ord-table cb-table">
          <thead>
            <tr>
              <th>Tier ID</th>
              <th>Tier Name</th>
              <th>Threshold</th>
              <th>Discount</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.length ? (
              paged.rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="id-cell">TIER-{pad(t.id)}</span>
                  </td>
                  <td>
                    <span className={`badge ${tierCls(t.card)}`}>{t.name}</span>
                  </td>
                  <td className="strong">{tierRange(tiers, t)} pts</td>
                  <td className="strong">{discText(t.discount_type, t.discount)}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="iconbtn view"
                        onClick={() => setView(t)}
                        title="View card"
                        aria-label="View card"
                      >
                        <Icon name="eye" />
                      </button>
                      {can("Tiers", "edit") && (
                        <button
                          className="iconbtn edit"
                          onClick={() =>
                            setForm({
                              mode: "edit",
                              tier: { ...t, threshold: String(t.threshold), discount: String(Number(t.discount)), perksText: (t.perks || []).join("\n") },
                            })
                          }
                          title="Edit"
                          aria-label="Edit tier"
                        >
                          <Icon name="edit" />
                        </button>
                      )}
                      {can("Tiers", "delete") && (
                        <button
                          className="iconbtn del"
                          onClick={() => setDel(t)}
                          title="Delete"
                          aria-label="Delete tier"
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="empty">{text ? "No tier matches your search" : "No tiers yet"}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paged.pager}

      {form && (
        <Modal
          title={form.mode === "edit" ? "Edit tier" : "Add tier"}
          wide
          submit={form.mode === "edit" ? "Save changes" : "Add tier"}
          busy={busy}
          onClose={() => setForm(null)}
          onSubmit={save}
        >
          <div className="field-row">
            <div className="field">
              <label>Tier name</label>
              <input className="input" value={form.tier.name} onChange={(e) => setT("name", e.target.value)} placeholder="Enter tier name" />
            </div>
            <div className="field">
              <label>Threshold (points)</label>
              <input className="input" inputMode="numeric" placeholder="Enter threshold points" value={form.tier.threshold} onChange={(e) => setT("threshold", wholeNumber(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Tier discount</label>
              <div className="ly-inrow">
                <Seg value={form.tier.discount_type || "%"} label="Tier discount type" onChange={(v) => setT("discount_type", v)} />
                <input
                  className="input"
                  inputMode="decimal"
                  aria-label="Tier discount value"
                  placeholder={form.tier.discount_type === "Rs" ? "Enter amount" : "Enter %"}
                  value={form.tier.discount}
                  onChange={(e) => setT("discount", amount(e.target.value))}
                />
              </div>
            </div>
          </div>
          <div className="field">
            <label>Card style</label>
            <div className="style-grid" role="radiogroup" aria-label="Card style">
              {styles.map((st) => (
                <button
                  type="button"
                  key={st.code}
                  role="radio"
                  aria-checked={form.tier.card === st.code}
                  className={`style-opt ${form.tier.card === st.code ? "on" : ""}`}
                  onClick={() => setT("card", st.code)}
                >
                  <StyleMini code={st.code} label={st.label} />
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Membership benefits (one per line)</label>
            <textarea
              className="input"
              rows={4}
              style={{ resize: "vertical", minHeight: 90 }}
              value={form.tier.perksText || ""}
              onChange={(e) => setT("perksText", e.target.value)}
              placeholder="Enter benefits"
            />
          </div>
        </Modal>
      )}

      {view && (
        <Modal
          title={view.name}
          submit="Close"
          hideCancel
          cls="modal--tier"
          onClose={() => setView(null)}
          onSubmit={() => setView(null)}
        >
          <div className="tvsplit">
            <div className="tvside">
              <LoyaltyCard tier={view} />
              <h2 className="tvside-name">{view.name}</h2>
            </div>
            <div className="tvbody">
              <h3 className={`tvbody-h tp-title--${view.card}`}>Membership benefits</h3>
              <ul className="tp-list">
                {(view.perks || []).length ? (
                  view.perks.map((pk, i) => <li key={i}>{pk}</li>)
                ) : (
                  <li>No benefits listed yet</li>
                )}
              </ul>
              <div className="tp-meta">
                <span className={`badge ${tierCls(view.card)}`}>{discText(view.discount_type, view.discount)} discount</span>
                <span className="tp-range">{tierRange(tiers, view)} pts</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {del && (
        <ConfirmDelete
          what="tier"
          note={`${del.name} will be removed.`}
          busy={busy}
          onClose={() => setDel(null)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}