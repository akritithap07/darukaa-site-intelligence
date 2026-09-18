import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api/client";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@darukaa.earth");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check credentials or backend status.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420, paddingTop: 96 }}>
      <div className="brand">Darukaa Earth</div>
      <div className="brand-sub" style={{ marginBottom: 32 }}>
        Site Intelligence — SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION
      </div>
      <form className="card" onSubmit={handleLogin}>
        <h3>Sign in</h3>
        {error && <div className="error-banner">{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <label className="muted">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="muted">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%", marginBottom: 8 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleRegister}
          disabled={loading}
          style={{ width: "100%" }}
        >
          Register new account
        </button>
      </form>
      <div className="muted">Demo credentials are pre-filled if the backend was seeded.</div>
    </div>
  );
}
