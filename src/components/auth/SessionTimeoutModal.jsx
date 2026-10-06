import { useAuth } from "../../context/AuthContext";
import { WARN_MS } from "../../config/api";

const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function SessionTimeoutModal() {
  const { warnLeft, extendSession, logout } = useAuth();
  if (!warnLeft) return null;

  const pct = Math.max(0, Math.min(100, (warnLeft / (WARN_MS / 1000)) * 100));
  return (
    <div className="overlay">
      <div className="modal modal--session">
        <div className="modal__body">
          <div className="sess-wrap">
            <div
              className="sess-ring"
              style={{
                background: `conic-gradient(#dc2626 0 ${pct}%, #f0eef5 ${pct}% 100%)`,
              }}
            >
              <div className="sess-ring__hole">{mmss(warnLeft)}</div>
            </div>
            <h2 className="sess-h">Session expiring</h2>
            <p className="sess-p">
              Click "Stay signed in" to keep working, or you'll be signed out
              automatically.
            </p>
            <div className="sess-btns">
              <button className="btn btn--save" onClick={extendSession}>
                Stay signed in
              </button>
              <button className="btn btn--ghost" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
