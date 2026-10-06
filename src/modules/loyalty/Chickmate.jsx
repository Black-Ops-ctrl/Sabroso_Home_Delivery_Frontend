import { useState, useMemo, useEffect } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import Select from "../../components/common/Select";
import { usePaged } from "../../components/common/Pager";
import { ExportButton, ImportButton } from "../../components/common/Transfer";
import Icon from "../../config/icons";
import { num, pad } from "../../config/format";
import { tierCls, customerStatusCls, ledgerKind, tierRangeError } from "../../config/loyalty";
import { onlyLetters, mobile10, onlyDigits, wholeNumber, check, firstError } from "../../config/inputs";
import { LoyaltyStatCard } from "../../components/loyalty/LoyaltyCards";
import { Seg } from "../../components/loyalty/LoyaltyControls";
import { useApi } from "../../hooks/useApi";
import { cardsApi, tiersApi, customersApi, citiesApi, loyaltyApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import { useLookups } from "../../context/LookupsContext";

const MOD = "Chickmate Club";

const fd = (d) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—");
const today = () => new Date().toISOString().slice(0, 10);
const custOf = (k) => ({
  id: k.customer_id,
  name: k.customer_name,
  father_name: k.father_name,
  phone: k.customer_phone,
  cnic: k.cnic,
  city: k.city,
  address: k.address,
  remarks: k.remarks,
  status: k.customer_status,
  password: k.password,
  created_at: k.customer_created_at,
  updated_at: k.customer_updated_at,
});

export default function Chickmate() {
  const toast = useToast();
  const { can, user } = useAuth();
  const lk = useLookups();
  const search = usePageSearch("chickmate");
  const { data, loading, error, reload } = useApi(
    () => Promise.all([cardsApi.list(), tiersApi.list(), citiesApi.list()]),
    [],
    ["cards", "customers", "tiers", "cities", "loyalty_ledger"]
  );
  const [cards, tiers, cities] = data || [[], [], []];
  const cityNames = cities.map((c) => c.name);

  const [clubTier, setClubTier] = useState(null);
  const [edit, setEditRaw] = useState(null);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [add, setAddRaw] = useState(null);
  const [hist, setHist] = useState(null);
  const [adj, setAdjRaw] = useState(null);
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const setEdit = (v) => {  setEditRaw(v); };
  const setAdd = (v) => {  setAddRaw(v); };
  const setAdj = (v) => {  setAdjRaw(v); };

  const tierOf = (card) => tiers.find((t) => t.id === card.tier_id) || {};
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.threshold - b.threshold), [tiers]);
  const memCount = (t) => cards.filter((k) => k.tier_id === t.id).length;
  const statusOpts = lk.options("member_status");

  const q = search.query.toLowerCase();
  const rows = useMemo(() => {
    let list = clubTier ? cards.filter((k) => k.tier_id === clubTier) : cards;
    if (q) {
      list = list.filter((k) =>
        [k.code, k.customer_name, k.father_name, k.cnic, k.customer_phone, k.city, k.tier_name].some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [cards, clubTier, q]);
  const paged = usePaged(rows, `${clubTier}|${q}`);
  const histPaged = usePaged(hist?.entries, view?.cust?.id ?? "");
  const selTier = clubTier ? tiers.find((t) => t.id === clubTier) : null;

  const openEdit = (k) => {
    const c = custOf(k);
    setEdit({
      card: k,
      tier_id: k.tier_id || "",
      opening: String(k.opening_points ?? 0),
      cust: {
        id: c.id,
        name: c.name || "",
        father_name: c.father_name || "",
        phone: onlyDigits(c.phone).slice(-10),
        cnic: onlyDigits(c.cnic),
        password: c.password || "",
        city: c.city || "",
        status: c.status || "",
        remarks: c.remarks || "",
        address: c.address || "",
      },
    });
  };
  const setC = (k, v) => {
    
    setEditRaw((e) => ({ ...e, cust: { ...e.cust, [k]: v } }));
  };

  const saveEdit = async () => {
    const openDelta = (Number(edit.opening) || 0) - Number(edit.card.opening_points || 0);
    const pickTier = edit.tier_id ? tiers.find((t) => t.id === Number(edit.tier_id)) : null;
    const err = firstError(
      check.name(edit.cust.name, "Name"),
      check.name(edit.cust.father_name, "Father name", false),
      check.mobile(edit.cust.phone, "Mobile number"),
      check.cnic(edit.cust.cnic),
      check.pick(edit.cust.status, "a status"),
      check.pick(edit.tier_id, "a tier"),
      edit.opening === "" ? "Enter the opening points" : null,
      Number(edit.card.points || 0) + openDelta < 0 ? `Opening points can't be less than ${Number(edit.card.opening_points || 0) - Number(edit.card.points || 0)} — the member has already used some points` : null,
      pickTier && (pickTier.id !== edit.card.tier_id || openDelta) ? tierRangeError(tiers, pickTier, Number(edit.card.lifetime || 0) + openDelta) : null
    );
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      await customersApi.update(edit.cust.id, {
        name: edit.cust.name.trim(),
        father_name: edit.cust.father_name || null,
        phone: edit.cust.phone,
        cnic: edit.cust.cnic || null,
        password: edit.cust.password || null,
        city: edit.cust.city || null,
        address: edit.cust.address || null,
        remarks: edit.cust.remarks || null,
        status: edit.cust.status,
      });
      const newTierId = Number(edit.tier_id);
      if (openDelta) {
        await loyaltyApi.opening(edit.cust.id, { opening_points: Number(edit.opening) || 0, tier_id: newTierId, by: user?.name || null });
      }
      if (newTierId !== edit.card.tier_id) {
        const newTier = tiers.find((t) => t.id === newTierId);
        const history = Array.isArray(edit.card.tier_history) ? [...edit.card.tier_history] : [];
        history.push({ tier: newTier?.name, date: today(), by: user?.name || null });
        await cardsApi.update(edit.card.id, { tier_id: newTierId, tier_history: history });
      }
      toast.success("Member saved");
      setEdit(null);
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
      await loyaltyApi.removeMember(del.id);
      toast.success("Member removed");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (k) => {
    setBusy(true);
    try {
      const res = await loyaltyApi.approve(k.id);
      toast.success(`${k.customer_name}: ${res.message}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () =>
    setAdd({
      name: "", father_name: "", phone: "", cnic: "", password: "", city: "", status: statusOpts[0]?.value || "",
      tier_id: sortedTiers[0]?.id ?? "", opening_points: "", address: "", remarks: "",
    });
  const setA = (k, v) => {
    
    setAddRaw((a) => ({ ...a, [k]: v }));
  };
  const saveAdd = async () => {
    const tier = tiers.find((t) => String(t.id) === String(add.tier_id));
    const err = firstError(
      check.name(add.name, "Name"),
      check.name(add.father_name, "Father name", false),
      check.mobile(add.phone, "Mobile number"),
      check.cnic(add.cnic),
      check.pick(add.status, "a status"),
      check.pick(add.tier_id, "a tier"),
      tierRangeError(tiers, tier, add.opening_points)
    );
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      const res = await loyaltyApi.addMember({ ...add, name: add.name.trim(), opening_points: Number(add.opening_points) || 0, by: user?.name });
      toast.success(`${add.name.trim()} added · ${res.data?.code || ""}`);
      setAdd(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!view?.cust?.id) {
      setHist(null);
      return undefined;
    }
    let live = true;
    loyaltyApi
      .ledger(view.cust.id)
      .then((h) => live && setHist(h))
      .catch(() => live && setHist({ entries: [], card: null }));
    return () => {
      live = false;
    };
  }, [view]);

  const saveAdj = async () => {
    const pts = Math.trunc(Number(adj.points) || 0);
    const err = !pts ? "Points are required" : !adj.note.trim() ? "Reason is required" : null;
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      const h = await loyaltyApi.adjust(adj.customerId, {
        points: adj.sign === "-" ? -Math.abs(pts) : Math.abs(pts),
        note: adj.note.trim(),
        count_lifetime: adj.count_lifetime,
        by: user?.name,
      });
      setHist(h);
      toast.success("Points adjusted");
      setAdj(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className="ord-head">
      <h1>Chickmate Club members</h1>
      <div className="ord-head__actions">
        {selTier && (
          <span className="search-chip">
            {selTier.name}
            <button onClick={() => setClubTier(null)} aria-label="Clear tier filter">
              <Icon name="x" />
            </button>
          </span>
        )}
        {search.query && (
          <span className="search-chip">
            "{search.query}"
            <button onClick={search.clear} aria-label="Clear search">
              <Icon name="x" />
            </button>
          </span>
        )}
        <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}>
          <Icon name="search" />
        </button>
        {can(MOD, "import") && <ImportButton kind="members" title="Import Chickmate members" onDone={reload} />}
        {can(MOD, "export") && <ExportButton kind="members" />}
        {can(MOD, "add") && (
          <button className="btn" onClick={openAdd}>
            <Icon name="plus" />
            <span>Add member</span>
          </button>
        )}
      </div>
    </div>
  );

  if (loading || error)
    return (
      <>
        {head}
        <div className="empty" style={{ padding: 40 }}>{error || "Loading members…"}</div>
      </>
    );

  const tierOptions = sortedTiers.map((t) => ({ value: t.id, label: t.name }));

  return (
    <>
      {head}
      <div className="clubgrid">
        {sortedTiers.map((t) => (
          <LoyaltyStatCard key={t.id} tier={t} tiers={tiers} count={memCount(t)} active={clubTier === t.id} onClick={() => setClubTier(clubTier === t.id ? null : t.id)} />
        ))}
      </div>

      <div className="tablewrap">
        <table className="ord-table cb-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Father Name</th>
              <th>CNIC</th>
              <th>Mobile</th>
              <th>City</th>
              <th>Card ID</th>
              <th>Tier</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.length ? (
              paged.rows.map((k) => {
                const t = tierOf(k);
                const pending = k.approved === false;
                const up = !pending && k.upgrade_tier_id ? k.upgrade_tier_name : null;
                return (
                  <tr key={k.id} className={pending || up ? "row-pending" : ""}>
                    <td><span className="id-cell">CUS-{pad(k.customer_id || 0, 4)}</span></td>
                    <td className="strong">{k.customer_name || "—"}</td>
                    <td>{k.father_name || "—"}</td>
                    <td>{k.cnic || "—"}</td>
                    <td className="strong">{k.customer_phone || "—"}</td>
                    <td>{k.city || "—"}</td>
                    <td><span className="badge b-plum">{k.code}</span></td>
                    <td>
                      <span className={`badge ${tierCls(t.card)}`}>{t.name || k.tier_name || "—"}</span>
                      {pending && <div className="appr" style={{ marginTop: 4 }}>Approval pending</div>}
                      {up && <div className="pend-tag">↑ move to {up}</div>}
                    </td>
                    <td>
                      <span className={`badge ${customerStatusCls(k.customer_status)}`}>{lk.label("member_status", k.customer_status)}</span>
                    </td>
                    <td>
                      <div className="actions">
                        {(pending || up) && can(MOD, "approve") && (
                          <button className="iconbtn approve" onClick={() => approve(k)} disabled={busy} title={pending ? "Approve membership" : `Approve upgrade to ${up}`} aria-label="Approve">
                            <Icon name="check" />
                          </button>
                        )}
                        <button className="iconbtn view" onClick={() => setView({ card: k, cust: custOf(k), tier: t })} title="View" aria-label="View member">
                          <Icon name="eye" />
                        </button>
                        {k.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!k.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" onClick={() => openEdit(k)} title="Edit" aria-label="Edit member">
                            <Icon name="edit" />
                          </button>
                        )}
                        {!k.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" onClick={() => setDel(k)} title="Delete" aria-label="Delete member">
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className="empty">{clubTier || q ? "No members match" : "No members yet"}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paged.pager}

      {view && (
        <Modal wide cls="ov-modal" hideFoot onClose={() => setView(null)}>
          <button className="ov__close" onClick={() => setView(null)} aria-label="Close">
            <Icon name="x" />
          </button>
          <div className="ov">
            <div className="ov__side">
              <div className="ov__id">CUS-{pad(view.cust.id || 0, 4)}</div>
              <span className={`badge ${customerStatusCls(view.cust.status)}`}>{lk.label("member_status", view.cust.status)}</span>
              {view.card.approved === false && <span className="appr">Approval pending</span>}
              <div className="ov__mini"><div className="lbl">Name</div><div className="val">{view.cust.name}</div></div>
              <div className="ov__mini"><div className="lbl">Mobile</div><div className="val">{view.cust.phone || "—"}</div></div>
              <div className="ov__mini"><div className="lbl">City</div><div className="val">{view.cust.city || "—"}</div></div>
              <div className="ov__mini">
                <div className="lbl">Tier</div>
                <div className="val">
                  {view.tier?.name
                    ? <span className={`badge ${tierCls(view.tier.card)}`}>{view.tier.name}</span>
                    : "N/A"}
                </div>
              </div>
              <div className="ov__amt">
                <div className="lbl ly-ptlbl">Loyalty points</div>
                <div className="num">{hist?.card ? num(hist.card.points) : view.card ? num(view.card.points) : "—"}</div>
              </div>
              <div className="ov__mini">
                <div className="lbl">Lifetime points</div>
                <div className="val">
                  {num(hist?.card ? hist.card.lifetime : view.card.lifetime)}
                  {hist?.next_tier ? ` · ${num(hist.next_tier.need)} to ${hist.next_tier.name}` : ""}
                </div>
              </div>
            </div>
            <div className="ov__main">
              <h3 className="sec" style={{ marginBottom: 14 }}>Member details</h3>
              <div className="dl">
                <div><span className="dl-k">Customer ID</span><span className="dl-v">CUS-{pad(view.cust.id || 0, 4)}</span></div>
                <div><span className="dl-k">Card ID</span><span className="dl-v">{view.card.code}</span></div>
                <div><span className="dl-k">Father name</span><span className="dl-v">{view.cust.father_name || "—"}</span></div>
                <div><span className="dl-k">CNIC</span><span className="dl-v">{view.cust.cnic || "—"}</span></div>
                <div><span className="dl-k">Password</span><span className="dl-v">{view.cust.password || "—"}</span></div>
                <div><span className="dl-k">Approved by</span><span className="dl-v">{view.card.approved === false ? "Pending" : view.card.approved_by || "—"}</span></div>
                <div><span className="dl-k">Creation date</span><span className="dl-v">{fd(view.cust.created_at)}</span></div>
                <div><span className="dl-k">Updated date</span><span className="dl-v">{fd(view.cust.updated_at)}</span></div>
                <div style={{ gridColumn: "span 2" }}><span className="dl-k">Address</span><span className="dl-v">{view.cust.address || "—"}</span></div>
                <div style={{ gridColumn: "span 2" }}><span className="dl-k">Remarks</span><span className="dl-v">{view.cust.remarks || "N/A"}</span></div>
              </div>
              <h3 className="sec" style={{ margin: "20px 0 10px" }}>Tier movement history</h3>
              {Array.isArray(view.card.tier_history) && view.card.tier_history.length ? (
                view.card.tier_history.map((h, i) => {
                  const tt = tiers.find((x) => x.name === h.tier) || {};
                  return (
                    <div className="rowline" key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`badge ${tierCls(tt.card)}`}>{h.tier}</span>
                        <span className="sub">
                          {i === 0 ? `Registered as ${h.tier}` : `Moved to ${h.tier}`}
                        </span>
                      </div>
                      <span className="sub">{fd(h.date)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="sub">No tier movement</div>
              )}
              <div className="ly-histhead">
                <h3 className="sec">Points history</h3>
                {can(MOD, "adjust") && (
                  <button className="btn btn--ghost ly-smallbtn" onClick={() => setAdj({ customerId: view.cust.id, sign: "+", points: "", note: "", count_lifetime: false })}>
                    ± Adjust points
                  </button>
                )}
              </div>
              {!hist ? (
                <div className="sub">Loading…</div>
              ) : hist.entries.length ? (
                <>
                <div className="tablewrap ly-histwrap">
                  <table className="ord-table cb-table ly-hist">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Order</th><th>Points</th><th>Balance</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {histPaged.rows.map((e) => {
                        const [lbl, cls] = ledgerKind(e);
                        const p = Number(e.points);
                        return (
                          <tr key={e.id}>
                            <td className="h-date">{new Date(e.created_at).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                            <td className="h-type"><span className={`badge ${cls}`}>{lbl}</span></td>
                            <td className="h-order" data-label="Order">{e.order_code || "—"}</td>
                            <td className="strong h-pts" style={{ color: p > 0 ? "var(--ok)" : p < 0 ? "var(--bad)" : undefined }}>{p > 0 ? `+${num(p)}` : p < 0 ? `−${num(-p)}` : "—"}</td>
                            <td className="h-bal" data-label="Balance">{e.kind === "TIER" ? "—" : num(e.balance)}</td>
                            <td className="ly-note h-note">{e.note || "—"}{e.created_by ? ` · by ${e.created_by}` : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {histPaged.pager}
                </>
              ) : (
                <div className="sub">No points yet</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal
          title={`Edit ${edit.cust.name}`}
          wide
          submit="Save"
          busy={busy}
          onClose={() => setEdit(null)}
          onSubmit={saveEdit}
        >
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input placeholder="Enter name" className="input" value={edit.cust.name} onChange={(e) => setC("name", onlyLetters(e.target.value))} />
            </div>
            <div className="field">
              <label>Father name</label>
              <input placeholder="Enter father name" className="input" value={edit.cust.father_name} onChange={(e) => setC("father_name", onlyLetters(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Mobile</label>
              <div className="phone-in">
                <span className="phone-cc">+92</span>
                <input className="input" inputMode="numeric" maxLength={10} value={edit.cust.phone} onChange={(e) => setC("phone", mobile10(e.target.value))} placeholder="Enter mobile number" />
              </div>
            </div>
            <div className="field">
              <label>CNIC</label>
              <input placeholder="Enter CNIC" className="input" inputMode="numeric" maxLength={13} value={edit.cust.cnic} onChange={(e) => setC("cnic", onlyDigits(e.target.value, 13))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password</label>
              <input placeholder="Enter password" className="input" value={edit.cust.password} onChange={(e) => setC("password", e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <Select placeholder="Select city" searchPlaceholder="Search city" clearable value={edit.cust.city} options={cityNames} onChange={(v) => setC("city", v)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <Select placeholder="Select status" value={edit.cust.status} options={statusOpts} onChange={(v) => setC("status", v)} />
            </div>
            <div className="field">
              <label>Tier</label>
              <Select placeholder="Select tier" value={edit.tier_id || ""} options={tierOptions}
                onChange={(v) => {  setEditRaw((x) => ({ ...x, tier_id: v })); }} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Opening points</label>
              <input className="input" inputMode="numeric" aria-label="Opening points" placeholder="Enter opening points" value={edit.opening}
                onChange={(e) => { const v = wholeNumber(e.target.value); setEditRaw((x) => ({ ...x, opening: v })); }} />
            </div>
            <div className="field">
              <label>Remarks</label>
              <input placeholder="Enter remarks" className="input" value={edit.cust.remarks} onChange={(e) => setC("remarks", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Address</label>
            <input placeholder="Enter address" className="input" value={edit.cust.address} onChange={(e) => setC("address", e.target.value)} />
          </div>
        </Modal>
      )}

      {add && (
        <Modal title="Add Chickmate member" wide submit="Add member" busy={busy} onClose={() => setAdd(null)} onSubmit={saveAdd}>
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input placeholder="Enter member name" className="input" aria-label="Member name" value={add.name} onChange={(e) => setA("name", onlyLetters(e.target.value))} />
            </div>
            <div className="field">
              <label>Father name</label>
              <input placeholder="Enter father name" className="input" aria-label="Father name" value={add.father_name} onChange={(e) => setA("father_name", onlyLetters(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Mobile</label>
              <div className="phone-in">
                <span className="phone-cc">+92</span>
                <input className="input" inputMode="numeric" maxLength={10} aria-label="Member mobile" placeholder="Enter mobile number" value={add.phone} onChange={(e) => setA("phone", mobile10(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label>CNIC</label>
              <input className="input" inputMode="numeric" maxLength={13} aria-label="CNIC" placeholder="Enter CNIC" value={add.cnic} onChange={(e) => setA("cnic", onlyDigits(e.target.value, 13))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password</label>
              <input placeholder="Enter password" className="input" aria-label="Password" value={add.password} onChange={(e) => setA("password", e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <Select placeholder="Select city" searchPlaceholder="Search city" clearable value={add.city} options={cityNames} onChange={(v) => setA("city", v)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <Select placeholder="Select status" value={add.status} options={statusOpts} onChange={(v) => setA("status", v)} />
            </div>
            <div className="field">
              <label>Tier</label>
              <Select placeholder="Select tier" value={add.tier_id} options={tierOptions} onChange={(v) => setA("tier_id", v)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Opening points</label>
              <input className="input" inputMode="numeric" aria-label="Opening points" placeholder="Enter opening points" value={add.opening_points} onChange={(e) => setA("opening_points", wholeNumber(e.target.value))} />
            </div>
            <div className="field">
              <label>Remarks</label>
              <input placeholder="Enter remarks" className="input" aria-label="Remarks" value={add.remarks} onChange={(e) => setA("remarks", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Address</label>
            <input placeholder="Enter address" className="input" aria-label="Address" value={add.address} onChange={(e) => setA("address", e.target.value)} />
          </div>
        </Modal>
      )}

      {adj && (
        <Modal title="Adjust points" submit="Save" busy={busy} onClose={() => setAdj(null)} onSubmit={saveAdj}>
          <div className="field-row">
            <div className="field"><label>Add or remove</label>
              <Seg value={adj.sign} options={[["+", "Add"], ["-", "Remove"]]} label="Add or remove" onChange={(v) => setAdjRaw((a) => ({ ...a, sign: v }))} /></div>
            <div className="field"><label>Points</label>
              <input placeholder="Enter points" className="input" inputMode="numeric" aria-label="Points" value={adj.points} onChange={(e) => {  setAdjRaw((a) => ({ ...a, points: wholeNumber(e.target.value) })); }} /></div>
          </div>
          <div className="field"><label>Reason</label>
            <input className="input" aria-label="Reason" placeholder="Enter reason" value={adj.note} onChange={(e) => {  setAdjRaw((a) => ({ ...a, note: e.target.value })); }} /></div>
          <label className="ly-check"><input type="checkbox" checked={adj.count_lifetime} onChange={(e) => setAdjRaw((a) => ({ ...a, count_lifetime: e.target.checked }))} /> Count toward tier (lifetime points)</label>
        </Modal>
      )}
      {del && (
        <ConfirmDelete what="member" note="The member card and its points history will be removed. The customer and their orders stay." busy={busy} onClose={() => setDel(null)} onConfirm={doDelete} />
      )}
    </>
  );
}