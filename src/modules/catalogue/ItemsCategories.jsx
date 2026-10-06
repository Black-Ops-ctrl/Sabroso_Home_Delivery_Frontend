import { useState, useMemo, useRef } from "react";
import Modal from "../../components/common/Modal";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import MultiCityPicker from "../../components/common/MultiCityPicker";
import Select from "../../components/common/Select";
import { usePaged } from "../../components/common/Pager";
import { ExportButton, ImportButton } from "../../components/common/Transfer";
import { useLookups } from "../../context/LookupsContext";
import { amount, wholeNumber } from "../../config/inputs";
import Icon from "../../config/icons";
import { money } from "../../config/format";
import { Seg } from "../../components/loyalty/LoyaltyControls";
import { useApi } from "../../hooks/useApi";
import { itemsApi, categoriesApi, companiesApi, citiesApi, tiersApi } from "../../services/api";
import { tierCls } from "../../config/loyalty";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePageSearch } from "../../context/SearchContext";

const MOD = "Items & Categories";
const MAX_IMG = 10 * 1024 * 1024;

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("The image could not be read"));
    r.readAsDataURL(file);
  });

function ImagePick({ src, onPick, onRemove, onError }) {
  const input = useRef(null);
  return (
    <div className="img-pick">
      <div className="img-pick__box">
        {src ? (
          <img src={src} alt="Item" />
        ) : (
          <>
            <Icon name="image" />
            <span>No image</span>
          </>
        )}
      </div>
      <div className="img-pick__btns">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current?.click()}>
          <Icon name="upload" />
          <span>{src ? "Change image" : "Add image"}</span>
        </button>
        {src && (
          <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>
            <Icon name="trash" />
            <span>Remove</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > MAX_IMG) {
            onError("The image is larger than 10 MB. Choose a smaller image");
            return;
          }
          try {
            onPick(await readFile(f), f);
          } catch (err) {
            onError(err.message);
          }
        }}
      />
    </div>
  );
}

export default function ItemsCategories() {
  const toast = useToast();
  const { can } = useAuth();
  const lk = useLookups();
  const { data, loading, error, reload } = useApi(
    () => Promise.all([itemsApi.list(), categoriesApi.list(), companiesApi.list(), citiesApi.list(), tiersApi.list()]),
    [],
    ["items", "categories", "companies", "cities", "tiers"]
  );
  const setFormErr = (m) => {
    if (m) toast.error(m);
  };
  const [items, categories, companies, cities, tiersRaw] = data || [[], [], [], [], []];
  const tiers = [...(tiersRaw || [])].sort((a, b) => Number(a.threshold) - Number(b.threshold));
  const cityNames = (cities || []).map((c) => c.name);

  const [tab, setTab] = useState("items");
  const search = usePageSearch(tab);
  const [itemForm, setItemForm] = useState(null);
  const [catForm, setCatForm] = useState(null);
  const [catView, setCatView] = useState(null);
  const [itemView, setItemView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const q = search.query.toLowerCase();
  const itemRows = useMemo(
    () =>
      (items || []).filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          String(i.code || "").toLowerCase().includes(q) ||
          String(i.category_name || "").toLowerCase().includes(q)
      ),
    [items, q]
  );
  const catRows = useMemo(
    () => (categories || []).filter((c) => !q || c.name.toLowerCase().includes(q) || String(c.code || "").toLowerCase().includes(q)),
    [categories, q]
  );
  const itemPage = usePaged(itemRows, `i|${q}`);
  const catPage = usePaged(catRows, `c|${q}`);
  const setI = (k, v) => {
    
    setItemForm((f) => ({ ...f, [k]: v }));
  };

  const saveItem = async () => {
    const f = itemForm;
    const pts = String(f.points ?? "").trim();
    let err = !String(f.name || "").trim()
      ? "Item name is required"
      : !f.category_id
      ? "Please select a category"
      : String(f.price ?? "").trim() === ""
      ? "Price is required"
      : f.availability === "Except" && !(f.cities || []).length
      ? "Pick the cities where this item is not available"
      : null;
    const td = {};
    if (!err) {
      for (const t of tiers) {
        const v = String((f.tier_discounts || {})[t.id] ?? "").trim();
        if (v === "") {
          td[t.id] = null;
          continue;
        }
        const x = Number(v);
        if (!Number.isFinite(x) || x < 0 || x > 100) {
          err = `${t.name} discount must be between 0 and 100`;
          break;
        }
        td[t.id] = x;
      }
    }
    if (err) {
      setFormErr(err);
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: f.name.trim().replace(/\s+/g, " "),
        category_id: f.category_id,
        company_id: f.company_id || null,
        price: Number(f.price) || 0,
        remarks: f.remarks || null,
        availability: f.availability,
        cities: f.availability === "Except" ? f.cities || [] : [],
        points: pts === "" ? null : Number(pts),
        points_multiplier: Number(f.points_multiplier) || 1,
        multiplier_until: Number(f.points_multiplier) > 1 && f.multiplier_until ? f.multiplier_until : null,
        tier_discounts: td,
      };
      const res = f.mode === "edit" ? await itemsApi.update(f.id, body) : await itemsApi.create(body);
      const id = res.data?.id || f.id;
      let imgErr = null;
      if (f.imageData) {
        try {
          await itemsApi.saveImage(id, f.imageData);
        } catch (e) {
          imgErr = e.message;
        }
      } else if (f.imageRemoved && f.has_image) {
        try {
          await itemsApi.removeImage(id);
        } catch (e) {
          imgErr = e.message;
        }
      }
      reload();
      if (imgErr) {
        setItemForm((x) => ({ ...x, mode: "edit", id, has_image: false }));
        setFormErr(`Item saved, but the image was not: ${imgErr}`);
        return;
      }
      toast.success(`Item ${f.mode === "edit" ? "updated" : "added"}`);
      setItemForm(null);
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveCat = async () => {
    if (!String(catForm.name || "").trim()) {
      setFormErr("Category name is required");
      return;
    }
    setBusy(true);
    try {
      const body = { name: catForm.name.trim() };
      if (catForm.mode === "edit") await categoriesApi.update(catForm.id, body);
      else await categoriesApi.create(body);
      toast.success(`Category ${catForm.mode === "edit" ? "updated" : "added"}`);
      setCatForm(null);
      reload();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    const api = del.type === "item" ? itemsApi : categoriesApi;
    setBusy(true);
    try {
      await api.remove(del.id);
      toast.success(`${del.name} deleted`);
      setDel(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || error)
    return (
      <>
        <div className="ord-head">
          <h1>Items</h1>
        </div>
        <div className="empty" style={{ padding: 40 }}>{error || "Loading…"}</div>
      </>
    );

  const itemsInCat = (catId) => (items || []).filter((i) => i.category_id === catId);

  return (
    <>
      <div className="ord-head">
        <h1>{tab === "items" ? "Items" : "Categories"}</h1>
        <div className="ord-head__actions">
          {can(MOD, "import") && (
            <ImportButton kind={tab === "items" ? "items" : "categories"} title={tab === "items" ? "Import items" : "Import categories"} onDone={reload} />
          )}
          {can(MOD, "export") && <ExportButton kind={tab === "items" ? "items" : "categories"} />}
          {can(MOD, "add") &&
            (tab === "items" ? (
              <button
                className="btn"
                onClick={() => {
                  
                  setItemForm({
                    mode: "new",
                    code: "",
                    name: "",
                    category_id: "",
                    company_id: "",
                    price: "",
                    remarks: "",
                    availability: "Nationwide",
                    cities: [],
                    points: "",
                    points_multiplier: 1,
                    multiplier_until: "",
                    tier_discounts: {},
                  });
                }}
              >
                <Icon name="plus" />
                <span>Add item</span>
              </button>
            ) : (
              <button className="btn" onClick={() => {  setCatForm({ mode: "new", name: "", code: "" }); }}>
                <Icon name="plus" />
                <span>Add category</span>
              </button>
            ))}
        </div>
      </div>

      <div className="tabs cbtabs-row" style={{ marginBottom: 18 }}>
        <button className={"tab" + (tab === "items" ? " is-active" : "")} onClick={() => setTab("items")}>
          Items <span className="tab__count">({items.length})</span>
        </button>
        <button className={"tab" + (tab === "categories" ? " is-active" : "")} onClick={() => setTab("categories")}>
          Categories <span className="tab__count">({categories.length})</span>
        </button>
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

      {tab === "items" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Points</th>
                <th>Availability</th>
                <th>Remarks</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {itemPage.rows.length ? (
                itemPage.rows.map((i) => (
                  <tr key={i.id}>
                    <td><span className="id-cell">{i.code || "N/A"}</span></td>
                    <td className="strong">{i.name}</td>
                    <td><span className="badge b-plum">{i.category_name || "—"}</span></td>
                    <td className="strong">{money(i.price)}</td>
                    <td className="nowrap">
                      {Number(i.points) > 0 ? <span className="strong">{Number(i.points)} pts</span> : <span className="sub">—</span>}
                      {Number(i.points_multiplier) > 1 && (!i.multiplier_until || new Date(i.multiplier_until) >= new Date(new Date().toDateString())) && (
                        <span className="ly-xtag">{Number(i.points_multiplier)}x</span>
                      )}
                    </td>
                    <td>
                      {i.availability === "Except" ? (
                        <>
                          <span className="badge b-amber">Except cities</span>
                          {Array.isArray(i.cities) && i.cities.length > 0 && (
                            <div className="sub">Not in: {i.cities.join(", ")}</div>
                          )}
                        </>
                      ) : (
                        <span className="badge b-green">Nationwide</span>
                      )}
                    </td>
                    <td>{i.remarks || "—"}</td>
                    <td>
                      <div className="actions">
                        <button className="iconbtn view" title="View" aria-label="View item" onClick={() => setItemView(i)}>
                          <Icon name="eye" />
                        </button>
                        {i.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!i.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit item" onClick={() => {  setItemForm({ mode: "edit", ...i, code: i.code || "", price: String(Number(i.price)), points: i.points ?? "", points_multiplier: Number(i.points_multiplier) || 1, multiplier_until: i.multiplier_until ? String(i.multiplier_until).slice(0, 10) : "", tier_discounts: Object.fromEntries(Object.entries(i.tier_discounts || {}).map(([k, v]) => [k, v ?? ""])) }); }}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {!i.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete item" onClick={() => setDel({ type: "item", id: i.id, name: i.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8}><div className="empty">{items.length ? "No items match" : "No items yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "items" && itemPage.pager}

      {tab === "categories" && (
        <div className="tablewrap cb-wrap">
          <table className="ord-table cb-table">
            <thead>
              <tr>
                <th>Category ID</th>
                <th>Category Name</th>
                <th>Items</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {catPage.rows.length ? (
                catPage.rows.map((c) => (
                  <tr key={c.id}>
                    <td><span className="id-cell">{c.code || "N/A"}</span></td>
                    <td className="strong">{c.name}</td>
                    <td className="strong">{c.item_count ?? itemsInCat(c.id).length}</td>
                    <td>
                      <div className="actions">
                        <button className="iconbtn view" title="View items" aria-label="View items" onClick={() => setCatView(c)}>
                          <Icon name="eye" />
                        </button>
                        {c.synced && <span className="lock-tag" aria-label="Data Sync record"><Icon name="lock" /></span>}
                        {!c.synced && can(MOD, "edit") && (
                          <button className="iconbtn edit" title="Edit" aria-label="Edit category" onClick={() => {  setCatForm({ mode: "edit", id: c.id, name: c.name, code: c.code || "" }); }}>
                            <Icon name="edit" />
                          </button>
                        )}
                        {!c.synced && can(MOD, "delete") && (
                          <button className="iconbtn del" title="Delete" aria-label="Delete category" onClick={() => setDel({ type: "category", id: c.id, name: c.name })}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4}><div className="empty">{categories.length ? "No categories match" : "No categories yet"}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "categories" && catPage.pager}

      {itemForm && (
        <Modal
          title={itemForm.mode === "edit" ? "Edit item" : "Add item"}
          submit={itemForm.mode === "edit" ? "Save changes" : "Add item"}
          busy={busy}
          cls="modal--item"
          onClose={() => setItemForm(null)}
          onSubmit={saveItem}
        >
          <div className="im-sec">Item image</div>
          <ImagePick
            src={itemForm.imageData || (!itemForm.imageRemoved && itemForm.has_image ? itemsApi.imageUrl(itemForm) : null)}
            onPick={(d) => {
              
              setItemForm((f) => ({ ...f, imageData: d, imageRemoved: false }));
            }}
            onRemove={() => setItemForm((f) => ({ ...f, imageData: null, imageRemoved: true }))}
            onError={setFormErr}
          />
          <div className="im-sec">Item details</div>
          <div className="im-grid">
            {itemForm.mode === "edit" && (
              <div className="field">
                <label>Item code</label>
                <input className="input ro-field" aria-label="Item code" value={itemForm.code || "N/A"} readOnly tabIndex={-1} />
              </div>
            )}
            <div className="field im-s3">
              <label>Item name</label>
              <input className="input" aria-label="Item name" placeholder="Enter item name" value={itemForm.name || ""} onChange={(e) => setI("name", e.target.value)} />
            </div>
            <div className="field">
              <label>Category</label>
              <Select ariaLabel="Category" placeholder="Select category" value={itemForm.category_id || ""}
                options={categories.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => setI("category_id", v)} />
            </div>
            <div className="field">
              <label>Company</label>
              <Select ariaLabel="Company" placeholder="Select company" value={itemForm.company_id || ""} clearable
                options={companies.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => setI("company_id", v)} />
            </div>
            <div className="field">
              <label>Price (Rs)</label>
              <input className="input" inputMode="decimal" aria-label="Price" placeholder="Enter price" value={itemForm.price ?? ""} onChange={(e) => setI("price", amount(e.target.value))} />
            </div>
            <div className="field">
              <label>Availability</label>
              <Select ariaLabel="Availability" placeholder="Select availability" value={itemForm.availability || ""}
                options={lk.options("availability")} onChange={(v) => setI("availability", v)} />
            </div>
            <div className="im-s2">
              <MultiCityPicker value={itemForm.cities || []} options={cityNames} disabled={itemForm.availability !== "Except"} onChange={(cs) => setI("cities", cs)} />
            </div>
            <div className="field im-s2">
              <label>Remarks</label>
              <input className="input" aria-label="Remarks" placeholder="Enter remarks" value={itemForm.remarks || ""} onChange={(e) => setI("remarks", e.target.value)} />
            </div>
          </div>
          <div className="im-sec">Loyalty points</div>
          <div className="im-grid">
            <div className="field">
              <label>Points (for 1 item)</label>
              <input className="input" inputMode="numeric" aria-label="Item points" placeholder="Enter points"
                value={itemForm.points ?? ""} onChange={(e) => setI("points", wholeNumber(e.target.value))} />
            </div>
            <div className="field">
              <label>Points multiplier</label>
              <Seg value={String(Number(itemForm.points_multiplier) || 1)} options={[["1", "1x"], ["2", "2x"], ["3", "3x"]]} label="Points multiplier"
                onChange={(v) => setItemForm((f) => ({ ...f, points_multiplier: Number(v) }))} />
            </div>
            <div className="field im-s2">
              <label>Multiplier valid until</label>
              <input className="input" type="date" aria-label="Multiplier valid until" disabled={!(Number(itemForm.points_multiplier) > 1)}
                value={itemForm.multiplier_until || ""} onChange={(e) => setItemForm((f) => ({ ...f, multiplier_until: e.target.value }))} />
            </div>
          </div>
          {tiers.length > 0 && (
            <>
              <div className="im-sec">Tier discount on this item</div>
              <div className="im-grid im-tiers">
                {tiers.map((t) => (
                  <div className="field" key={t.id}>
                    <label>{t.name} (%)</label>
                    <input className="input" inputMode="decimal" aria-label={`${t.name} discount on this item`}
                      placeholder="Enter %"
                      value={(itemForm.tier_discounts || {})[t.id] ?? ""}
                      onChange={(e) => setItemForm((f) => ({ ...f, tier_discounts: { ...(f.tier_discounts || {}), [t.id]: amount(e.target.value) } }))} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {itemView && (
        <Modal wide cls="ov-modal" hideFoot onClose={() => setItemView(null)}>
          <button className="ov__close" onClick={() => setItemView(null)} aria-label="Close"><Icon name="x" /></button>
          <div className="ov">
            <div className="ov__side">
              {itemView.has_image && (
                <div className="ov__img">
                  <img src={itemsApi.imageUrl(itemView)} alt={itemView.name} />
                </div>
              )}
              <div className="ov__id">{itemView.code || "N/A"}</div>
              <span className={`badge ${itemView.availability === "Except" ? "b-amber" : "b-green"}`}>{itemView.availability === "Except" ? "Except cities" : "Nationwide"}</span>
              <div className="ov__mini"><div className="lbl">Name</div><div className="val">{itemView.name}</div></div>
              <div className="ov__mini"><div className="lbl">Category</div><div className="val">{itemView.category_name || "—"}</div></div>
              <div className="ov__mini"><div className="lbl">Company</div><div className="val">{itemView.company_name || "—"}</div></div>
              <div className="ov__amt"><div className="lbl ly-ptlbl">Price</div><div className="num">{money(itemView.price)}</div></div>
              <div className="ov__mini"><div className="lbl">Loyalty points</div><div className="val">{Number(itemView.points) > 0 ? `${Number(itemView.points)} pts · ${Number(itemView.points_multiplier) || 1}x` : "—"}</div></div>
            </div>
            <div className="ov__main">
              <h3 className="sec" style={{ marginBottom: 14 }}>Item details</h3>
              <div className="dl">
                <div><span className="dl-k">Item code</span><span className="dl-v">{itemView.code || "N/A"}</span></div>
                <div><span className="dl-k">Category</span><span className="dl-v">{itemView.category_name || "—"}</span></div>
                <div><span className="dl-k">Company</span><span className="dl-v">{itemView.company_name || "—"}</span></div>
                <div><span className="dl-k">Price</span><span className="dl-v">{money(itemView.price)}</span></div>
                <div><span className="dl-k">Availability</span><span className="dl-v">{itemView.availability === "Except" ? "Except cities" : "Nationwide"}</span></div>
                <div><span className="dl-k">Not available in</span><span className="dl-v">{Array.isArray(itemView.cities) && itemView.cities.length ? itemView.cities.join(", ") : "—"}</span></div>
                <div style={{ gridColumn: "span 2" }}><span className="dl-k">Remarks</span><span className="dl-v">{itemView.remarks || "—"}</span></div>
              </div>
              <h3 className="sec" style={{ margin: "20px 0 12px" }}>Loyalty points</h3>
              <div className="dl">
                <div><span className="dl-k">Points (for 1 item)</span><span className="dl-v">{Number(itemView.points) > 0 ? Number(itemView.points) : "—"}</span></div>
                <div><span className="dl-k">Multiplier</span><span className="dl-v">{Number(itemView.points_multiplier) || 1}x{Number(itemView.points_multiplier) > 1 && itemView.multiplier_until ? ` · until ${new Date(itemView.multiplier_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}</span></div>
              </div>
              {tiers.length > 0 && (
                <>
                  <h3 className="sec" style={{ margin: "20px 0 10px" }}>Tier discount on this item</h3>
                  <div className="tablewrap">
                    <table className="ord-table cb-table im-td">
                      <thead><tr><th>Tier</th><th>Normal</th><th>This item</th><th>Discount on 1 item</th></tr></thead>
                      <tbody>
                        {tiers.map((t) => {
                          const own = (itemView.tier_discounts || {})[t.id];
                          const has = own !== null && own !== undefined && own !== "";
                          const pct = has ? Number(own) : t.discount_type === "Rs" ? null : Number(t.discount);
                          return (
                            <tr key={t.id}>
                              <td><span className={`badge ${tierCls(t.card)}`}>{t.name}</span></td>
                              <td className="sub">{t.discount_type === "Rs" ? `Rs ${Number(t.discount)}` : `${Number(t.discount)}%`}</td>
                              <td className="strong" style={{ color: has ? "var(--plum)" : undefined }}>{has ? `${Number(own)}%` : "Normal"}</td>
                              <td className="strong" style={{ color: "var(--bad)" }}>{pct === null ? "—" : `− ${money(Math.round((Number(itemView.price) * pct) / 100))}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {catForm && (
        <Modal
          title={catForm.mode === "edit" ? "Edit category" : "Add category"}
          submit={catForm.mode === "edit" ? "Save changes" : "Add category"}
          busy={busy}
          onClose={() => setCatForm(null)}
          onSubmit={saveCat}
        >
          {catForm.mode === "edit" && (
            <div className="field">
              <label>Category ID</label>
              <input className="input ro-field" value={catForm.code || "N/A"} readOnly tabIndex={-1} />
            </div>
          )}
          <div className="field">
            <label>Category name</label>
            <input className="input" placeholder="Enter category name" value={catForm.name || ""}
              onChange={(e) => {  setCatForm((f) => ({ ...f, name: e.target.value })); }} />
          </div>
        </Modal>
      )}

      {catView && (
        <Modal
          title={`${catView.name} — items (${itemsInCat(catView.id).length})`}
          submit="Close"
          hideCancel
          onClose={() => setCatView(null)}
          onSubmit={() => setCatView(null)}
        >
          {itemsInCat(catView.id).length ? (
            <div className="viewlist">
              {itemsInCat(catView.id).map((i) => (
                <div className="rowline" key={i.id}>
                  <div>
                    <div className="strong">{i.name}</div>
                    <div className="sub">{i.code || "N/A"}</div>
                  </div>
                  <div className="strong">{money(i.price)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 22 }}>No items in this category</div>
          )}
        </Modal>
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