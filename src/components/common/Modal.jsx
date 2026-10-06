import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  title,
  sub,
  submit = "Save",
  danger = false,
  wide = false,
  cls = "",
  hideFoot = false,
  hideCancel = false,
  cancelLabel = "Cancel",
  onSubmit,
  onClose,
  busy = false,
  children,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${wide ? "modal--wide" : ""} ${cls}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="modal__head">
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {!hideFoot && (
          <div className="modal__foot">
            {!hideCancel && (
              <button className="btn btn--ghost" onClick={onClose}>
                {cancelLabel}
              </button>
            )}
            {submit && (
              <button
                className={`btn ${danger ? "btn--danger" : ""}`}
                onClick={onSubmit}
                disabled={busy}
              >
                {busy ? "Saving…" : submit}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
