import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import BrandLogo from "../components/common/BrandLogo";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      toast.error("Enter your username and password.");
      return;
    }
    setBusy(true);
    try {
      const u = await login(username.trim(), password);
      toast.success(`Welcome back, ${u.name}.`);
    } catch (e) {
      toast.error(e.message || "Invalid username or password.");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="login">
      <div className="login__diag" />
      <div className="login__diag2" />
      <div className="login__wrap">
        <div className="login__left">
          <BrandLogo className="login__logo" />
          <h1>Every order, from the first ring to the doorbell.</h1>
        </div>
        <div className="login__right">
          <div className="login__card">
            <h2>Sign in</h2>
            <div className="field">
              <label htmlFor="lg-user">Email or username</label>
              <input
                className="input"
                id="lg-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={onKey}
                placeholder="Enter email or username"
              />
            </div>
            <div className="field">
              <label htmlFor="lg-pass">Password</label>
              <input
                className="input"
                id="lg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder="Enter password"
              />
            </div>
            <button
              className="btn login__cta"
              onClick={submit}
              disabled={busy}
            >
              <span className="login__cta-label">
                {busy ? "Signing in…" : "Sign in →"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
