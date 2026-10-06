import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { useLive } from "../../context/LiveContext";
import { themeApi, appThemeApi } from "../../services/api";
import PageHead from "../../components/common/PageHead";
import ColorPicker from "../../components/common/ColorPicker";
import ColorField from "../../components/appearance/ColorField";
import WebPreview from "../../components/appearance/WebPreview";
import AppPreview from "../../components/appearance/AppPreview";
import Icon from "../../config/icons";
import {
  THEME_GROUPS, THEME_DEFAULTS, WEB_TABS, APP_THEME_GROUPS, APP_TABS, APP_DEFAULTS,
  applyTheme, isGradient, parseColor, parseGradient, toHex,
} from "../../config/theme";

const MOD = "Appearance";

const webDiff = (t) => Object.fromEntries(Object.entries(t || {}).filter(([k, v]) => k in THEME_DEFAULTS && v && v !== THEME_DEFAULTS[k]));
const webSig = (t) => JSON.stringify(Object.entries(webDiff(t)).sort());
const HEX = /^#[0-9a-f]{6}$/i;
const appClean = (t) => Object.fromEntries(Object.entries(t || {}).filter(([k, v]) => k in APP_DEFAULTS && HEX.test(String(v || ""))).map(([k, v]) => [k, v.toLowerCase()]));
const appDiff = (t) => Object.fromEntries(Object.entries(appClean(t)).filter(([k, v]) => v !== APP_DEFAULTS[k].toLowerCase()));
const appSig = (t) => JSON.stringify(Object.entries(appDiff(t)).sort());
const hexOf = (c) => {
  const p = parseColor(c);
  return p ? toHex(p).toLowerCase() : null;
};

const Monitor = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" />
  </svg>
);

export default function Appearance() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { can } = useAuth();
  const canEdit = can(MOD, "edit");
  const { saved, setSaved, hold } = useTheme();

  const [mode, setMode] = useState("web");
  const [wtab, setWtab] = useState(WEB_TABS[0].id);
  const [atab, setAtab] = useState(APP_TABS[0].id);
  const [draft, setDraft] = useState(() => ({ ...saved }));
  const [appSaved, setAppSaved] = useState(null);
  const [appDraft, setAppDraft] = useState({});
  const [picker, setPicker] = useState(null);
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState(null);

  const savedRef = useRef(saved);
  const prevSaved = useRef(saved);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const prevApp = useRef(null);
  const appDraftRef = useRef(appDraft);
  appDraftRef.current = appDraft;

  useEffect(() => {
    hold(true);
    return () => {
      hold(false);
      applyTheme(savedRef.current);
    };
  }, [hold]);

  useEffect(() => {
    savedRef.current = saved;
    if (webSig(draftRef.current) === webSig(prevSaved.current)) setDraft({ ...saved });
    prevSaved.current = saved;
  }, [saved]);

  useEffect(() => { applyTheme(draft); }, [draft]);

  const loadApp = useCallback(async () => {
    try {
      setAppSaved(appClean(await appThemeApi.get()));
    } catch (e) {
      toastRef.current.error(e.message || "Could not load the app colours.");
    }
  }, []);

  useEffect(() => { loadApp(); }, [loadApp]);
  useLive(["app_settings"], loadApp);

  useEffect(() => {
    if (!appSaved) return;
    if (prevApp.current === null || appSig(appDraftRef.current) === appSig(prevApp.current)) setAppDraft({ ...appSaved });
    prevApp.current = appSaved;
  }, [appSaved]);

  const resolved = useMemo(() => ({ ...THEME_DEFAULTS, ...draft }), [draft]);
  const appBase = useMemo(() => ({ ...APP_DEFAULTS, ...appClean(appDraft) }), [appDraft]);
  const appResolved = useMemo(() => {
    const r = { ...appBase };
    if (peek) {
      if (isGradient(peek.v)) {
        const st = [...parseGradient(peek.v).stops].sort((x, y) => x.p - y.p);
        peek.keys.forEach((k, i) => { r[k] = i === 0 ? st[0].c : st[st.length - 1].c; });
      } else peek.keys.forEach((k) => { r[k] = peek.v; });
    }
    return r;
  }, [appBase, peek]);
  const dirtyWeb = webSig(draft) !== webSig(saved);
  const dirtyApp = !!appSaved && appSig(appDraft) !== appSig(appSaved);

  const save = async () => {
    setBusy(true);
    try {
      if (dirtyWeb) {
        const t = webDiff(draft);
        if (Object.keys(t).length) await themeApi.save(t);
        else await themeApi.reset();
        setSaved(t);
      }
      if (dirtyApp) {
        const t = appDiff(appDraft);
        if (Object.keys(t).length) await appThemeApi.save(t);
        else await appThemeApi.reset();
        setAppSaved(t);
      }
      toast.success("Appearance saved.");
    } catch (e) {
      toast.error(e.message || "Could not save the colours.");
    } finally {
      setBusy(false);
    }
  };

  const closePicker = () => {
    setPicker(null);
    setPeek(null);
    applyTheme(draftRef.current);
  };

  const previewPicked = (v) => {
    if (!picker) return;
    if (picker.kind === "web") document.documentElement.style.setProperty(`--t-${picker.k}`, v);
    else setPeek({ keys: picker.keys, v });
  };

  const applyPicked = (v) => {
    if (picker.kind === "web") {
      setDraft((d) => ({ ...d, [picker.k]: v }));
    } else {
      const keys = picker.keys;
      let cols;
      if (isGradient(v)) {
        const stops = [...parseGradient(v).stops].sort((x, y) => x.p - y.p);
        cols = [hexOf(stops[0].c), hexOf(stops[stops.length - 1].c)];
      } else {
        cols = [hexOf(v), hexOf(v)];
      }
      if (cols.some((c) => !c)) { toast.error("Pick a valid colour."); return; }
      setAppDraft((d) => {
        const n = { ...d };
        keys.forEach((k, i) => { n[k] = cols[Math.min(i, cols.length - 1)]; });
        return n;
      });
    }
    setPicker(null);
    setPeek(null);
  };

  const pickerValue = picker
    ? picker.kind === "web"
      ? resolved[picker.k]
      : picker.keys.length > 1
        ? `linear-gradient(180deg, ${appBase[picker.keys[0]]} 0%, ${appBase[picker.keys[1]]} 100%)`
        : appBase[picker.keys[0]]
    : null;

  const webGroups = THEME_GROUPS.filter((g) => g.tab === wtab);
  const appGroups = APP_THEME_GROUPS.filter((g) => g.tab === atab);

  return (
    <div className="ap-page-wrap">
      <PageHead title="Appearance">
        {canEdit && (
          <>
            <button type="button" className="btn" onClick={save} disabled={busy || (!dirtyWeb && !dirtyApp)}>{busy ? "Saving…" : "Save changes"}</button>
          </>
        )}
      </PageHead>

      <div className="ap-top">
        <div className="ap-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "web"} className={mode === "web" ? "on" : ""} onClick={() => setMode("web")}><Monitor />Web</button>
          <button type="button" role="tab" aria-selected={mode === "app"} className={mode === "app" ? "on" : ""} onClick={() => setMode("app")}><Icon name="mobile" />App</button>
        </div>
      </div>

      <div className="ap-subrow">
        <div className="ap-sub" role="tablist">
          {(mode === "web" ? WEB_TABS : APP_TABS).map((t) => {
            const on = (mode === "web" ? wtab : atab) === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} className={on ? "on" : ""} onClick={() => (mode === "web" ? setWtab(t.id) : setAtab(t.id))}>
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "web" ? (
        <div className="ap-grid">
          {webGroups.map((g) => (
            <section key={g.id} className={`ap-card ${g.wide ? "wide" : ""}`}>
              <h3>{g.name}</h3>
              <div className="ap-rows">
                {g.items.map(([k, label, def]) => (
                  <div key={k} className="ap-row">
                    <b>{label}</b>
                    <ColorField
                      value={resolved[k]}
                      label={label}
                      active={picker?.k === k}
                      disabled={!canEdit}
                      onOpen={(anchor) => setPicker({ kind: "web", k, title: `${g.name} · ${label}`, anchor, grad: isGradient(def) || isGradient(resolved[k]) })}
                    />
                    <div className="ap-pv"><WebPreview k={k} /></div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="ap-grid">
          {appGroups.map((g) => (
            <section key={g.id} className="ap-card">
              <h3>{g.name}</h3>
              <div className="ap-rows">
                {g.items.map((it) => {
                  const id = it.k.join("|");
                  const value = it.k.length > 1
                    ? `linear-gradient(135deg, ${appResolved[it.k[0]]}, ${appResolved[it.k[1]]})`
                    : appResolved[it.k[0]];
                  return (
                    <div key={id} className="ap-row">
                      <b>{it.label}</b>
                      <ColorField
                        value={value}
                        label={it.label}
                        active={picker?.id === id}
                        disabled={!canEdit || !appSaved}
                        onOpen={(anchor) => setPicker({ kind: "app", id, keys: it.k, title: `${g.name} · ${it.label}`, anchor })}
                      />
                      <div className="ap-pv"><AppPreview pv={it.pv} a={appResolved} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {picker && (
        <ColorPicker
          key={picker.id || picker.k}
          title={picker.title}
          value={pickerValue}
          gradient={picker.kind === "web" ? picker.grad : picker.keys.length > 1}
          anchor={picker.anchor}
          onClose={closePicker}
          onApply={applyPicked}
          onPreview={previewPicked}
        />
      )}

    </div>
  );
}
