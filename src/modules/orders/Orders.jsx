import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Icon from "../../config/icons";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import Modal from "../../components/common/Modal";
import HeadFilter from "../../components/common/HeadFilter";
import Pager, { PER_PAGE } from "../../components/common/Pager";
import { ExportButton, ImportButton } from "../../components/common/Transfer";
import { money } from "../../config/format";
import { allStatuses, BULK_ACTIONS, ST_GRAD, LOCKED, statusClass, statusLabel, payLabel, platformClass } from "../../config/orders";
import { useApi } from "../../hooks/useApi";
import { ordersApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import { useLookups } from "../../context/LookupsContext";
import OrderViewModal from "./OrderViewModal";
import Dispatch from "./Dispatch";
import RoutePopup from "../../components/orders/RoutePopup";

const dOnly = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const tOnly = (d) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
const kmOf = (v) => (v == null || v === "" ? "—" : `${Number(v).toFixed(1)} km`);
const cancelMeta = (o) =>
  [o.cancelled_via === "APP" ? "Rider" : o.cancelled_by || "User", o.cancelled_via === "APP" ? "App" : "Web", tOnly(o.cancelled_at)].filter(Boolean).join(" · ");

export default function Orders({ appOnly = false, dispatch = false }) {
  if (dispatch) return <Dispatch />;
  return <OrdersList key={appOnly ? "app" : "home"} appOnly={appOnly} />;
}

function OrdersList({ appOnly }) {
  const toast = useToast();
  const { can } = useAuth();
  useLookups();
  const MOD = appOnly ? "Shopify & App Orders" : "Home Delivery Orders";
  const module = appOnly ? "app" : "home";
  const search = usePageSearch(appOnly ? "app-orders" : "orders");
  const navigate = useNavigate();

  const [tab, setTab] = useState("ALL");
  const [channel, setChannel] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState({});
  const [viewOrder, setViewOrder] = useState(null);
  const [delOrder, setDelOrder] = useState(null);
  const [routeOrder, setRouteOrder] = useState(null);
  const [anyway, setAnyway] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const filters = { module, status: tab, channel, city, payment, q: search.query, from, to };
  const key = JSON.stringify(filters);
  const { data, loading, error, reload } = useApi(
    () => ordersApi.list({ ...filters, page, limit: PER_PAGE }),
    [key, page],
    ["orders", "order_items", "customers", "riders", "shops"]
  );

  useEffect(() => {
    setPage(1);
    setSel({});
  }, [key]);

  const res = data || { rows: [], total: 0, counts: {}, facets: { channels: [], cities: [], payments: [] } };
  const rows = res.rows;
  const counts = res.counts || {};
  const stLabel = useCallback((s) => statusLabel(s, appOnly), [appOnly]);
  const title = appOnly ? "Shopify & App Orders" : "Home Delivery Orders";

  const oorTab = tab === "OUT_OF_RANGE";
  const bulk = oorTab ? null : BULK_ACTIONS[tab];
  const cancelTab = tab === "CANCELLED";
  const canReassign = cancelTab && can(MOD, "reassign");
  const showChecks = (!!bulk && can(MOD, "edit")) || canReassign;
  const selIds = Object.keys(sel).filter((id) => sel[id]);

  const opt = (list, cur, label = (x) => x) => [
    { value: "ALL", label: "All", selected: cur === "ALL" },
    ...list.map((v) => ({ value: v, label: label(v), selected: cur === v })),
  ];
  const statusOpts = [
    { value: "ALL", label: "All", selected: tab === "ALL" },
    ...allStatuses().map((k) => ({ value: k, label: stLabel(k), selected: tab === k })),
  ];

  const openView = async (id) => {
    try {
      setViewOrder(await ordersApi.get(id));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const bulkAdvance = async () => {
    if (!bulk || !selIds.length) return;
    setBusy(true);
    const results = await Promise.allSettled(selIds.map((id) => ordersApi.setStatus(id, bulk[0])));
    const failed = results.filter((r) => r.status === "rejected");
    const ok = results.length - failed.length;
    if (ok) toast.success(`${ok} order${ok === 1 ? "" : "s"} moved to ${stLabel(bulk[0])}`);
    if (failed.length) toast.error(failed[0].reason?.message || "Some orders could not be updated");
    setSel({});
    setBusy(false);
    reload();
  };

  const doReassign = async () => {
    if (!selIds.length) return;
    setBusy(true);
    try {
      await ordersApi.reassign(selIds.map(Number), module);
      toast.success(`${selIds.length} order${selIds.length === 1 ? "" : "s"} moved to ${stLabel("CONFIRMED")}`);
      setSel({});
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await ordersApi.remove(delOrder.id);
      toast.success(`${delOrder.code} deleted`);
      setDelOrder(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doAnyway = async () => {
    setBusy(true);
    try {
      await ordersApi.deliverAnyway(anyway.id);
      toast.success(`${anyway.code} moved to the normal flow`);
      setAnyway(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!reason.trim()) return toast.error("Enter the reason");
    setBusy(true);
    try {
      await ordersApi.setStatus(cancelOrder.id, "CANCELLED", reason.trim());
      toast.success(`${cancelOrder.code} cancelled`);
      setCancelOrder(null);
      setReason("");
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const tabs = ["ALL", ...allStatuses(), "OUT_OF_RANGE"];
  const allChecked = rows.length > 0 && rows.every((o) => sel[o.id]);
  const colspan = oorTab ? 5 : (appOnly ? 13 : 11) - (showChecks ? 0 : 1);

  return (
    <>
      <div className="ord-head">
        <h1>{title}</h1>
        <div className="ord-head__actions">
          {canReassign && selIds.length > 0 && (
            <button className="btn ord-reassign" onClick={doReassign} disabled={busy}>
              <span aria-hidden="true">↻</span>
              <span>Reassign ({selIds.length})</span>
            </button>
          )}
          {can(MOD, "import") && <ImportButton kind="orders" params={{ module }} title={`Import ${title}`} onDone={reload} />}
          {can(MOD, "export") && <ExportButton kind="orders" params={filters} />}
          {!appOnly && can(MOD, "add") && (
            <button className="btn" onClick={() => navigate("/orders/new")}>
              <Icon name="plus" />
              <span>New order</span>
            </button>
          )}
        </div>
      </div>

      <div className="ord-tools ord-tools--orders">
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t} className={`tab ${t === "OUT_OF_RANGE" ? "tab--oor" : ""} ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
              {t === "ALL" ? "All" : t === "OUT_OF_RANGE" ? "Out of range" : stLabel(t)} <span className="tab__count">({(t === "ALL" ? counts.ALL : counts[t]) || 0})</span>
            </button>
          ))}
        </div>
        <div className="date-filters">
          {showChecks && bulk && selIds.length > 0 && (
            <button className="btn btn--sm bulkgo" onClick={bulkAdvance} disabled={busy} style={{ background: ST_GRAD[bulk[0]], color: "#fff", boxShadow: "none" }}>
              Move to {stLabel(bulk[0])} ({selIds.length})
            </button>
          )}
          <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="date-sep">–</span>
          <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          {(from || to) && (
            <button className="iconbtn" title="Clear dates" onClick={() => { setFrom(""); setTo(""); }}>
              <Icon name="x" />
            </button>
          )}
          <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}>
            <Icon name="search" />
          </button>
          {search.query && (
            <span className="search-chip">
              "{search.query}"
              <button onClick={search.clear} aria-label="Clear search">
                <Icon name="x" />
              </button>
            </span>
          )}
        </div>
      </div>

      {oorTab ? (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th className="right">Distance</th><th>Nearest shop</th><th className="right">Actions</th></tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={5}><div className="empty">Loading orders…</div></td></tr>
              ) : error ? (
                <tr><td colSpan={5}><div className="empty">{error}</div></td></tr>
              ) : rows.length ? rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button className="linklike" onClick={() => openView(o.id)} title="Open order">{o.code}</button>
                    <div className="sub">{dOnly(o.created_at)} · {tOnly(o.created_at)}</div>
                  </td>
                  <td>
                    <div className="strong">{o.customer_name || "Walk-in"}</div>
                    <div className="sub">{o.customer_phone || ""}</div>
                  </td>
                  <td className="right km-bad">{kmOf(o.oor_km ?? o.distance_km)}</td>
                  <td className="strong">{o.nearest_shop_name || o.shop_name || "—"}</td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn view" onClick={() => openView(o.id)} title="View details" aria-label="View order"><Icon name="eye" /></button>
                      {can(MOD, "deliver anyway") && (
                        <button className="btn btn--sm btn--anyway" onClick={() => setAnyway(o)}>Deliver anyway</button>
                      )}
                      {can(MOD, "cancel") && (
                        <button className="iconbtn del" onClick={() => { setReason(""); setCancelOrder(o); }} title="Cancel order" aria-label="Cancel order"><Icon name="x" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}><div className="empty">No out of range orders</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="tablewrap cb-wrap">
        <table className="ord-table cb-table">
          <thead>
            <tr>
              {showChecks && (
                <th className="chkcol">
                  <input
                    type="checkbox"
                    className="ocheck"
                    checked={allChecked}
                    onChange={(e) => setSel(e.target.checked ? Object.fromEntries(rows.map((o) => [o.id, true])) : {})}
                    aria-label="Select all"
                  />
                </th>
              )}
              <th>Order ID</th>
              {appOnly && <th>Invoice No</th>}
              <th className="th-filter">
                <HeadFilter label="Platform" active={channel !== "ALL"} options={opt(res.facets.channels, channel)} onSelect={setChannel} />
              </th>
              <th>Customer</th>
              <th className="th-filter">
                <HeadFilter label="City" active={city !== "ALL"} options={opt(res.facets.cities, city)} onSelect={setCity} searchable placeholder="Enter city" />
              </th>
              <th className="right">Qty</th>
              <th className="right">Amount</th>
              <th className="th-filter">
                <HeadFilter label="Payment" active={payment !== "ALL"} options={opt(res.facets.payments, payment, payLabel)} onSelect={setPayment} />
              </th>
              {appOnly && <th>User Status</th>}
              <th>{cancelTab ? "Reason" : "Remarks"}</th>
              <th className="th-filter">
                <HeadFilter label="Order Status" active={tab !== "ALL"} options={statusOpts} onSelect={setTab} />
              </th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={colspan}>
                  <div className="empty">Loading orders…</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colspan}>
                  <div className="empty">{error}</div>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((o) => (
                <tr key={o.id} className={`${sel[o.id] ? "is-sel" : ""} ${tab === "ALL" && o.out_of_range ? "oor" : ""}`}>
                  {showChecks && (
                    <td className="chkcol">
                      <input
                        type="checkbox"
                        className="ocheck"
                        checked={!!sel[o.id]}
                        onChange={(e) => setSel((s) => ({ ...s, [o.id]: e.target.checked }))}
                        aria-label={`Select ${o.code}`}
                      />
                    </td>
                  )}
                  <td>
                    <button className="linklike" onClick={() => openView(o.id)} title="Open order">
                      {o.code}
                    </button>
                    {tab === "ALL" && o.out_of_range && <span className="oor-chip">Out of range · {kmOf(o.oor_km ?? o.distance_km)}</span>}
                    <div className="sub">
                      {dOnly(o.created_at)} · {tOnly(o.created_at)}
                    </div>
                  </td>
                  {appOnly && (
                    <td>
                      <div className="strong">{o.invoice_no || "N/A"}</div>
                    </td>
                  )}
                  <td>
                    <span className={platformClass(o.channel)}>{o.channel}</span>
                  </td>
                  <td>
                    <div className="strong">{o.customer_name || "Walk-in"}</div>
                    <div className="sub">{o.customer_phone || ""}</div>
                  </td>
                  <td>{o.shop_city || "—"}</td>
                  <td className="right strong">{o.qty ?? 0}</td>
                  <td className="right strong">{money(o.total)}</td>
                  <td>
                    <span className="sub">({payLabel(o.payment_type)})</span>
                  </td>
                  {appOnly && (
                    <td>
                      <span className="sub">{o.user_status || "N/A"}</span>
                    </td>
                  )}
                  <td>
                    {cancelTab ? (
                      <div className="remarks-cell ord-reason">
                        <span className="remarks-text" title={o.cancel_reason || ""}>
                          {o.cancel_reason || <span className="sub">N/A</span>}
                        </span>
                        {o.cancelled_at && <span className="ord-reason__by">{cancelMeta(o)}</span>}
                      </div>
                    ) : (
                      <div className="remarks-cell">
                        <span className="remarks-text" title={o.remarks || ""}>
                          {o.remarks ? o.remarks : <span className="sub">N/A</span>}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={statusClass(o.status)}>{stLabel(o.status)}</span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="iconbtn view" onClick={() => openView(o.id)} title="View details" aria-label="View order">
                        <Icon name="eye" />
                      </button>
                      {o.status === "DELIVERED" && (
                        <button className="iconbtn route" onClick={() => setRouteOrder(o)} title="Rider route" aria-label="Rider route">
                          <Icon name="map" />
                        </button>
                      )}
                      {can(MOD, "edit") && !LOCKED.includes(o.status) && (
                        <button
                          className="iconbtn edit"
                          onClick={() => navigate(`${appOnly ? "/app-orders" : "/orders"}/${o.id}/edit`)}
                          title="Edit order"
                          aria-label="Edit order"
                        >
                          <Icon name="edit" />
                        </button>
                      )}
                      {can(MOD, "delete") && (
                        <button className="iconbtn del" onClick={() => setDelOrder(o)} title="Delete" aria-label="Delete order">
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colspan}>
                  <div className="empty">No orders found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <Pager page={res.page || page} total={res.total} onPage={setPage} />

      {anyway && (
        <Modal title="Deliver anyway?" cls="modal--confirm-grad" submit="Deliver anyway" danger busy={busy} onClose={() => setAnyway(null)} onSubmit={doAnyway}>
          <p className="sub">{anyway.code} is {kmOf(anyway.oor_km ?? anyway.distance_km)} away. It will go to Order Dispatch like a normal order.</p>
        </Modal>
      )}
      {cancelOrder && (
        <Modal title={`Cancel ${cancelOrder.code}?`} submit="Cancel order" danger busy={busy} onClose={() => setCancelOrder(null)} onSubmit={doCancel}>
          <div className="field">
            <label>Reason *</label>
            <textarea className="input" rows={3} maxLength={300} placeholder="Enter the reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </Modal>
      )}
      {routeOrder && <RoutePopup order={routeOrder} onClose={() => setRouteOrder(null)} />}
      {viewOrder && <OrderViewModal order={viewOrder} onClose={() => setViewOrder(null)} />}
      {delOrder && (
        <ConfirmDelete
          what="order"
          note={`Order ${delOrder.code} and its items will be permanently removed.`}
          busy={busy}
          onClose={() => setDelOrder(null)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}
