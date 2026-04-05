import { useState } from "react";

export default function SetPassword({ email, onSet }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    onSet(newPassword);
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <h2 style={{ color: "#1e293b", marginBottom: 10, fontWeight: 900 }}>Set Your Password</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 5 }}>
          Welcome! Set up your personal password for
        </p>
        <p style={{ color: "#4355f1", fontWeight: 700, fontSize: "0.85rem", marginBottom: 25, wordBreak: "break-all" }}>
          {email}
        </p>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div className="form-group" style={{ marginBottom: "15px" }}>
            <input
              type="password"
              className="form-input"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              required
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <input
              type="password"
              className={`form-input ${error ? "input-error" : ""}`}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              required
            />
            {error && <div className="error-text">{error}</div>}
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>
            Save Password & Enter
          </button>
        </form>
      </div>
    </div>
  );
}
