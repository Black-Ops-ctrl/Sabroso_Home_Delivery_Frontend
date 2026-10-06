import { useState, useMemo, useRef } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import HeadFilter from "../../components/common/HeadFilter";
import Select from "../../components/common/Select";
import { usePaged } from "../../components/common/Pager";
import { ExportButton, ImportButton } from "../../components/common/Transfer";
import { useLookups } from "../../context/LookupsContext";
import { onlyLetters, phoneText, decimalSigned } from "../../config/inputs";
import Icon from "../../config/icons";
import { pad } from "../../config/format";
import { useApi } from "../../hooks/useApi";
import {
  companiesApi,
  shopsApi,
  regionsApi,
  citiesApi,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";
import { useBrand } from "../../context/BrandContext";
import { Switch } from "../../components/loyalty/LoyaltyControls";
import { imageFileToDataURL } from "../../config/image";
import { parseLatLng, shopLatLng } from "../../config/googleMaps";

const MOD = "Business Setup";

export default function CompanyShops() {
  const toast = useToast();
  const { can } = useAuth();
  const brand = useBrand();
  const [companyView, setCompanyView] = useState(null);
  const lk = useLookups();
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const { data, loading, error, reload } = useApi(
    () => Promise.all([companiesApi.list(), shopsApi.list(), regionsApi.list(), citiesApi.list()]),
    [],
    ["companies", "shops", "regions", "cities"]
  );
  const [companies, shops, regions, cities] = data || [[], [], [], []];

  const [tab, setTab] = useState("companies");
  const search = usePageSearch(tab);
  const [form, setFormRaw] = useState(null);
  const setForm = (v) => {
    
    setFormRaw(v);
  };
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const [regionF, setRegionF] = useState("ALL");
  const [cityF, setCityF] = useState("ALL");

  const q = search.query.toLowerCase();

  const shopCities = [...new Set((shops || []).map((s) => s.city).filter(Boolean))];

  const save = async () => {
    const { type, mode, row } = form;
    const api = { company: companiesApi, shop: shopsApi, region: regionsApi, city: citiesApi }[type];
    const label = { company: "Company name", shop: "Shop name", region: "Region name", city: "City name" }[type];
    let err = !String(row.name || "").trim() ? `${label} is required` : null;
    if (!err && type === "shop") {
      if (!row.company_id) err = "Please select a company";
      else if (!row.city) err = "Please select a city";
      else if (!row.status) err = "Please select a status";
    }
    if (!err && type === "city" && !row.region_id) err = "Please select a region";
    let loc = null;
    if (!err && type === "shop") {
      const la = String(row.lat ?? "").trim();
      const ln = String(row.lng ?? "").trim();
      if (!!la !== !!ln) err = "Enter both latitude and longitude";
      else if (la) {
        loc = parseLatLng(`${la}, ${ln}`);
        if (!loc) err = "Latitude must be -90 to 90 and longitude -180 to 180";
      }
    }
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      let body;
      if (type === "company")
        body = { name: row.name.trim(), address: row.address || null, phone: row.phone || null, status: row.status || lk.list("record_status")[0]?.code,
          logo: row.logo || null, logo_name: row.logo ? row.logo_name || null : null, is_brand: !!row.is_brand };
      else if (type === "shop")
        body = {
          name: row.name.trim(),
          company_id: row.company_id,
          phone: row.phone || null,
          address: row.address || null,
          city: row.city,
          status: row.status,
          lat: loc ? loc.lat : null,
          lng: loc ? loc.lng : null,
        };
      else if (type === "region") body = { name: row.name.trim() };
      else body = { name: row.name.trim(), region_id: row.region_id };
      if (mode === "edit") await api.update(row.id, body);
      else await api.create(body);
      toast.success(`${type[0].toUpperCase() + type.slice(1)} ${mode === "edit" ? "updated" : "added"}`);
      setForm(null);
      reload();
      if (type === "company") brand.reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    const api = { company: companiesApi, shop: shopsApi, region: regionsApi, city: citiesApi }[del.type];
    setBusy(true);
    try {
      await api.remove(del.id);
      toast.success(`${del.name} deleted`);
      setDel(null);
      reload();
      if (del.type === "company") brand.reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const companyRows = useMemo(
    () =>
      (companies || []).filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          String(c.phone || "").toLowerCase().includes(q) ||
          String(c.address || "").toLowerCase().includes(q)
      ),
    [companies, q]
  );
  const shopRows = useMemo(
    () =>
      (shops || []).filter(
        (b) =>
          (regionF === "ALL" || b.region === regionF) &&
          (cityF === "ALL" || b.city === cityF) &&
          (!q ||
            b.name.toLowerCase().includes(q) ||
            String(b.code || "").toLowerCase().includes(q) ||
            String(b.company_name || "").toLowerCase().includes(q))
      ),
    [shops, regionF, cityF, q]
  );
  const regionRows = useMemo(
    () => (regions || []).filter((r) => !q || r.name.toLowerCase().includes(q)),
    [regions, q]
  );
  const cityRows = useMemo(
    () =>
      (cities || []).filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          String(c.region_name || "").toLowerCase().includes(q)
      ),
    [cities, q]
  );

  const pgKey = `${tab}|${q}|${regionF}|${cityF}`;
  const companyPage = usePaged(companyRows, pgKey);
  const shopPage = usePaged(shopRows, pgKey);
  const regionPage = usePaged(regionRows, pgKey);
  const cityPage = usePaged(cityRows, pgKey);
  const firstStatus = lk.list("record_status")[0]?.code || "";

  const headings = {
    companies: ["Companies", "Add company", () => setForm({ type: "company", mode: "new", row: { status: firstStatus } })],
    shops: ["Shops", "Add shop", () => setForm({ type: "shop", mode: "new", row: { status: firstStatus, company_id: "" } })],
    regions: ["Regions", "Add region", () => setForm({ type: "region", mode: "new", row: {} })],
    cities: ["Cities", "Add city", () => setForm({ type: "city", mode: "new", row: { region_id: "" } })],
  };
  const [h1, addLabel, onAdd] = headings[tab];
  const kind = { shops: "shops", regions: "regions", cities: "cities" }[tab];

  if (loading || error)
    return (
      <>
        <div className="ord-head">
          <h1>{h1}</h1>
        </div>
        <div className="empty" style={{ padding: 40 }}>{error || "Loading…"}</div>
      </>
    );

  const shopsOfCity = (name) => (shops || []).filter((b) => b.city === name).length;

  return (
    <>
      <div className="ord-head">
        <h1>{h1}</h1>
        <div className="ord-head__actions">
          {kind && can(MOD, "import") && <ImportButton kind={kind} title={`Import ${h1.toLowerCase()}`} onDone={reload} />}
          {kind && can(MOD, "export") && <ExportButton kind={kind} />}
          {can(MOD, "add") && (
            <button className="btn" onClick={onAdd}>
              <Icon name="plus" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="tabs cbtabs-row" style={{ marginBottom: 18 }}>
        {[
          ["companies", "Companies", companies.length],
          ["shops", "Shops", shops.length],
          ["regions", "Regions", regions.length],
          ["cities", "Cities", cities.length],
        ].map(([k, label, count]) => (
          <button
            key={k}
            className={"tab" + (tab === k ? " is-active" : "")}
            onClick={() => setTab(k)}
          >
            {label} <span className="tab__count">({count})</span>
          </button>
        ))}
        <div className="cbtabs-right">
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
        </div>
      </div>

      {tab === "companies" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Company ID</th>
                <th>Company Name</th>
                <th>Company Address</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companyPage.rows.length ? (
                companyPage.rows.map((c) => (
                  <tr key={c.id}>
                    <td><span className="id-cell">CMP-{pad(c.id)}</span></td>
                    <td>
                      <span className="strong" style={{ color: "var(--plum)" }}>{c.name}</span>
                    </td>
                    <td>{c.address || "—"}</td>
                    <td className="strong">{c.phone || "—"}</td>
                    <td><span className={`badge ${c.status === "Active" ? "b-green" : "b-grey"}`}>{lk.label("record_status", c.status)}</span></td>
                    <td>
                      <div className="actions">
                        <button className="iconbtn view" title="View" aria-label="View company" onClick={async () => {
                          try { setCompanyView(await companiesApi.get(c.id)); } catch (e) { toast.error(e.message); }
                        }}>
                          <Icon name="eye" />
                        </button>
                        {can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit company" onClick={async () => {
                            try { const full = await companiesApi.get(c.id); setForm({ type: "company", mode: "edit", row: { ...c, ...full } }); }
                            catch (e) { toast.error(e.message); }
                          }}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete company" onClick={() => setDel({ type: "company", id: c.id, name: c.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6}><div className="empty">{companies.length ? "No companies match" : "No companies yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "companies" && companyPage.pager}

      {tab === "shops" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Shop ID</th>
                <th>Shop Name</th>
                <th>Company</th>
                <th>Shop Phone No</th>
                <th>Shop Address</th>
                <th className="th-filter">
                  <HeadFilter
                    label="Region"
                    active={regionF !== "ALL"}
                    options={[
                      { value: "ALL", label: "All regions", selected: regionF === "ALL" },
                      ...regions.map((r) => ({ value: r.name, label: r.name, selected: regionF === r.name })),
                    ]}
                    onSelect={setRegionF}
                  />
                </th>
                <th className="th-filter">
                  <HeadFilter
                    label="City"
                    active={cityF !== "ALL"}
                    options={[
                      { value: "ALL", label: "All cities", selected: cityF === "ALL" },
                      ...shopCities.map((c) => ({ value: c, label: c, selected: cityF === c })),
                    ]}
                    onSelect={setCityF}
                    searchable
                    placeholder="Enter city"
                  />
                </th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shopPage.rows.length ? (
                shopPage.rows.map((b) => (
                  <tr key={b.id}>
                    <td><span className="id-cell">{b.code || "N/A"}</span></td>
                    <td className="strong">
                      {shopLatLng(b) && (
                        <a className="loc-pin ok" href={`https://www.google.com/maps?q=${b.lat},${b.lng}`} target="_blank" rel="noreferrer" aria-label="Open shop location">📍</a>
                      )}
                      {b.name}
                    </td>
                    <td className="strong">{b.company_name || "—"}</td>
                    <td className="strong">{b.phone || "—"}</td>
                    <td>{b.address || "—"}</td>
                    <td><span className={`badge rg-${b.region}`}>{b.region || "—"}</span></td>
                    <td className="strong">{b.city || "—"}</td>
                    <td><span className={`badge ${b.status === "Active" ? "b-green" : "b-grey"}`}>{lk.label("record_status", b.status)}</span></td>
                    <td>
                      <div className="actions">
                        {b.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!b.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit shop" onClick={() => setForm({ type: "shop", mode: "edit", row: { ...b } })}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {!b.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete shop" onClick={() => setDel({ type: "shop", id: b.id, name: b.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9}><div className="empty">{shops.length ? "No shops match" : "No shops yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "shops" && shopPage.pager}

      {tab === "regions" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Region ID</th>
                <th>Region Name</th>
                <th>Cities</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regionPage.rows.length ? (
                regionPage.rows.map((r) => (
                  <tr key={r.id}>
                    <td><span className="id-cell">{r.id}</span></td>
                    <td className="strong" style={{ color: "var(--ink)" }}>{r.name}</td>
                    <td className="strong">{r.city_count ?? cities.filter((c) => c.region_id === r.id).length}</td>
                    <td>
                      <div className="actions">
                        {r.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!r.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit region" onClick={() => setForm({ type: "region", mode: "edit", row: { ...r } })}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {!r.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete region" onClick={() => setDel({ type: "region", id: r.id, name: r.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4}><div className="empty">{regions.length ? "No regions match" : "No regions yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "regions" && regionPage.pager}

      {tab === "cities" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>City ID</th>
                <th>City Name</th>
                <th>Region</th>
                <th>Shops</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cityPage.rows.length ? (
                cityPage.rows.map((c) => (
                  <tr key={c.id}>
                    <td><span className="id-cell">{c.id}</span></td>
                    <td className="strong" style={{ color: "var(--ink)" }}>{c.name}</td>
                    <td><span className={`badge rg-${c.region_name}`}>{c.region_name || "—"}</span></td>
                    <td className="strong">{c.shop_count ?? shopsOfCity(c.name)}</td>
                    <td>
                      <div className="actions">
                        {c.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!c.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit city" onClick={() => setForm({ type: "city", mode: "edit", row: { ...c } })}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {!c.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete city" onClick={() => setDel({ type: "city", id: c.id, name: c.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5}><div className="empty">{cities.length ? "No cities match" : "No cities yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "cities" && cityPage.pager}

      {companyView && (
        <Modal wide cls="ov-modal" hideFoot onClose={() => setCompanyView(null)}>
          <button className="ov__close" onClick={() => setCompanyView(null)} aria-label="Close"><Icon name="x" /></button>
          <div className="ov">
            <div className="ov__side">
              {companyView.logo && <img className="cv-logo" src={companyView.logo} alt={companyView.name} />}
              <div className="ov__id">CMP-{pad(companyView.id)}</div>
              <span className={`badge ${companyView.status === "Active" ? "b-green" : "b-grey"}`}>{lk.label("record_status", companyView.status)}</span>
              <div className="ov__mini"><div className="lbl">Company</div><div className="val">{companyView.name}</div></div>
              <div className="ov__mini"><div className="lbl">Phone</div><div className="val">{companyView.phone || "—"}</div></div>
            </div>
            <div className="ov__main">
              <h3 className="sec" style={{ marginBottom: 14 }}>Company details</h3>
              <div className="dl">
                <div><span className="dl-k">Company ID</span><span className="dl-v">CMP-{pad(companyView.id)}</span></div>
                <div><span className="dl-k">Status</span><span className="dl-v">{lk.label("record_status", companyView.status)}</span></div>
                <div><span className="dl-k">Company name</span><span className="dl-v">{companyView.name}</span></div>
                <div><span className="dl-k">Phone number</span><span className="dl-v">{companyView.phone || "—"}</span></div>
                <div style={{ gridColumn: "span 2" }}><span className="dl-k">Company address</span><span className="dl-v">{companyView.address || "—"}</span></div>
                <div><span className="dl-k">Logo</span><span className="dl-v">{companyView.logo ? companyView.logo_name || "Uploaded" : "—"}</span></div>
                <div><span className="dl-k">Used across the app</span><span className="dl-v">{companyView.is_brand ? "Yes" : "No"}</span></div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {form && (
        <FormModal
          form={form}
          setForm={setForm}
          companies={companies}
          regions={regions}
          cities={cities}
          busy={busy}
          onSave={save}
          statusOptions={lk.options("record_status")}
        />
      )}

      {del && (
        <ConfirmDelete
          what={del.type}
          note={`${del.name} will be removed.`}
          busy={busy}
          onClose={() => setDel(null)}
          onConfirm={doDelete}
        />
      )}
    </>
  );
}

function ShopLocation({ row, setForm }) {
  const setLoc = (lat, lng) => setForm((f) => ({ ...f, row: { ...f.row, lat, lng } }));
  const onPaste = (e) => {
    const p = parseLatLng(e.clipboardData.getData("text"));
    if (p) {
      e.preventDefault();
      setLoc(String(p.lat), String(p.lng));
    }
  };
  return (
    <div className="field-row">
      <div className="field">
        <label>Latitude</label>
        <input className="input" inputMode="decimal" aria-label="Latitude" placeholder="Enter latitude"
          value={row.lat ?? ""} onPaste={onPaste} onChange={(e) => setLoc(decimalSigned(e.target.value), row.lng ?? "")} />
      </div>
      <div className="field">
        <label>Longitude</label>
        <input className="input" inputMode="decimal" aria-label="Longitude" placeholder="Enter longitude"
          value={row.lng ?? ""} onPaste={onPaste} onChange={(e) => setLoc(row.lat ?? "", decimalSigned(e.target.value))} />
      </div>
    </div>
  );
}

function FormModal({ form, setForm, companies, regions, cities, busy, onSave, statusOptions }) {
  const { type, mode, row } = form;
  const set = (k, v) => setForm((f) => ({ ...f, row: { ...f.row, [k]: v } }));
  const regionOf = (cityName) => (cities.find((c) => c.name === cityName) || {}).region_name || "";
  const shopCities = cities.filter((c) => !row.region || c.region_name === row.region);
  const titles = {
    company: mode === "edit" ? "Edit company" : "Add company",
    shop: mode === "edit" ? "Edit shop" : "Add shop",
    region: mode === "edit" ? "Edit region" : "Add region",
    city: mode === "edit" ? "Edit city" : "Add city",
  };
  return (
    <Modal
      title={titles[type]}
      submit={mode === "edit" ? "Save changes" : titles[type]}
      busy={busy}
      onClose={() => setForm(null)}
      onSubmit={onSave}
    >
      {type === "company" && (
        <>
          <div className="field">
            <label>Company name</label>
            <input className="input" aria-label="Company name" value={row.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Enter company name" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Phone number</label>
              <input placeholder="Enter phone number" className="input" inputMode="tel" value={row.phone || ""} onChange={(e) => set("phone", phoneText(e.target.value))} />
            </div>
            <div className="field">
              <label>Status</label>
              <Select placeholder="Select status" value={row.status || ""} options={statusOptions} onChange={(v) => set("status", v)} />
            </div>
          </div>
          <div className="field">
            <label>Company address</label>
            <input placeholder="Enter company address" className="input" value={row.address || ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <LogoField row={row} set={set} />
          <div className="rowline brand-row">
            <span>Use this name &amp; logo across the app</span>
            <Switch on={!!row.is_brand} label="Use this name and logo across the app" onChange={(v) => set("is_brand", v)} />
          </div>
        </>
      )}

      {type === "shop" && (
        <>
          <div className="field-row">
            {mode === "edit" && (
              <div className="field">
                <label>Shop ID</label>
                <input className="input ro-field" value={row.code || "N/A"} readOnly tabIndex={-1} />
              </div>
            )}
            <div className="field">
              <label>Shop name</label>
              <input placeholder="Enter shop name" className="input" value={row.name || ""} onChange={(e) => set("name", e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Company</label>
              <Select placeholder="Select company" value={row.company_id || ""} options={companies.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(v) => set("company_id", v)} />
            </div>
            <div className="field">
              <label>Shop phone no</label>
              <input placeholder="Enter shop phone number" className="input" inputMode="tel" value={row.phone || ""} onChange={(e) => set("phone", phoneText(e.target.value))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Region</label>
              <Select placeholder="Select region" searchPlaceholder="Search region" value={row.region || ""} clearable
                options={regions.map((r) => r.name)}
                onChange={(v) => setForm((f) => ({ ...f, row: { ...f.row, region: v, city: v && regionOf(f.row.city) !== v ? "" : f.row.city } }))} />
            </div>
            <div className="field">
              <label>City</label>
              <Select placeholder="Select city" searchPlaceholder="Search city" value={row.city || ""}
                options={shopCities.map((c) => c.name)}
                onChange={(v) => setForm((f) => ({ ...f, row: { ...f.row, city: v, region: regionOf(v) || f.row.region } }))} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Status</label>
              <Select placeholder="Select status" value={row.status || ""} options={statusOptions} onChange={(v) => set("status", v)} />
            </div>
            <div className="field">
              <label>Shop address</label>
              <input placeholder="Enter shop address" className="input" value={row.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>
          <ShopLocation row={row} setForm={setForm} />
        </>
      )}

      {type === "region" && (
        <div className="field">
          <label>Region name</label>
          <input className="input" value={row.name || ""} onChange={(e) => set("name", onlyLetters(e.target.value))} placeholder="Enter region name" />
        </div>
      )}

      {type === "city" && (
        <div className="field-row">
          <div className="field">
            <label>City name</label>
            <input placeholder="Enter city name" className="input" value={row.name || ""} onChange={(e) => set("name", onlyLetters(e.target.value))} />
          </div>
          <div className="field">
            <label>Region</label>
            <Select placeholder="Select region" searchPlaceholder="Search region" value={row.region_id || ""}
              options={regions.map((r) => ({ value: r.id, label: r.name }))} onChange={(v) => set("region_id", v)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
function LogoField({ row, set }) {
  const toast = useToast();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [working, setWorking] = useState(false);
  const take = async (file) => {
    if (!file) return;
    setWorking(true);
    try {
      const url = await imageFileToDataURL(file);
      set("logo", url);
      set("logo_name", file.name || "logo");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="field">
      <label>Company logo</label>
      <div className="lg-up">
        <div
          className={`lg-box ${row.logo ? "" : "empty"} ${over ? "over" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Upload logo"
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
        >
          {row.logo ? <img src={row.logo} alt="Company logo" /> : <span>{working ? "Loading…" : "Drop logo here or click to upload"}</span>}
        </div>
        <div className="lg-act">
          <button type="button" className="btn btn--ghost" onClick={() => input.current?.click()} disabled={working}>{row.logo ? "Change logo" : "Upload logo"}</button>
          {row.logo && <button type="button" className="btn btn--ghost lg-rm" onClick={() => { set("logo", null); set("logo_name", null); }}>Remove</button>}
          {row.logo && row.logo_name && <span className="sub lg-name">{row.logo_name}</span>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*,.svg,.ico,.bmp,.avif,.webp,.jfif" hidden aria-label="Logo file" onChange={(e) => take(e.target.files?.[0])} />
    </div>
  );
}
