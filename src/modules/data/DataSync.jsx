import { useEffect, useMemo, useRef, useState } from "react";
import PageHead from "../../components/common/PageHead";
import Modal from "../../components/common/Modal";
import Select from "../../components/common/Select";
import Pager from "../../components/common/Pager";
import Icon from "../../config/icons";
import { Switch, Seg } from "../../components/loyalty/LoyaltyControls";
import { useApi } from "../../hooks/useApi";
import { syncApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

const MOD = "Data Sync";
const LIVE = ["sync_keys", "sync_queue", "sync_logs"];
const GROUPS = [["master", "Master data"], ["orders", "Orders & points"]];
const SHOW_CHIPS = 3;

const dt = (v) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const STATUS = { ACTIVE: ["b-green", "Active"], PAUSED: ["b-amber", "Paused"], REVOKED: ["b-red", "Revoked"] };
const ACTION = { created: "b-green", updated: "b-plum", linked: "b-plum", exists: "b-grey", cancelled: "b-amber", queued: "b-amber", ok: "b-green", rejected: "b-red" };

function ModuleTiles({ modules, value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <>
      {GROUPS.map(([g, title]) => {
        const list = modules.filter((m) => m.group === g);
        const all = list.every((m) => value.includes(m.key));
        return (
          <div className="ds-grp" key={g}>
            <div className="ds-grp__h">
              <b>{title} <span>({list.length})</span></b>
              <button type="button" className="ds-link" onClick={() => onChange(all ? value.filter((k) => !list.some((m) => m.key === k)) : [...new Set([...value, ...list.map((m) => m.key)])])}>
                {all ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="ds-tiles">
              {list.map((m) => (
                <button type="button" key={m.key} className={`ds-tile ${value.includes(m.key) ? "on" : ""}`} onClick={() => toggle(m.key)} aria-pressed={value.includes(m.key)}>
                  <span className="ds-tick">{value.includes(m.key) && <Icon name="check" />}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="ds-count">{value.length} of {modules.length} selected</div>
    </>
  );
}

function KeyShown({ shown, onClose }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown.key);
      toast.success("Key copied");
    } catch {
      toast.error("Could not copy. Select the key and copy it");
    }
  };
  return (
    <Modal title={shown.title} submit="Done" hideCancel onClose={onClose} onSubmit={onClose}>
      <p className="sub ds-once">This key is shown only once. Copy it now and give it to the developer.</p>
      <div className="ds-key">
        <code>{shown.key}</code>
        <button type="button" className="btn btn--sm" onClick={copy}><Icon name="copy" /><span>Copy</span></button>
      </div>
      <div className="ds-keyname"><span>System</span><b>{shown.name}</b></div>
    </Modal>
  );
}

function TimingModal({ k, modules, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const [paused, setPaused] = useState(!!k.paused);
  const [timing, setTiming] = useState(() => Object.fromEntries(k.modules.map((m) => {
    const t = k.timing?.[m] || { mode: "instant" };
    return [m, { mode: t.mode || "instant", type: t.type || "daily", times: t.times || ["09:00"], hours: String(t.hours || 3) }];
  })));
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({});
  const set = (m, patch) => setTiming((x) => ({ ...x, [m]: { ...x[m], ...patch } }));
  const save = async () => {
    const out = {};
    for (const m of k.modules) {
      const t = timing[m];
      const meta = modules.find((x) => x.key === m);
      if (meta?.instant || t.mode !== "scheduled") { out[m] = { mode: "instant" }; continue; }
      if (t.type === "every") {
        const h = Number(t.hours);
        if (!Number.isInteger(h) || h < 1 || h > 24) return toast.error(`${meta.label}: every N hours must be 1 to 24`);
        out[m] = { mode: "scheduled", type: "every", hours: h };
      } else {
        if (!t.times.length) return toast.error(`${meta.label}: add at least one time`);
        out[m] = { mode: "scheduled", type: "daily", times: t.times };
      }
    }
    setBusy(true);
    try {
      await syncApi.updateKey(k.id, { paused, timing: out });
      toast.success("Sync settings saved");
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Sync settings" sub={k.name} wide submit={canEdit ? "Save changes" : null} busy={busy} onClose={onClose} onSubmit={save}>
      <div className="ds-pause">
        <div><b>Pause sync</b><span>{paused ? "Paused" : "Running"}</span></div>
        <Switch on={paused} label="Pause sync" disabled={!canEdit} onChange={setPaused} />
      </div>
      <div className="tablewrap">
        <table className="ord-table ds-ttable">
          <thead><tr><th>Module</th><th>Timing</th><th>Schedule</th></tr></thead>
          <tbody>
            {k.modules.map((m) => {
              const meta = modules.find((x) => x.key === m) || { label: m };
              const t = timing[m];
              return (
                <tr key={m}>
                  <td className="strong">{meta.label}</td>
                  <td>
                    {meta.instant ? <span className="badge b-plum">Instant</span> : (
                      <Seg value={t.mode} options={[["instant", "Instant"], ["scheduled", "Scheduled"]]} disabled={!canEdit} onChange={(v) => set(m, { mode: v })} label="Timing" />
                    )}
                  </td>
                  <td>
                    {!meta.instant && t.mode === "scheduled" ? (
                      <div className="ds-sched">
                        <Seg value={t.type} options={[["daily", "Daily times"], ["every", "Every N hours"]]} disabled={!canEdit} onChange={(v) => set(m, { type: v })} label="Schedule type" />
                        {t.type === "every" ? (
                          <div className="ds-every">
                            <span>Every</span>
                            <input className="input" inputMode="numeric" aria-label="Hours" placeholder="Enter hours" value={t.hours} disabled={!canEdit}
                              onChange={(e) => set(m, { hours: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                            <span>hours</span>
                          </div>
                        ) : (
                          <div className="ds-times">
                            {t.times.map((x) => (
                              <span className="ds-chip" key={x}>{x}{canEdit && <button type="button" aria-label={`Remove ${x}`} onClick={() => set(m, { times: t.times.filter((y) => y !== x) })}><Icon name="x" /></button>}</span>
                            ))}
                            {canEdit && t.times.length < 12 && (
                              <span className="ds-addtime">
                                <input type="time" className="input" aria-label="Time" value={add[m] || ""} onChange={(e) => setAdd((a) => ({ ...a, [m]: e.target.value }))} />
                                <button type="button" className="btn btn--sm" disabled={!add[m]} onClick={() => { if (!t.times.includes(add[m])) set(m, { times: [...t.times, add[m]].sort() }); setAdd((a) => ({ ...a, [m]: "" })); }}>
                                  <Icon name="plus" /><span>Add</span>
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Keys({ modules, keys: allKeys, perms, reload, createSignal, query = "" }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [shown, setShown] = useState(null);
  const [timing, setTiming] = useState(null);
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const label = (k) => modules.find((m) => m.key === k)?.label || k;
  const text = query.toLowerCase();
  const keys = text ? allKeys.filter((k) => `${k.name} ${(k.modules || []).map(label).join(" ")} ${k.hint || ""}`.toLowerCase().includes(text)) : allKeys;
  useEffect(() => setPage(1), [text]);
  const seenSignal = useRef(createSignal);
  useEffect(() => {
    if (createSignal !== seenSignal.current) {
      seenSignal.current = createSignal;
      setForm({ name: "", modules: [] });
    }
  }, [createSignal]);

  const save = async () => {
    const name = (form.name || "").trim();
    if (!name) return toast.error("System name is required");
    if (!form.modules.length) return toast.error("Select at least one module");
    setBusy(true);
    try {
      if (form.id) {
        await syncApi.updateKey(form.id, { name, modules: form.modules });
        toast.success("Key updated");
      } else {
        const r = await syncApi.createKey({ name, modules: form.modules });
        setShown({ key: r.key, name, title: "API key created" });
      }
      setForm(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      if (ask.kind === "regen") {
        const r = await syncApi.regenerate(ask.k.id);
        setShown({ key: r.key, name: ask.k.name, title: "New API key" });
      } else {
        await syncApi.revoke(ask.k.id);
        toast.success("Key revoked");
      }
      setAsk(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const rows = keys.slice((page - 1) * 15, page * 15);

  return (
    <>
      <div className="tablewrap">
        <table className="ord-table">
          <thead>
            <tr><th>Key name</th><th>Key</th><th>Modules</th><th>Status</th><th>Last used</th><th>Created</th><th className="right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((k) => {
              const st = STATUS[k.status] || STATUS.ACTIVE;
              const live = k.status !== "REVOKED";
              return (
                <tr key={k.id} className={live ? "" : "ds-dim"}>
                  <td className="strong">{k.name}</td>
                  <td><code className="ds-hint">sbk_{k.hint}</code></td>
                  <td>
                    <div className="ds-chips">
                      {k.modules.slice(0, SHOW_CHIPS).map((m) => <span className="ds-chip" key={m}>{label(m)}</span>)}
                      {k.modules.length > SHOW_CHIPS && <span className="ds-more" title={k.modules.slice(SHOW_CHIPS).map(label).join(", ")}>+{k.modules.length - SHOW_CHIPS}</span>}
                    </div>
                  </td>
                  <td><span className={`badge ${st[0]}`}>{st[1]}</span></td>
                  <td>{dt(k.last_used_at)}</td>
                  <td>{dt(k.created_at)}</td>
                  <td className="right">
                    <div className="actions">
                      {live && <button className="iconbtn view" aria-label="Sync settings" title="Sync settings" onClick={() => setTiming(k)}><Icon name="sliders" /></button>}
                      {live && perms.edit && <button className="iconbtn edit" aria-label="Edit key" title="Edit" onClick={() => setForm({ id: k.id, name: k.name, modules: [...k.modules] })}><Icon name="edit" /></button>}
                      {live && perms.regenerate && <button className="iconbtn go" aria-label="Regenerate key" title="Regenerate" onClick={() => setAsk({ kind: "regen", k })}><Icon name="sync" /></button>}
                      {live && perms.revoke && <button className="iconbtn del" aria-label="Revoke key" title="Revoke" onClick={() => setAsk({ kind: "revoke", k })}><Icon name="x" /></button>}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7}><div className="empty">{text ? "No key matches your search" : "No API keys yet"}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={keys.length} onPage={setPage} />

      {form && (
        <Modal title={form.id ? "Edit API key" : "Create API key"} wide submit={form.id ? "Save changes" : "Create key"} busy={busy} onClose={() => setForm(null)} onSubmit={save}>
          <div className="field">
            <label>System name</label>
            <input className="input" placeholder="Enter system name" maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <label className="ds-lbl">Modules</label>
          <ModuleTiles modules={modules} value={form.modules} onChange={(v) => setForm((f) => ({ ...f, modules: v }))} />
        </Modal>
      )}
      {ask && (
        <Modal title={ask.kind === "regen" ? "Regenerate key?" : "Revoke key?"} cls="modal--confirm-grad"
          submit={ask.kind === "regen" ? "Regenerate" : "Revoke"} danger busy={busy} onClose={() => setAsk(null)} onSubmit={confirm}>
          <p className="sub">
            {ask.kind === "regen"
              ? `A new key will be made for ${ask.k.name}. The old key stops working at once. Name and modules stay the same.`
              : `${ask.k.name} will not be able to send data any more. Data already saved stays.`}
          </p>
        </Modal>
      )}
      {timing && <TimingModal k={timing} modules={modules} canEdit={perms.edit} onClose={() => setTiming(null)} onSaved={() => { setTiming(null); reload(); }} />}
      {shown && <KeyShown shown={shown} onClose={() => setShown(null)} />}
    </>
  );
}

function Queue({ rows: allRows, canRun, reload, query = "" }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [page, setPage] = useState(1);
  const run = async (r) => {
    setBusy(`${r.key_id}:${r.module}`);
    try {
      const res = await syncApi.runQueue({ key_id: r.key_id, module: r.module });
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };
  const text = query.toLowerCase();
  const rows = text ? allRows.filter((r) => `${r.key_name} ${r.label} ${r.module}`.toLowerCase().includes(text)) : allRows;
  useEffect(() => setPage(1), [text]);
  const list = rows.slice((page - 1) * 15, page * 15);
  return (
    <>
      <div className="tablewrap">
        <table className="ord-table">
          <thead><tr><th>Key</th><th>Module</th><th>Schedule</th><th>Waiting</th><th>Next sync</th><th>Last sync</th><th className="right">Actions</th></tr></thead>
          <tbody>
            {list.length ? list.map((r) => (
              <tr key={`${r.key_id}:${r.module}`}>
                <td className="strong">{r.key_name}{r.paused && <span className="badge b-amber ds-gap">Paused</span>}</td>
                <td>{r.label}</td>
                <td>{r.schedule}</td>
                <td><b>{r.pending}</b></td>
                <td>{r.paused ? "—" : dt(r.next_run)}</td>
                <td>{dt(r.last_run)}</td>
                <td className="right">
                  {canRun && (
                    <button className="btn btn--sm" disabled={!r.pending || busy === `${r.key_id}:${r.module}`} onClick={() => run(r)}>
                      <Icon name="sync" /><span>{busy === `${r.key_id}:${r.module}` ? "Syncing…" : "Sync now"}</span>
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7}><div className="empty">{text ? "Nothing matches your search" : "Nothing is scheduled"}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={rows.length} onPage={setPage} />
    </>
  );
}

function FieldsTable({ m }) {
  const rows = [{ name: "external_id", type: "text", required: true, note: "Your own unique ID of this record" }, ...m.fields];
  return (
    <div className="tablewrap">
      <table className="ord-table">
        <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Notes</th></tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.name}>
              <td><code>{f.name}</code></td>
              <td>{f.type}</td>
              <td>{f.required ? <span className="badge b-plum">Yes</span> : <span className="badge b-grey">No</span>}</td>
              <td className="ds-note">{f.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const exampleOf = (m) => {
  const rec = { external_id: `${m.key.split("_")[0].toUpperCase()}-1001` };
  m.fields.forEach((f) => { if (f.example !== "") rec[f.name] = f.example; });
  return { records: [rec] };
};

function Formats({ modules, canDownload }) {
  const [view, setView] = useState(null);
  return (
    <>
      <div className="tablewrap">
        <table className="ord-table">
          <thead><tr><th>Order</th><th>Module</th><th>Group</th><th>Endpoint</th><th>Timing</th><th className="right">Actions</th></tr></thead>
          <tbody>
            {modules.map((m, i) => (
              <tr key={m.key}>
                <td>{i + 1}</td>
                <td className="strong">{m.label}</td>
                <td>{m.group === "master" ? "Master data" : "Orders & points"}</td>
                <td><code className="ds-hint">POST /api/v1/sync/{m.key}</code></td>
                <td>{m.instant ? "Always instant" : "Instant or scheduled"}</td>
                <td className="right">
                  <div className="actions">
                    <button className="iconbtn view" aria-label={`View ${m.label} format`} onClick={() => setView(m)}><Icon name="eye" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view && (
        <Modal title={`${view.label} · format`} wide hideFoot onClose={() => setView(null)}>
          <button className="ov__close" onClick={() => setView(null)} aria-label="Close"><Icon name="x" /></button>
          <FieldsTable m={view} />
          <div className="ds-sub">Example</div>
          <pre className="ds-pre">{JSON.stringify(exampleOf(view), null, 2)}</pre>
          {canDownload && (
            <div className="ds-bar ds-bar--end">
              <button className="btn" onClick={() => syncApi.format([view.key])}><Icon name="download" /><span>Download</span></button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function Tester({ modules }) {
  const toast = useToast();
  const [mod, setMod] = useState(modules[0]?.key || "");
  const [text, setText] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const ready = modules.length > 0;
  useEffect(() => {
    const m = modules.find((x) => x.key === mod);
    if (m) setText(JSON.stringify(exampleOf(m), null, 2));
    setRes(null);
  }, [mod, ready]);
  const run = async () => {
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return toast.error("The data is not valid JSON");
    }
    const records = Array.isArray(body) ? body : body && body.records;
    if (!Array.isArray(records)) return toast.error('Send { "records": [ ... ] }');
    setBusy(true);
    try {
      setRes(await syncApi.test({ module: mod, records }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ds-test">
      <div className="card">
        <div className="field">
          <label>Module</label>
          <Select value={mod} options={modules.map((m) => ({ value: m.key, label: m.label }))} onChange={setMod} placeholder="Select module" />
        </div>
        <div className="field">
          <label>Data</label>
          <textarea className="input ds-area" spellCheck={false} placeholder="Enter JSON data" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button className="btn" onClick={run} disabled={busy || !mod}><Icon name="check" /><span>{busy ? "Checking…" : "Check data"}</span></button>
      </div>
      <div className="card">
        {res ? (
          <>
            <div className="ds-sum">
              <div><b>{res.received}</b><span>Received</span></div>
              <div><b className="ok">{res.valid}</b><span>Valid</span></div>
              <div><b className="bad">{res.rejected}</b><span>Rejected</span></div>
            </div>
            <div className="tablewrap">
              <table className="ord-table">
                <thead><tr><th>external_id</th><th>Result</th><th>Reason</th></tr></thead>
                <tbody>
                  {res.results.map((r, i) => (
                    <tr key={`${r.external_id}-${i}`}>
                      <td><code>{r.external_id ?? "—"}</code></td>
                      <td><span className={`badge ${ACTION[r.status] || "b-grey"}`}>{r.status === "ok" ? "Valid" : "Rejected"}</span></td>
                      <td className="ds-note">{r.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="empty">No check yet</div>}
      </div>
    </div>
  );
}

function Logs({ modules, keys, query = "" }) {
  const [from, setFrom] = useState(() => ymd(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [key, setKey] = useState("ALL");
  const [mod, setMod] = useState("ALL");
  const [result, setResult] = useState("ALL");
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  useEffect(() => setPage(1), [from, to, key, mod, result, query]);
  const { data } = useApi(() => syncApi.logs({ from, to, key, module: mod, result, page, q: query }), [from, to, key, mod, result, page, query], LIVE);
  const label = (k) => modules.find((m) => m.key === k)?.label || k || "—";
  const kind = { PUSH: "Received", SCHEDULE: "Applied", SYNC_NOW: "Applied · Sync now", RESUME: "Applied · Resume" };
  const rows = data?.rows || [];
  return (
    <>
      <div className="ds-filters">
        <div className="ds-f"><Select value={key} options={[{ value: "ALL", label: "All keys" }, ...keys.map((k) => ({ value: String(k.id), label: k.name }))]} onChange={setKey} ariaLabel="Key" /></div>
        <div className="ds-f"><Select value={mod} options={[{ value: "ALL", label: "All modules" }, ...modules.map((m) => ({ value: m.key, label: m.label }))]} onChange={setMod} ariaLabel="Module" /></div>
        <div className="ds-f"><Select value={result} options={[{ value: "ALL", label: "All results" }, { value: "ok", label: "No errors" }, { value: "rejected", label: "With errors" }]} onChange={setResult} ariaLabel="Result" /></div>
        <div className="date-filters">
          <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="date-sep">–</span>
          <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
      </div>
      <div className="tablewrap">
        <table className="ord-table">
          <thead><tr><th>Time</th><th>Key</th><th>Module</th><th>Type</th><th>Records</th><th>Saved</th><th>Queued</th><th>Rejected</th><th>Status</th><th className="right">Actions</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((l) => (
              <tr key={l.id}>
                <td>{dt(l.created_at)}</td>
                <td className="strong">{l.key_name || "Unknown key"}</td>
                <td>{label(l.module)}</td>
                <td>{kind[l.kind] || l.kind}</td>
                <td>{l.received}</td>
                <td>{l.accepted}</td>
                <td>{l.queued}</td>
                <td className={l.rejected ? "km-bad" : ""}>{l.rejected}</td>
                <td><span className={`badge ${l.http_status >= 400 ? "b-red" : l.rejected ? "b-amber" : "b-green"}`}>{l.http_status >= 400 ? `Error ${l.http_status}` : l.rejected ? "Partly saved" : "OK"}</span></td>
                <td className="right">
                  <div className="actions">
                    <button className="iconbtn view" aria-label="View log" onClick={() => setView(l)}><Icon name="eye" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={10}><div className="empty">No logs for these filters</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={data?.page || 1} total={data?.total || 0} onPage={setPage} />
      {view && (
        <Modal title="Log details" sub={`${view.key_name || "Unknown key"} · ${label(view.module)} · ${dt(view.created_at)}`} wide hideFoot onClose={() => setView(null)}>
          <button className="ov__close" onClick={() => setView(null)} aria-label="Close"><Icon name="x" /></button>
          <div className="ds-sum">
            <div><b>{view.received}</b><span>Records</span></div>
            <div><b className="ok">{view.accepted}</b><span>Saved</span></div>
            <div><b>{view.queued}</b><span>Queued</span></div>
            <div><b className="bad">{view.rejected}</b><span>Rejected</span></div>
          </div>
          {view.message && <div className="dsp-warn">{view.message}</div>}
          {view.details?.length ? (
            <div className="tablewrap">
              <table className="ord-table">
                <thead><tr><th>external_id</th><th>Reason</th></tr></thead>
                <tbody>{view.details.map((d, i) => <tr key={i}><td><code>{d.external_id ?? "—"}</code></td><td className="ds-note">{d.error}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <div className="empty">No rejected records</div>}
        </Modal>
      )}
    </>
  );
}

export default function DataSync() {
  const { can } = useAuth();
  const perms = useMemo(() => ({
    add: can(MOD, "add"), edit: can(MOD, "edit"), regenerate: can(MOD, "regenerate"), revoke: can(MOD, "revoke"),
    run: can(MOD, "sync now"), download: can(MOD, "download"),
  }), [can]);
  const [tab, setTab] = useState("keys");
  const search = usePageSearch({ keys: "sync-keys", queue: "sync-queue", logs: "sync-logs" }[tab] || null);
  const query = ["keys", "queue", "logs"].includes(tab) ? search.query : "";
  const [createSignal, setCreateSignal] = useState(0);
  const { data, error, reload } = useApi(() => Promise.all([syncApi.modules(), syncApi.keys(), syncApi.queue()]), [], LIVE);
  const [modules, keys, queue] = data || [[], [], []];
  const waiting = queue.reduce((t, r) => t + r.pending, 0);
  const TABS = [["keys", "API keys", keys.filter((k) => k.status !== "REVOKED").length], ["queue", "Queue", waiting], ["formats", "Formats", null], ["test", "Test", null], ["logs", "Logs", null]];
  return (
    <>
      <PageHead title="Data Sync">
        {tab === "keys" && perms.add && (
          <button className="btn" onClick={() => setCreateSignal((n) => n + 1)}><Icon name="plus" /><span>Create API key</span></button>
        )}
        {tab === "formats" && perms.download && (
          <button className="btn" onClick={() => syncApi.format([])}><Icon name="download" /><span>Download format</span></button>
        )}
      </PageHead>
      <div className="tabs ds-tabs">
        {TABS.map(([k, l, n]) => (
          <button key={k} className={`tab ${tab === k ? "is-active" : ""}`} onClick={() => setTab(k)}>
            {l}{n != null && <> <span className="tab__count">({n})</span></>}
          </button>
        ))}
        {["keys", "queue", "logs"].includes(tab) && (
          <div className="cbtabs-right">
            {search.query && (
              <span className="search-chip">"{search.query}"<button onClick={search.clear} aria-label="Clear search"><Icon name="x" /></button></span>
            )}
            <button className="iconbtn iconbtn--search" title="Search (Ctrl+F)" onClick={search.open}><Icon name="search" /></button>
          </div>
        )}
      </div>
      {!data ? (
        <div className="empty" style={{ padding: 40 }}>{error || "Loading…"}</div>
      ) : (
        <>
          {tab === "keys" && <Keys modules={modules} keys={keys} perms={perms} reload={reload} createSignal={createSignal} query={query} />}
          {tab === "queue" && <Queue rows={queue} canRun={perms.run} reload={reload} query={query} />}
          {tab === "formats" && <Formats modules={modules} canDownload={perms.download} />}
          {tab === "test" && <Tester modules={modules} />}
          {tab === "logs" && <Logs modules={modules} keys={keys} query={query} />}
        </>
      )}
    </>
  );
}
