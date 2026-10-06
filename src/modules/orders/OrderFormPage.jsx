import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../../config/icons";
import { money, num } from "../../config/format";
import { flow, payments, channels, statusLabel, LOCKED } from "../../config/orders";
import { onlyLetters, mobile10, amount, wholeNumber, check, firstError } from "../../config/inputs";
import Select from "../../components/common/Select";
import PageHead from "../../components/common/PageHead";
import { useLookups } from "../../context/LookupsContext";
import { tierCls, discText } from "../../config/loyalty";
import { ordersApi, itemsApi, shopsApi, loyaltyApi, settingsApi } from "../../services/api";
import Modal from "../../components/common/Modal";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import AddressAutocomplete from "../../components/common/AddressAutocomplete";
// import { Seg } from "../../components/loyalty/LoyaltyControls";
import { roadKmMany, shopLatLng, straightKm, chargeFor } from "../../config/googleMaps";

const digits = (v) => String(v || "").replace(/\D/g, "").slice(-10);

export default function OrderFormPage({ appOnly = false }) {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const toast = useToast();
  const { user, can } = useAuth();
  const MOD = appOnly ? "Shopify & App Orders" : "Home Delivery Orders";
  const lookups = useLookups();
  const back = appOnly ? "/app-orders" : "/orders";

  const { data, loading, error } = useApi(
    () => Promise.all([itemsApi.list(), shopsApi.list(), isEdit ? ordersApi.get(id) : Promise.resolve(null)]),
    [id]
  );
  const liveItems = useApi(() => itemsApi.list(), [], ["items", "categories"]);
  const delivery = useApi(() => settingsApi.delivery(), [], ["app_settings"]).data;
  const [items0, shops, order] = data || [[], [], null];
  const items = liveItems.data || items0;
  const chanList = channels();
  const payList = payments();

  const [form, setForm] = useState(null);
  const [cart, setCart] = useState({});
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState({ source: "NONE" });
  const [referrer, setReferrer] = useState("");
  const [join, setJoin] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reasonErr, setReasonErr] = useState("");
  const [auto, setAuto] = useState({ fee: false, km: false });
  const [range, setRange] = useState(null);
  const [oorPop, setOorPop] = useState(false);
  const [oorOk, setOorOk] = useState(false);
  const last = useRef(null);
  const addrRef = useRef(null);
  const reasonRef = useRef(null);
  const nameTyped = useRef(false);
  const ddRef = useRef(null);
  useEffect(() => {
    if (!ddOpen) return undefined;
    const out = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setDdOpen(false); };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [ddOpen]);

  useEffect(() => {
    if (!data || !lookups.ready) return;
    const o = order;
    if (o && LOCKED.includes(o.status)) {
      toast.error(`${o.code} is ${statusLabel(o.status, appOnly).toLowerCase()} and cannot be edited`);
      nav(back, { replace: true });
      return;
    }
    setForm({
      channel: o?.channel || chanList[0] || "",
      payment_type: o?.payment_type || payList[0]?.[0] || "",
      status: o?.status || "CREATED",
      shop_id: o?.shop_id || "",
      name: o?.customer_name || "",
      phone: digits(o?.customer_phone),
      address: o?.customer_address || "",
      lat: o?.customer_lat != null ? Number(o.customer_lat) : null,
      lng: o?.customer_lng != null ? Number(o.customer_lng) : null,
      fee: o?.fee != null ? Number(o.fee) : "",
      distance_km: o?.distance_km != null ? Number(o.distance_km) : 0,
      remarks: o?.remarks || "",
      cancel_reason: o?.cancel_reason || "",
    });
    last.current = { lat: o?.customer_lat != null ? Number(o.customer_lat) : null, lng: o?.customer_lng != null ? Number(o.customer_lng) : null, shop: String(o?.shop_id || "") };
    if (o?.out_of_range && !o?.oor_cleared_at) {
      setRange({ out: true, km: o.oor_km != null ? Number(o.oor_km) : Number(o.distance_km) || null, shop: o.nearest_shop_name || o.shop_name || "" });
      setOorOk(true);
    }
    if (o) {
      const c = {};
      (o.items || []).forEach((l) => { if (l.item_id) c[l.item_id] = l.qty; });
      setCart(c);
      setChoice({
        source: o.discount_source || "NONE",
        campaign_id: o.campaign_id,
        points: o.points_redeemed || "",
        type: o.discount_input_type || "%",
        value: o.discount_input_value != null ? Number(o.discount_input_value) : "",
      });
      setReferrer(o.referrer_phone ? digits(o.referrer_phone) : "");
      setJoin(!!o.join_loyalty);
      nameTyped.current = true;
    }
  }, [data, lookups.ready]);

  const set = (k, v) => {
    if (k === "status" || k === "cancel_reason") setReasonErr("");
    setForm((f) => ({ ...f, [k]: v }));
  };

  const distReq = useRef(0);
  const autoShop = useRef(null);
  const shop = shops.find((s) => String(s.id) === String(form?.shop_id));
  const shopLoc = shopLatLng(shop);
  useEffect(() => {
    if (!form || !delivery || !last.current) return;
    const prev = last.current;
    const moved = form.lat !== prev.lat || form.lng !== prev.lng;
    const shopChanged = String(form.shop_id || "") !== prev.shop;
    if (!moved && !shopChanged) return;
    last.current = { lat: form.lat, lng: form.lng, shop: String(form.shop_id || "") };
    if (form.lat == null || form.lng == null) {
      setRange(null);
      setOorOk(false);
      return;
    }
    const cust = { lat: form.lat, lng: form.lng };
    const max = delivery.max_km;
    const my = ++distReq.current;
    const located = shops.filter((s) => s.status !== "Inactive" && shopLatLng(s)).map((s) => ({ s, pos: shopLatLng(s), straight: straightKm(shopLatLng(s), cust) }));
    let pool;
    if (moved) {
      const inCircle = max != null ? located.filter((x) => x.straight <= max) : located;
      pool = (inCircle.length ? inCircle : [...located].sort((a, b) => a.straight - b.straight).slice(0, 1)).sort((a, b) => a.straight - b.straight).slice(0, 25);
    } else {
      const one = located.find((x) => String(x.s.id) === String(form.shop_id));
      pool = one ? [one] : [];
    }
    if (!pool.length) return;
    roadKmMany(pool.map((x) => x.pos), cust).then((kms) => {
      if (my !== distReq.current) return;
      const list = pool.map((x, i) => ({ ...x, km: kms[i] })).filter((x) => x.km != null).sort((a, b) => a.km - b.km);
      if (!list.length) return;
      const best = list[0];
      const out = max != null && best.km > max;
      const fee = out ? null : chargeFor(delivery, best.km);
      last.current = { ...last.current, shop: String(best.s.id) };
      if (moved) autoShop.current = best.s.id;
      setForm((f) => ({ ...f, shop_id: best.s.id, distance_km: best.km, ...(fee != null ? { fee } : {}) }));
      setAuto((a) => ({ km: true, fee: fee != null ? true : a.fee }));
      setRange({ out, km: best.km, shop: best.s.name, shopId: best.s.id });
      setOorOk(false);
      if (out) setOorPop(true);
    });
  }, [form?.lat, form?.lng, form?.shop_id, delivery, shops.length]);

  const lines = useMemo(
    () => Object.keys(cart).filter((k) => cart[k] > 0).map((k) => {
      const it = items.find((i) => String(i.id) === String(k));
      return it ? { item_id: it.id, name: it.name, qty: cart[k], price: Number(it.price) } : null;
    }).filter(Boolean),
    [cart, items]
  );
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const subtotal = lines.reduce((t, l) => t + l.qty * l.price, 0);
  const inc = (k) => setCart((c) => ({ ...c, [k]: (c[k] || 0) + 1 }));
  const dec = (k) => setCart((c) => { const n = (c[k] || 0) - 1; const x = { ...c }; if (n <= 0) delete x[k]; else x[k] = n; return x; });
  const rm = (k) => setCart((c) => { const x = { ...c }; delete x[k]; return x; });
  const [cat, setCat] = useState("All");
  const [sheet, setSheet] = useState(false);
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.category_name).filter(Boolean)))], [items]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((i) => (cat === "All" || i.category_name === cat) &&
      (!q || i.name.toLowerCase().includes(q) || String(i.category_name || "").toLowerCase().includes(q)));
  }, [items, query, cat]);

  const phone10 = form ? digits(form.phone) : "";
  const quoteKey = JSON.stringify([phone10.length === 10 ? phone10 : "", lines, form?.channel, choice, referrer]);
  useEffect(() => {
    if (!form) return undefined;
    const t = setTimeout(() => {
      setQuoting(true);
      loyaltyApi
        .quote({
          items: lines,
          phone: phone10.length === 10 ? phone10 : null,
          customer_id: phone10.length === 10 ? null : order?.customer_id || null,
          channel: form.channel,
          order_id: isEdit ? Number(id) : null,
          discount: choice,
          referrer: referrer || null,
        })
        .then((q) => {
          setQuote(q);
          const c = q.customer;
          if (c && c.name && !nameTyped.current && !form.name) set("name", c.name);
        })
        .catch(() => setQuote((q) => q))
        .finally(() => setQuoting(false));
    }, 300);
    return () => clearTimeout(t);
  }, [quoteKey, !!form]);

  const cust = quote?.customer;
  const member = cust?.member;
  const options = (quote?.options || []).filter((o) => o.source !== "MANUAL" || choice.source === "MANUAL");
  const pointsOpt = options.find((o) => o.source === "POINTS");
  const selectedKey = choice.source === "CAMPAIGN" ? `CAMPAIGN:${choice.campaign_id}` : choice.source;
  const selOpt = options.find((o) => o.key === selectedKey);
  const discountErr = choice.source !== "NONE" && quote && quote.error ? quote.error : null;
  const disc = quote && !quote.error ? Number(quote.discount) || 0 : 0;
  const tierLines = quote?.selected?.source === "TIER" && quote.selected.mode === "ITEM" ? Object.fromEntries((quote.selected.lines || []).map((r) => [r.item_id, r])) : null;
  const tierName = member?.tier?.name || "";
  const fee = Math.max(0, Number(form?.fee) || 0);
  const total = Math.max(0, subtotal - disc + fee);
  const best = options.filter((o) => o.available && o.source !== "NONE" && o.source !== "MANUAL" && o.source !== "POINTS")
    .sort((a, b) => b.amount - a.amount)[0];

  const pick = (o) => {
    if (!o.available) return;
    if (o.source === "CAMPAIGN") setChoice({ source: "CAMPAIGN", campaign_id: o.campaign_id });
    else if (o.source === "POINTS") setChoice((c) => ({ source: "POINTS", points: c.source === "POINTS" ? c.points : o.points?.max || "" }));
    else if (o.source === "MANUAL") setChoice((c) => ({ source: "MANUAL", type: c.type || "%", value: c.source === "MANUAL" ? c.value : "" }));
    else setChoice({ source: o.source });
  };

  const earnText = () => {
    if (!quote || !lines.length) return null;
    const pts = quote.earn_estimate || 0;
    if (!quote.settings?.points) return null;
    if (member) return `Will earn ~${num(pts)} points when delivered`;
    if (quote.settings.auto_join || join) return `Will earn ~${num(pts)} points when delivered (after joining Chickmate)`;
    return "Not a Chickmate member — no points on this order";
  };

  const submit = async (saveOut = false) => {
    const err = firstError(
      check.mobile(form.phone, "Phone number"),
      check.name(form.name, "Customer name"),
      check.pick(form.channel, "a platform"),
      check.pick(form.shop_id, "a shop"),
      check.pick(form.payment_type, "a payment type"),
      check.number(form.fee, "Delivery charges", { required: false }),
      lines.length ? null : "Add at least one product to the cart",
      discountErr
    );
    if (err) {
      toast.error(err);
      return;
    }
    const cancelling = isEdit && form.status === "CANCELLED";
    if (cancelling && !String(form.cancel_reason || "").trim()) {
      setReasonErr("Enter the reason");
      reasonRef.current?.focus();
      return;
    }
    const outOk = saveOut === true || oorOk;
    if (range?.out && !outOk && !cancelling) {
      setOorPop(true);
      return;
    }
    setBusy(true);
    try {
      const body = {
        customer: { name: form.name.trim(), phone: phone10, address: form.address },
        shop_id: form.shop_id || null,
        channel: form.channel,
        payment_type: form.payment_type,
        status: isEdit ? form.status : "CREATED",
        fee,
        distance_km: Number(form.distance_km) || 0,
        remarks: form.remarks || null,
        customer_address: form.address || null,
        customer_lat: form.lat,
        customer_lng: form.lng,
        items: lines,
        discount_choice: choice,
        referrer: choice.source === "REFERRAL" ? referrer : null,
        join_loyalty: join,
        discount_by: user?.name || null,
        out_of_range: !!(range?.out && outOk),
        oor_shop_id: range?.out ? range.shopId || form.shop_id || null : null,
        shop_auto: !isEdit && autoShop.current != null && String(autoShop.current) === String(form.shop_id),
      };
      if (cancelling) body.cancel_reason = form.cancel_reason.trim();
      if (!isEdit) body.module = appOnly ? "app" : "home";
      if (isEdit) {
        await ordersApi.update(id, body);
        toast.success(`${order.code} updated`);
      } else {
        const res = await ordersApi.create(body);
        toast.success(`${res.data?.code || "Order"} placed`);
      }
      nav(back);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const head = <PageHead title={isEdit ? `Edit order ${order?.code || ""}` : "New order"} onBack={() => nav(back)} />;

  if (loading || error || !form)
    return (
      <>
        {head}
        <div className="empty" style={{ padding: 40 }}>{error || "Loading…"}</div>
      </>
    );

  const since = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
  const known = phone10.length === 10 && quote;
  let chip = null;
  let topRight = null;
  let strip = null;
  if (known && member) {
    const t = member.tier;
    const need = member.next_tier?.need || 0;
    const pctDone = member.next_tier ? Math.round((member.lifetime / Math.max(1, member.lifetime + need)) * 100) : 100;
    const pv = pointsOpt?.points?.point_value ?? quote.settings?.point_value;
    const memberSince = member.since || member.created_at || member.joined_at;
    chip = <span className="nof-chip member">● Chickmate member · {num(cust?.orders || 0)} order{cust?.orders === 1 ? "" : "s"}</span>;
    strip = (
      <div className="nof-mem" data-kind="member">
        <div className="nof-mem__av">🏅</div>
        <div className="nof-mem__st">
          <div className="nof-mem__n">
            <b>{cust?.name || form.name || "Chickmate member"}</b>
            <span className="nof-mem__id">{member.code}</span>
            {t && <span className={`badge ${tierCls(t.card)}`}>{t.name}</span>}
          </div>
          <div className="nof-mem__bar"><i style={{ width: `${pctDone}%` }} /></div>
          <div className="nof-mem__sm">{member.next_tier ? `${num(need)} more points to ${member.next_tier.name}` : `${num(member.lifetime)} lifetime points`}</div>
        </div>
        <div className="nof-mem__kv">
          <small>Points</small>
          <b>{num(member.points)}</b>
          {pv != null && <span>= {money(Math.floor(member.points * pv))}</span>}
        </div>
        {t && (
          <div className="nof-mem__kv">
            <small>Tier discount</small>
            <b>{Number(t.discount) > 0 ? discText(t.discount_type, t.discount) : "None"}</b>
          </div>
        )}
        {memberSince && (
          <div className="nof-mem__kv">
            <small>Member since</small>
            <b>{since(memberSince)}</b>
          </div>
        )}
      </div>
    );
  } else if (known && cust && cust.id && !cust.is_new) {
    chip = <span className="nof-chip old">● Existing customer · {num(cust.orders || 0)} order{cust.orders === 1 ? "" : "s"}</span>;
  } else if (known) {
    chip = <span className="nof-chip new">● New customer</span>;
    if (quote.settings?.referral)
      topRight = (
        <div className="ly-ref nof-ref">
          <input className="input" aria-label="Referred by" placeholder="Enter phone or card ID" value={referrer} onChange={(e) => setReferrer(e.target.value)} />
          {referrer && quote.referrer && <span className="ly-ok">✓ {quote.referrer.name}{quote.referrer.tier ? ` (${quote.referrer.tier})` : ""}</span>}
          {referrer && !quote.referrer && quote.referrer_error && <span className="ly-bad">{quote.referrer_error}</span>}
        </div>
      );
  }
  const joinBox = known && !member && !quote.settings?.auto_join ? (
    <label className="ly-check nof-join"><input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} /> Join Chickmate</label>
  ) : null;
  const statusKeys = [...flow().map((x) => x.key), ...(can(MOD, "cancel") || order?.status === "CANCELLED" ? ["CANCELLED"] : [])];

  const headLabel = choice.source === "NONE" ? "No discount" : selOpt ? selOpt.label.replace(/^Redeem points$/, `Redeem ${choice.points || 0} points`) : "Select discount";

  const multOn = (i) => Number(i.points_multiplier) > 1 && (!i.multiplier_until || new Date(i.multiplier_until) >= new Date(new Date().toDateString()));

  return (
    <>
      {head}
      <div className={`nof ${isEdit ? "nof--edit" : ""}`}>
        <section className="card nof-cust">
          <div className="nof-top">
            <h3>Customer</h3>
            {chip}
            {(topRight || joinBox) && <div className="nof-top__r">{topRight}{joinBox}</div>}
          </div>
          <div className={`nof-row ${isEdit ? "edit" : ""}`}>
            <div className="field">
              <label>Phone number</label>
              <div className="phone-in">
                <span className="phone-cc">+92</span>
                <input className="input" inputMode="numeric" maxLength={10} aria-label="Phone number" value={form.phone}
                  onChange={(e) => set("phone", mobile10(e.target.value))} placeholder="Enter number" />
              </div>
            </div>
            <div className="field">
              <label>Customer name</label>
              <input className="input" aria-label="Customer name" value={form.name} placeholder="Enter customer name"
                onChange={(e) => { nameTyped.current = true; set("name", onlyLetters(e.target.value)); }} />
            </div>
            <div className="field" ref={addrRef}>
              <label>Customer address</label>
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => setForm((f) => ({ ...f, address: v, lat: null, lng: null }))}
                onPick={(p) => setForm((f) => ({ ...f, address: p.address, lat: p.lat, lng: p.lng }))}
                near={shopLoc}
                placeholder="Enter delivery address"
              />
            </div>
            <div className="field">
              <label>Platform</label>
              <Select ariaLabel="Platform" placeholder="Select platform" value={form.channel} options={chanList} onChange={(v) => set("channel", v)} />
            </div>
            <div className="field">
              <label>Shop</label>
              <Select ariaLabel="Shop" placeholder="Select shop" searchPlaceholder="Search shop" value={form.shop_id}
                options={shops.filter((x) => x.status !== "Inactive" || String(x.id) === String(form.shop_id)).map((x) => ({ value: x.id, label: x.name }))}
                onChange={(v) => set("shop_id", v)} />
            </div>
            {isEdit && (
              <div className="field">
                <label>Status</label>
                <Select ariaLabel="Status" placeholder="Select status" value={form.status}
                  options={statusKeys.map((k) => ({ value: k, label: statusLabel(k, appOnly) }))}
                  onChange={(v) => set("status", v)} />
              </div>
            )}
          </div>
          {isEdit && form.status === "CANCELLED" && (
            <div className={`field nof-reason ${reasonErr ? "has-err" : ""}`}>
              <label>Reason <span className="req">*</span></label>
              <input ref={reasonRef} className="input" aria-label="Reason" aria-invalid={!!reasonErr} placeholder="Enter reason" maxLength={300}
                value={form.cancel_reason} onChange={(e) => set("cancel_reason", e.target.value)} />
              {reasonErr && <div className="nof-ferr">{reasonErr}</div>}
            </div>
          )}
          {strip}
        </section>

        <div className="nof-wrap">
          <section className="card nof-col pos-prods">
            <div className="nof-ph">
              <h3>Products</h3>
              <div className="pos-cats nof-cats" role="tablist" aria-label="Categories">
                {cats.map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>
                ))}
              </div>
              <div className="search ly-search nof-search">
                <span className="ico"><Icon name="search" /></span>
                <input placeholder="Enter product name" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="pos-scroll">
              {filtered.length ? (
                <div className="pos-tiles">
                  {filtered.map((i) => {
                    const q = cart[i.id] || 0;
                    return (
                      <div key={i.id} className={`pos-tile pos-tile--tap ${q ? "in" : ""}`} role="button" tabIndex={0} aria-label={`Add ${i.name}`}
                        onClick={() => inc(i.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inc(i.id); } }}>
                        {i.has_image ? (
                          <div className="pos-img">
                            <img src={itemsApi.imageUrl(i)} alt={i.name} loading="lazy" />
                            {q > 0 && <span className="pos-qb">In cart</span>}
                          </div>
                        ) : (
                          <div className="pos-img noimg">
                            <Icon name="image" />
                            <span>No image</span>
                            {q > 0 && <span className="pos-qb">In cart</span>}
                          </div>
                        )}
                        <b className="pos-tile-n">{i.name}{Number(i.points) > 0 && <span className="ly-xtag">{Number(i.points)} pts{multOn(i) ? ` · ${Number(i.points_multiplier)}x` : ""}</span>}</b>
                        <small>{i.category_name || "—"}</small>
                        <div className="pos-tile-row">
                          <span className="pos-pr">{money(i.price)}</span>
                          {q ? (
                            <div className="qty" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => dec(i.id)} aria-label={`Remove one ${i.name}`}>−</button>
                              <span className="n">{q}</span>
                              <button onClick={() => inc(i.id)} aria-label={`Add one ${i.name}`}>+</button>
                            </div>
                          ) : (
                            <button className="pos-add" onClick={(e) => { e.stopPropagation(); inc(i.id); }} aria-label={`Add ${i.name}`}>+</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty" style={{ padding: 24 }}>No products match your search.</div>
              )}
            </div>
          </section>

          {sheet && <div className="pos-dim" onClick={() => setSheet(false)} />}
          <aside className={`card nof-col pos-cart ${sheet ? "open" : ""}`} aria-label="Cart and bill">
            <div className="nof-ph">
              <h3>🛒 Cart &amp; bill</h3>
              <span className="ly-mini">{count} item{count === 1 ? "" : "s"}</span>
              <button className="pos-close" onClick={() => setSheet(false)} aria-label="Close cart">✕</button>
            </div>
            <div className="pos-scroll nof-lines">
              {lines.length ? (
                lines.map((l) => {
                  const it = items.find((x) => x.id === l.item_id);
                  return (
                    <div className="citem nof-ci" key={l.item_id}>
                      {it?.has_image ? <img className="nof-ci__img" src={itemsApi.imageUrl(it)} alt="" /> : <span className="nof-ci__img noimg"><Icon name="image" /></span>}
                      <div className="nof-ci__t">
                        <div className="citem__n">{l.name}</div>
                        <div className="citem__m">{money(l.price)} × {l.qty} = <b>{money(l.price * l.qty)}</b></div>
                        {tierLines && tierLines[l.item_id] && (
                          <div className="ly-tline"><span>{tierName} {tierLines[l.item_id].pct}%</span><span>{tierLines[l.item_id].amount ? `− ${money(tierLines[l.item_id].amount)}` : "—"}</span></div>
                        )}
                      </div>
                      <div className="ly-citem-act">
                        <div className="qty">
                          <button onClick={() => dec(l.item_id)} aria-label="Remove one">−</button>
                          <span className="n">{l.qty}</span>
                          <button onClick={() => inc(l.item_id)} aria-label="Add one">+</button>
                        </div>
                        <button className="citem__rm" onClick={() => rm(l.item_id)} title="Remove item" aria-label="Remove item">✕</button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cart-empty">No items in the cart yet</div>
              )}
            </div>

            <div className="pos-foot nof-foot">
              <div className="nof-co">
                <div className="field">
                  <label>Payment type</label>
                  <Select ariaLabel="Payment type" placeholder="Select payment type" value={form.payment_type}
                    options={payList.map(([v, l]) => ({ value: v, label: l }))} onChange={(v) => set("payment_type", v)} />
                </div>
                <div className="field">
                  <label>Delivery charges (Rs){auto.fee && <span className="auto-tag">Auto</span>}</label>
                  <input className="input" inputMode="decimal" aria-label="Delivery charges" placeholder="Enter delivery charges" value={form.fee} onChange={(e) => { setAuto((a) => ({ ...a, fee: false })); set("fee", amount(e.target.value)); }} />
                </div>
                <div className="field">
                  <label>Total distance (km){auto.km && <span className="auto-tag">Auto</span>}</label>
                  <input className="input" inputMode="decimal" aria-label="Total distance" placeholder="Enter distance (km)" value={form.distance_km}
                    onChange={(e) => { setAuto((a) => ({ ...a, km: false })); set("distance_km", amount(e.target.value, 1)); }} />
                </div>
                <div className="field">
                  <label>Remarks</label>
                  <input className="input" aria-label="Remarks" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Enter remarks" />
                </div>
              </div>
              <div className="ly-dsec" ref={ddRef}>
                <div className={`ly-ddbox ${ddOpen ? "open" : ""}`}>
                  <button type="button" className="ly-ddhead" aria-expanded={ddOpen} onClick={() => setDdOpen((v) => !v)}>
                    <span className="pos-dl"><small>Discount</small>{headLabel}</span>
                    <span className="ly-amt">{disc ? `− ${money(disc)}` : ""} {ddOpen ? "▴" : "▾"}</span>
                  </button>
                  {ddOpen && (
                    <div className="ly-opts" role="radiogroup" aria-label="Discount">
                      {options.map((o) => {
                        const on = o.key === selectedKey;
                        return (
                          <div key={o.key} className={`ly-opt ${!o.available ? "dis" : ""} ${on ? "on" : ""}`}>
                            <label className="ly-opt-main">
                              <input type="radio" name="discount" checked={on} disabled={!o.available} onChange={() => pick(o)} />
                              <span className="t">
                                {o.label}
                                {on && o.source !== "NONE" && <span className="ly-sel">Selected</span>}
                                {!on && best && best.key === o.key && <span className="ly-tag">Best</span>}
                                {o.sub && <small>{o.sub}</small>}
                                {on && o.mode === "ITEM" && Array.isArray(o.lines) && o.lines.length > 0 && (
                                  <span className="ly-tbreak">
                                    {o.lines.map((r) => (
                                      <span className="r" key={r.item_id}><span>{(lines.find((x) => x.item_id === r.item_id) || {}).name || r.name} × {r.qty} <em>{r.pct}%</em></span><b>{r.amount ? `− ${money(r.amount)}` : "—"}</b></span>
                                    ))}
                                  </span>
                                )}
                              </span>
                              <span className="a">
                                {!o.available ? o.reason : o.source === "POINTS" ? `up to − ${money(o.max_amount)}` : o.amount ? `− ${money(o.amount)}` : ""}
                              </span>
                            </label>
                            {on && o.source === "POINTS" && (
                              <div className="ly-opt-in">
                                <input className="input" inputMode="numeric" aria-label="Points to redeem" placeholder="Enter points"
                                  value={choice.points} onChange={(e) => setChoice((c) => ({ ...c, points: wholeNumber(e.target.value) }))} />
                                <span className="ly-mini">min {num(o.points.min)} · max {num(o.points.max)}</span>
                                <button type="button" className="btn btn--ghost ly-smallbtn" onClick={() => setChoice((c) => ({ ...c, points: o.points.max }))}>Max</button>
                              </div>
                            )}
                            {/* Manual discount option is turned off
                            {on && o.source === "MANUAL" && (
                              <div className="ly-opt-in">
                                <Seg value={choice.type || "%"} label="Manual discount type" onChange={(v) => setChoice((c) => ({ ...c, type: v }))} />
                                <input className="input" inputMode="decimal" aria-label="Manual discount value" placeholder={choice.type === "Rs" ? "Enter amount" : "Enter %"}
                                  value={choice.value} onChange={(e) => setChoice((c) => ({ ...c, value: amount(e.target.value) }))} />
                              </div>
                            )}
                            */}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {discountErr && <div className="ly-err">{discountErr}</div>}
              </div>
              <div className="nof-tot">
                <div className="nof-line"><span>Subtotal ({count} item{count === 1 ? "" : "s"})</span><b>{money(subtotal)}</b></div>
                {disc > 0 && (
                  <div className="nof-line"><span>Discount · {quote?.selected?.label}</span><b className="neg">− {money(disc)}</b></div>
                )}
                <div className="nof-line"><span>Delivery charges</span><b>{money(fee)}</b></div>
                <div className="nof-line tot"><span>Total amount</span><b>{money(total)}</b></div>
              </div>
              {earnText() && <div className={`nof-earn ${member || quote?.settings?.auto_join || join ? "" : "muted"}`}>⭐ {earnText()}</div>}
              <button className="btn ly-place nof-place" onClick={() => submit()} disabled={busy || (quoting && !quote)}>
                {busy ? "Saving…" : isEdit ? `Save changes · ${money(total)}` : `Place order · ${money(total)}`}
              </button>
            </div>
          </aside>
        </div>
      </div>

      <div className={`pos-bar ${sheet ? "hide" : ""}`}>
        <button className="pos-bar-sum" onClick={() => setSheet(true)} aria-label="Open cart">
          <i>🛒{count > 0 && <b>{count}</b>}</i>
          <span><small>{count} item{count === 1 ? "" : "s"}{disc ? ` · ${quote?.selected?.label}` : ""}</small><strong>{money(total)}</strong></span>
          <em>▲</em>
        </button>
        <button className="btn" onClick={() => submit()} disabled={busy || (quoting && !quote)}>{busy ? "Saving…" : isEdit ? "Save" : "Place order"}</button>
      </div>

      {oorPop && range?.out && (
        <Modal cls="modal--oor" hideFoot onClose={() => setOorPop(false)}>
          <div className="oor-top">
            <button className="ov__close" onClick={() => setOorPop(false)} aria-label="Close"><Icon name="x" /></button>
            <b>Out of delivery range</b>
            <span>{delivery?.max_km != null ? `No shop is within ${delivery.max_km} km by road` : "This address is outside the delivery range"}</span>
          </div>
          <div className="oor-rows">
            <div><span>Nearest shop</span><b>{range.shop || "—"}</b></div>
            <div><span>Road distance</span><b className="km-bad">{range.km != null ? `${Number(range.km).toFixed(1)} km` : "—"}</b></div>
            <div><span>Max distance</span><b>{delivery?.max_km != null ? `${delivery.max_km} km` : "—"}</b></div>
          </div>
          <div className="oor-btns">
            <button className="btn btn--ghost" onClick={() => {
              setOorPop(false);
              setRange(null);
              setForm((f) => ({ ...f, address: "", lat: null, lng: null }));
              setTimeout(() => addrRef.current?.querySelector("input")?.focus(), 50);
            }}>Change address</button>
            <button className="btn btn--danger" disabled={busy} onClick={() => { setOorOk(true); setOorPop(false); submit(true); }}>Save as Out of range</button>
          </div>
        </Modal>
      )}
    </>
  );
}
