import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);
export const useToast = () =>
  useContext(ToastContext) || { success: () => {}, error: () => {} };

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );
  const push = useCallback(
    (type, msg, ms = 3200) => {
      const id = ++_id;
      setToasts((t) => [...t.slice(-5), { id, type, msg }]);
      setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const value = {
    success: (m, ms) => push("success", m, ms),
    error: (m, ms) => push("error", m, ms),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 20,
          top: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="toast__ic">{t.type === "error" ? "✕" : "✓"}</span>
            <span className="toast__msg">{t.msg}</span>
            <button
              className="toast__x"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
