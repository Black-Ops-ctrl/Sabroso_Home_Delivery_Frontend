import { useRef, useState } from "react";
import Icon from "../../config/icons";
import Modal from "./Modal";
import { transferApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

async function readRows(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name);
  const wb = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^\uFEFF/, ""), { type: "string", raw: true })
    : XLSX.read(buf, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
}

export function ExportButton({ kind, params, label = "Export", className = "btn btn--ghost-light" }) {
  const toast = useToast();
  const go = () => {
    transferApi.exportCsv(kind, params);
    toast.success("Export started");
  };
  return (
    <button className={className} onClick={go}>
      <Icon name="download" />
      <span>{label}</span>
    </button>
  );
}

export function ImportButton({ kind, params, title, label = "Import", className = "btn btn--ghost-light", onDone }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        <Icon name="upload" />
        <span>{label}</span>
      </button>
      {open && <ImportModal kind={kind} params={params} title={title} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

function ImportModal({ kind, params, title, onClose, onDone }) {
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      setFile(null);
      toast.error("Choose a CSV or Excel file (.csv, .xlsx)");
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) {
      toast.error("Choose the file to import");
      return;
    }
    setBusy(true);
    try {
      const rows = await readRows(file);
      if (!rows.length) throw new Error("The file has no rows");
      const res = await transferApi.importRows(kind, rows, params);
      toast.success(res.message || "Imported");
      onDone?.();
      onClose();
    } catch (e) {
      const list = e.errors || [];
      if (!list.length) toast.error(e.message || "The file could not be imported", 6000);
      list.slice(0, 5).forEach((x) => toast.error(`Row ${x.row} · ${x.column}: ${x.message}`, 9000));
      if (list.length > 5) toast.error(`${list.length - 5} more errors in the file. Fix these and upload again`, 9000);
    } finally {
      setBusy(false);
    }
  };

  const template = () => transferApi.template(kind, params);

  return (
    <Modal title={title || "Import"} submit={busy ? "Importing…" : "Import"} busy={busy} onClose={onClose} onSubmit={upload} cls="imp-modal">
      <div
        className={`imp-drop ${file ? "has-file" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") input.current?.click();
        }}
      >
        <Icon name="file" />
        <b>{file ? file.name : "Choose a CSV or Excel file"}</b>
        <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Click here or drop the file"}</span>
        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <button type="button" className="linklike imp-tpl" onClick={template}>
        <Icon name="download" /> Download the empty file with the right columns
      </button>
    </Modal>
  );
}