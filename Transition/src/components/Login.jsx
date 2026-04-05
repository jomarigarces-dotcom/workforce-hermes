import { useState } from "react";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === "admin") {
      onLogin();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="login-container">
      <div className="header-box" style={{ marginBottom: 30 }}>
        <img src="https://i.imgur.com/BRd5lrB.png" alt="ECE Logo" className="header-logo" />
        <div className="header-text-content">
          <h1>WORKFORCE HERMES</h1>
          <p>Workforce Programming Project Database</p>
        </div>
        <img src="https://i.imgur.com/ycmU6oP.png" alt="WFM Logo" className="header-logo" />
      </div>
      <div className="login-box">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4355f1" strokeWidth="2" style={{ marginBottom: 20 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h2 style={{ color: "#1e293b", marginBottom: 10, fontWeight: 900 }}>System Login</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 25 }}>
          Enter the access password to continue.
        </p>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div className="form-group">
            <input
              type="password"
              className={`form-input ${error ? "input-error" : ""}`}
              placeholder="Enter password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
            />
            {error && <div className="error-text">Incorrect password. Please try again.</div>}
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            Secure Access
          </button>
        </form>
      </div>
    </div>
  );
}
