import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminPanel() {
  const staff = useQuery(api.staff.getStaff);
  const addStaffMut = useMutation(api.staff.addStaff);
  const updateStaffRole = useMutation(api.staff.updateStaffRole);

  async function handleSubmit(e) {
    e.preventDefault();
    await addStaffMut({
      name: document.getElementById("staff-name").value,
      email: document.getElementById("staff-email").value,
      role: document.getElementById("staff-role").value,
    });
    alert("Staff Member Registered Successfully");
    e.target.reset();
  }

  return (
    <div id="admin-view" className="view-section">
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 30 }}>
          <div className="section-card">
            <h2 style={{ fontWeight: 900, marginTop: 0, textTransform: "uppercase" }}>Add New Staff</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" id="staff-name" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" id="staff-email" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input type="text" id="staff-role" className="form-input" defaultValue="Programmer" required />
              </div>
              <button type="submit" className="btn-primary">Register Staff Member</button>
            </form>
          </div>
          <div className="section-card">
            <h2 style={{ fontWeight: 900, marginTop: 0, textTransform: "uppercase", marginBottom: 20 }}>Staff Management</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {(staff || []).map((s) => (
                  <tr key={s.email}>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <select
                        className="role-switcher"
                        value={s.role}
                        onChange={(e) => updateStaffRole({ staffEmail: s.email, newRole: e.target.value })}
                      >
                        <option value="Programmer">Programmer</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ color: "#64748b" }}>{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
