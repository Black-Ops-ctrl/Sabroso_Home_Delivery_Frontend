import { useState, useMemo } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import HeadFilter from "../../components/common/HeadFilter";
import Select from "../../components/common/Select";
import { usePaged } from "../../components/common/Pager";
import { ExportButton, ImportButton } from "../../components/common/Transfer";
import Icon from "../../config/icons";
import { onlyLetters, mobile10, codeText, usernameText, passwordText, check, firstError } from "../../config/inputs";
import { useApi } from "../../hooks/useApi";
import { ridersApi, shopsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import { useLookups } from "../../context/LookupsContext";
import { DELIVERY_STATUS, deliveryStatus } from "../../config/riders";
import RiderView from "../../components/fleet/RiderView";

const MOD = "Riders";

export default function Riders() {
  const toast = useToast();
  const { can } = useAuth();
  const lk = useLookups();
  const { data, loading, error, reload } = useApi(
    () => Promise.all([ridersApi.list(), shopsApi.list()]),
    [],
    ["riders", "shops", "orders"]
  );
  const [riders, shops] = data || [[], []];

  const [selected, setSelected] = useState(null);
  const [shopFilter, setShopFilter] = useState("ALL");
  const [dsFilter, setDsFilter] = useState("ALL");
  const [dutyFilter, setDutyFilter] = useState("ALL");
  const [form, setForm] = useState(null);
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const listSearch = usePageSearch("riders");
  const q = listSearch.query.toLowerCase();
  const list = useMemo(
    () =>
      riders.filter(
        (r) =>
          (shopFilter === "ALL" || String(r.shop_id) === String(shopFilter)) &&
          (dsFilter === "ALL" || (r.delivery_status || "AVAILABLE") === dsFilter) &&
          (dutyFilter === "ALL" || String(!!r.on_duty) === dutyFilter) &&
          (!q ||
            [r.code, r.name, r.phone, r.shop_name, r.emp_id, r.status, r.username].some((v) => String(v || "").toLowerCase().includes(q)))
      ),
    [riders, shopFilter, dsFilter, dutyFilter, q]
  );
  const paged = usePaged(list, `${shopFilter}|${dsFilter}|${dutyFilter}|${q}`);

  const setR = (k, v) => setForm((f) => ({ ...f, rider: { ...f.rider, [k]: v } }));
  const openEdit = (r) => setForm({ mode: "edit", rider: { ...r, phone: mobile10(String(r.phone || "").replace(/\D/g, "").slice(-10)) } });

  const save = async () => {
    const r = form.rider;
    const err = firstError(
      check.name(r.name, "Rider name"),
      check.mobile(r.phone, "Rider mobile"),
      check.pick(r.shop_id, "a shop"),
      check.pick(r.status, "a status"),
      check.username(r.username),
      check.password(r.password)
    );
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: r.name.trim(),
        phone: r.phone,
        emp_id: (r.emp_id || "").trim() || null,
        shop_id: r.shop_id,
        status: r.status,
        joined: r.joined || null,
        username: (r.username || "").trim(),
        password: r.password || "",
      };
      if (form.mode === "edit") await ridersApi.update(r.id, body);
      else await ridersApi.create(body);
      toast.success(form.mode === "edit" ? "Rider updated" : "Rider added");
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
      await ridersApi.remove(del.id);
      toast.success("Rider deleted");
      setDel(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const head = (
    <div className="ord-head">
      <h1>Riders</h1>
      <div className="ord-head__actions">
        {listSearch.query && (
          <span className="search-chip">
            "{listSearch.query}"
            <button onClick={listSearch.clear} aria-label="Clear search">
              <Icon name="x" />
            </button>
          </span>
        )}
        <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={listSearch.open}>
          <Icon name="search" />
        </button>
        {can(MOD, "import") && <ImportButton kind="riders" title="Import riders" onDone={reload} />}
        {can(MOD, "export") && <ExportButton kind="riders" />}
        {can(MOD, "add") && (
          <button
            className="btn"
            onClick={() => setForm({ mode: "new", rider: { status: lk.list("rider_status")[0]?.code || "", shop_id: "" } })}
          >
            <Icon name="plus" />
            <span>Add rider</span>
          </button>
        )}
      </div>
    </div>
  );

  if (loading || error)
    return (
      <>
        {head}
        <div className="empty" style={{ padding: 40 }}>{error || "Loading riders…"}</div>
      </>
    );

  const formModal = (
    <>
      {form && (
          <Modal
            title={form.mode === "edit" ? "Edit rider" : "Add rider"}
            submit={form.mode === "edit" ? "Save changes" : "Add rider"}
            busy={busy}
            onClose={() => setForm(null)}
            onSubmit={save}
          >
            <div className="field-row">
              <div className="field">
                <label>Rider name</label>
                <input className="input" value={form.rider.name || ""} onChange={(e) => setR("name", onlyLetters(e.target.value))} placeholder="Enter rider name" />
              </div>
              <div className="field">
                <label>Rider mobile</label>
                <div className="phone-in">
                  <span className="phone-cc">+92</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.rider.phone || ""}
                    onChange={(e) => setR("phone", mobile10(e.target.value))}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
            </div>
            <div className="field-row">
              {form.mode === "edit" && (
                <div className="field">
                  <label>Rider ID</label>
                  <input className="input ro-field" value={form.rider.code || "N/A"} readOnly tabIndex={-1} />
                </div>
              )}
              <div className="field">
                <label>Employee ID</label>
                <input className="input" value={form.rider.emp_id || ""} onChange={(e) => setR("emp_id", codeText(e.target.value))} placeholder="Enter employee ID" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Shop</label>
                <Select
                  placeholder="Select shop"
                  searchPlaceholder="Search shop"
                  value={form.rider.shop_id || ""}
                  options={shops.map((s) => ({ value: s.id, label: s.name }))}
                  onChange={(v) => setR("shop_id", v)}
                />
              </div>
              <div className="field">
                <label>Status</label>
                <Select placeholder="Select status" value={form.rider.status || ""} options={lk.options("rider_status")} onChange={(v) => setR("status", v)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Username</label>
                <input className="input" value={form.rider.username || ""} autoComplete="off" onChange={(e) => setR("username", usernameText(e.target.value))} placeholder="Enter username" />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" value={form.rider.password || ""} autoComplete="new-password" onChange={(e) => setR("password", passwordText(e.target.value))} placeholder="Enter password" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Joined</label>
                <input className="input" type="date" value={form.rider.joined ? String(form.rider.joined).slice(0, 10) : ""} onChange={(e) => setR("joined", e.target.value)} />
              </div>
            </div>
          </Modal>
        )}
    </>
  );

  const sel = selected ? riders.find((r) => r.id === selected) : null;
  if (sel)
    return (
      <>
        <RiderView riderId={sel.id} onBack={() => setSelected(null)} canRelease={can(MOD, "release phone")} />
        {formModal}
      </>
    );

  const shopOptions = [
    { value: "ALL", label: "All shops", selected: shopFilter === "ALL" },
    ...shops.map((s) => ({ value: String(s.id), label: s.name, selected: String(shopFilter) === String(s.id) })),
  ];

  return (
    <>
      {head}
      <div className="tablewrap cb-wrap">
        <table className="ord-table cb-table">
          <thead>
            <tr>
              <th>Rider ID</th>
              <th>Rider Name</th>
              <th>Rider Mobile</th>
              <th className="th-filter">
                <HeadFilter label="Shop Name" active={shopFilter !== "ALL"} options={shopOptions} onSelect={setShopFilter} searchable placeholder="Enter shop" />
              </th>
              <th>Employee ID</th>
              <th className="th-filter">
                <HeadFilter
                  label="Duty"
                  active={dutyFilter !== "ALL"}
                  options={[
                    { value: "ALL", label: "All", selected: dutyFilter === "ALL" },
                    { value: "true", label: "On duty", selected: dutyFilter === "true" },
                    { value: "false", label: "Off duty", selected: dutyFilter === "false" },
                  ]}
                  onSelect={setDutyFilter}
                />
              </th>
              <th className="th-filter">
                <HeadFilter
                  label="Delivery Status"
                  active={dsFilter !== "ALL"}
                  options={[
                    { value: "ALL", label: "All", selected: dsFilter === "ALL" },
                    ...Object.entries(DELIVERY_STATUS).map(([k, v]) => ({ value: k, label: v.label, selected: dsFilter === k })),
                  ]}
                  onSelect={setDsFilter}
                />
              </th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.length ? (
              paged.rows.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.code || "N/A"}</td>
                  <td className="strong">{r.name}</td>
                  <td>{r.phone || "N/A"}</td>
                  <td>{r.shop_name || "N/A"}</td>
                  <td className="strong">{r.emp_id || "N/A"}</td>
                  <td>
                    <span className={`duty ${r.on_duty ? "duty--on" : "duty--off"}`}>{r.on_duty ? "On duty" : "Off duty"}</span>
                  </td>
                  <td className="nowrap">
                    <span className={`badge ${deliveryStatus(r.delivery_status).cls}`}>{deliveryStatus(r.delivery_status).label}</span>
                    {r.current_order && <div className="sub">{r.current_order}</div>}
                  </td>
                  <td>
                    <span className={`badge ${r.status === "ACTIVE" ? "b-green" : "b-red"}`}>{lk.label("rider_status", r.status)}</span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn view" onClick={() => setSelected(r.id)} title="View" aria-label="View rider">
                        <Icon name="eye" />
                      </button>
                      {r.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                      {!r.synced && can(MOD, "edit") && (
                        <button
                          className="iconbtn edit"
                          onClick={() => openEdit(r)}
                          title="Edit"
                          aria-label="Edit rider"
                        >
                          <Icon name="edit" />
                        </button>
                      )}
                      {!r.synced && can(MOD, "delete") && (
                        <button className="iconbtn del" onClick={() => setDel(r)} title="Delete" aria-label="Delete rider">
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <div className="empty">{riders.length ? "No riders match" : "No riders yet"}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paged.pager}

      {formModal}
      {del && <ConfirmDelete what="rider" note={`${del.name} will be removed.`} busy={busy} onClose={() => setDel(null)} onConfirm={doDelete} />}
    </>
  );
}
