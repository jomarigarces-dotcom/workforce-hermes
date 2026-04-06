import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminPanel({ showModal }) {
  const staff = useQuery(api.staff.getStaff);
  const addStaffMut = useMutation(api.staff.addStaff);
  const updateStaffRole = useMutation(api.staff.updateStaffRole);
  const deleteStaffMut = useMutation(api.staff.deleteStaff);

  const activeStaff = (staff || []).filter(s => s.role !== "Pending");
  const pendingRequests = (staff || []).filter(s => s.role === "Pending");

  async function handleSubmit(e) {
    e.preventDefault();
    await addStaffMut({
      name: document.getElementById("staff-name").value,
      email: document.getElementById("staff-email").value,
      role: document.getElementById("staff-role").value,
    });
    showModal({
      title: "Success",
      message: "Staff Member Registered Successfully",
      type: "success"
    });
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
            
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ color: "#d97706", borderBottom: "2px solid #fde68a", paddingBottom: 10, marginBottom: 15, fontSize: "1rem", textTransform: "uppercase" }}>Pending Access Requests</h3>
              {pendingRequests.length > 0 ? (
                <table className="table" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((s) => (
                      <tr key={s.email}>
                        <td><strong>{s.name}</strong></td>
                        <td style={{ color: "#64748b" }}>{s.email}</td>
                        <td>
                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button
                              className="btn-primary"
                              style={{ padding: "6px 12px", fontSize: "0.75rem", width: "auto" }}
                              onClick={async () => {
                                try {
                                  await updateStaffRole({ staffEmail: s.email, newRole: "Programmer" });
                                  showModal({
                                    title: "Success",
                                    message: `Approved ${s.name} as Programmer`,
                                    type: "success"
                                  });
                                } catch (err) {
                                  showModal({
                                    title: "Error",
                                    message: `Approval failed: ${err.message}`,
                                    type: "error"
                                  });
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.75rem", background: "#ef4444", color: "white" }}
                              onClick={async () => {
                                try {
                                  await deleteStaffMut({ email: s.email });
                                  showModal({
                                    title: "Request Rejected",
                                    message: `Successfully rejected access for ${s.name}`,
                                    type: "success"
                                  });
                                } catch (err) {
                                  showModal({
                                    title: "Error",
                                    message: `Rejection failed: ${err.message}`,
                                    type: "error"
                                  });
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "8px", color: "#64748b", textAlign: "center", border: "1px dashed #e2e8f0" }}>
                  No pending access requests at the moment.
                </div>
              )}
            </div>

            <h3 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 10, marginBottom: 15, fontSize: "1rem", color: "#1e293b", textTransform: "uppercase" }}>Active Staff</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((s) => (
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
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#ef4444", color: "white" }}
                        onClick={() => {
                          showModal({
                            title: "Revoke Access",
                            message: `Are you sure you want to completely remove access for ${s.name}? They will no longer be able to log in.`,
                            type: "confirm",
                            onConfirm: async () => {
                              try {
                                await deleteStaffMut({ email: s.email });
                                showModal({
                                  title: "Access Revoked",
                                  message: `Successfully removed access for ${s.name}`,
                                  type: "success"
                                });
                              } catch (err) {
                                showModal({
                                  title: "Error",
                                  message: `Removal failed: ${err.message}`,
                                  type: "error"
                                });
                              }
                            }
                          });
                        }}
                      >
                        Remove
                      </button>
                    </td>
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
