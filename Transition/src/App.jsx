import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Dashboard from "./components/Dashboard";
import KanbanBoard from "./components/KanbanBoard";
import TaskEntry from "./components/TaskEntry";
import Notebook from "./components/Notebook";
import AdminPanel from "./components/AdminPanel";
import TaskModal from "./components/TaskModal";
import Login from "./components/Login";
import SetPassword from "./components/SetPassword";
import CustomModal from "./components/CustomModal";
import IntroAnimation from "./components/IntroAnimation";

export default function App() {
  // --- Auth state ---
  const [authStage, setAuthStage] = useState(() => {
    // "login" | "set-password" | "authenticated" | "denied"
    if (localStorage.getItem("wf_authenticated") === "true") {
      const email = localStorage.getItem("wf_email");
      if (!email) {
        localStorage.clear();
        return "login";
      }
      return "authenticated";
    }
    return "login";
  });
  const [pendingEmail, setPendingEmail] = useState(""); // used during set-password flow
  const [loginError, setLoginError] = useState("");     // error passed back to Login

  // --- App state ---
  const [currentView, setCurrentView] = useState("dashboard");
  const [userRole, setUserRole] = useState("Admin");
  const [actualRole, setActualRole] = useState("Admin");
  const [userName, setUserName] = useState("");
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalTaskId, setModalTaskId] = useState(null);
  const [modalEditMode, setModalEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, taskId: null });
  const [showIntro, setShowIntro] = useState(() => {
    // Show intro on auto-login (user didn't log out)
    return localStorage.getItem("wf_authenticated") === "true";
  });
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // --- Convex ---
  const staff = useQuery(api.staff.getStaff);
  const addStaffMutation = useMutation(api.staff.addStaff);
  const setPasswordMutation = useMutation(api.staff.setPassword);
  const deleteTask = useMutation(api.tasks.deleteTask);

  // --- Resolve user once authenticated and staff loaded ---
  useEffect(() => {
    if (authStage !== "authenticated") {
      setLoading(false);
      return;
    }

    if (staff === undefined) return; // still loading from Convex

    const email = localStorage.getItem("wf_email") || "";
    if (!email) {
      localStorage.removeItem("wf_authenticated");
      setAuthStage("login");
      setLoading(false);
      return;
    }

    const mainAdmin = email === "wmt@ececontactcenters.com";
    if (mainAdmin) {
      setUserName("Main Admin");
      setIsMainAdmin(true);
      setActualRole("Admin");
      setUserRole("Admin");
      setLoading(false);
      return;
    }

    const user = staff.find((s) => (s.email || "").toLowerCase() === email);
    if (user) {
      setUserName(user.name);
      setActualRole(user.role);
      setUserRole(user.role);
      if (user.role === "Programmer") setCurrentView("kanban");
    }
    setLoading(false);
  }, [staff, authStage]);

  // --- Body scroll lock ---
  useEffect(() => {
    const locked = authStage !== "authenticated";
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [authStage]);

  // --- Role class on body ---
  useEffect(() => {
    document.body.classList.remove("role-admin", "role-programmer");
    document.body.classList.add("role-" + userRole.toLowerCase());
  }, [userRole]);

  // --- Context menu close ---
  useEffect(() => {
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // -------------------------------------------------------
  // Login handler — this is called when the user submits
  // the login form with their email and password.
  // -------------------------------------------------------
  async function handleLogin(email, password) {
    setLoginError("");
    const lowerEmail = email.toLowerCase();

    // Must wait for staff to be loaded
    if (staff === undefined) {
      setLoginError("System is still loading. Please wait a moment and try again.");
      return;
    }

    const isMainAdmin = lowerEmail === "wmt@ececontactcenters.com";

    if (isMainAdmin) {
      if (password === "admin") {
        localStorage.setItem("wf_authenticated", "true");
        localStorage.setItem("wf_email", lowerEmail);
        setLoading(true);
        setShowIntro(true);
        setAuthStage("authenticated");
      } else {
        setLoginError("Incorrect password.");
      }
      return;
    }

    const user = staff.find((s) => (s.email || "").toLowerCase() === lowerEmail);

    if (!user) {
      // Not in staff list — must register with "admin"
      if (password === "admin") {
        const defaultName = lowerEmail.split("@")[0];
        addStaffMutation({ name: defaultName, email: lowerEmail, role: "Pending" });
        // Show access denied — admin must approve them
        localStorage.setItem("wf_authenticated", "true");
        localStorage.setItem("wf_email", lowerEmail);
        setAuthStage("denied");
      } else {
        setLoginError("You are not registered. Use the default password to register.");
      }
      return;
    }

    // User is marked as pending approval
    if (user.role === "Pending") {
      localStorage.setItem("wf_authenticated", "true");
      localStorage.setItem("wf_email", lowerEmail);
      setAuthStage("denied");
      return;
    }

    // User IS in staff list
    if (!user.password) {
      // No personal password set: only "admin" is accepted  → go to set-password
      if (password === "admin") {
        setPendingEmail(lowerEmail);
        setAuthStage("set-password");
      } else {
        setLoginError("Incorrect password.");
      }
      return;
    }

    // User has a personal password
    if (password === user.password) {
      localStorage.setItem("wf_authenticated", "true");
      localStorage.setItem("wf_email", lowerEmail);
      setLoading(true);
      setShowIntro(true);
      setAuthStage("authenticated");
    } else {
      setLoginError("Incorrect password.");
    }
  }

  // -------------------------------------------------------
  // Set-password handler
  // -------------------------------------------------------
  async function handleSetPassword(newPassword) {
    await setPasswordMutation({ email: pendingEmail, password: newPassword });
    localStorage.setItem("wf_authenticated", "true");
    localStorage.setItem("wf_email", pendingEmail);
    setLoading(true);
    setShowIntro(true);
    setAuthStage("authenticated");
  }

  function logout() {
    localStorage.removeItem("wf_authenticated");
    localStorage.removeItem("wf_email");
    setAuthStage("login");
    setLoading(true);
    setUserName("");
    setActualRole("Admin");
    setUserRole("Admin");
    setCurrentView("dashboard");
  }

  function changeRole(role) {
    setUserRole(role);
    if (role === "Programmer") setCurrentView("kanban");
  }

  function switchView(viewId) {
    const adminViews = ["admin", "dashboard"];
    if (userRole === "Programmer" && adminViews.includes(viewId)) return;
    setCurrentView(viewId);
  }

  function openTaskModal(taskId, editMode = false) {
    setModalTaskId(taskId);
    setModalEditMode(editMode);
  }

  function closeTaskModal() {
    setModalTaskId(null);
    setModalEditMode(false);
  }

  function handleContextMenu(e, taskId) {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, taskId });
  }

  /**
   * Shows a custom alert or confirmation modal.
   * @param {Object} options { title, message, type, onConfirm }
   */
  function showModal({ title, message, type = "alert", onConfirm }) {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }

  // -------------------------------------------------------
  // Render stages
  // -------------------------------------------------------
  if (authStage === "login") {
    return <Login onLogin={handleLogin} externalError={loginError} />;
  }

  if (authStage === "set-password") {
    return <SetPassword email={pendingEmail} onSet={handleSetPassword} />;
  }

  if (authStage === "denied") {
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
        <div style={{ background: "white", padding: 40, borderRadius: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: 420, textAlign: "center" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ marginBottom: 20 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ color: "#1e293b", marginBottom: 10 }}>Registration Pending</h2>
          <p style={{ color: "#64748b", lineHeight: 1.6 }}>
            Your email has been registered. Please wait for an administrator to approve your access.
          </p>
          <p style={{ marginTop: 15, fontWeight: 700, color: "#4355f1", fontSize: "0.85rem" }}>
            {localStorage.getItem("wf_email")}
          </p>
          <button
            className="btn-secondary"
            style={{ marginTop: 25, padding: "10px 24px", background: "#ef4444" }}
            onClick={logout}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loader"></div>
        <div className="loading-text">LOADING...</div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Main app
  // -------------------------------------------------------
  return (
    <>
      {/* Header */}
      <header>
        <div className="header-container">
          <div style={{ minWidth: 180 }}></div>
          <div className="header-box">
            <img src="https://i.imgur.com/BRd5lrB.png" alt="ECE Logo" className="header-logo" />
            <div className="header-text-content">
              <h1>WORKFORCE HERMES</h1>
              <p>Workforce Programming Project Database</p>
            </div>
            <img src="https://i.imgur.com/ycmU6oP.png" alt="WFM Logo" className="header-logo" />
          </div>
          <div className="user-profile" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "15px", width: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
              <div className="role-badge">{userRole}</div>
              {!isMainAdmin && actualRole === "Admin" && (
                <select
                  className="role-switcher"
                  value={userRole}
                  onChange={(e) => changeRole(e.target.value)}
                >
                  <option value="Admin">Admin View</option>
                  <option value="Programmer">Programmer View</option>
                </select>
              )}
            </div>
            <button
              className="btn-secondary"
              style={{ padding: "8px 15px", fontSize: "0.75rem", background: "#ef4444", textTransform: "uppercase" }}
              onClick={logout}
            >
              LOGOUT
            </button>
          </div>
        </div>
        <div className="nav-bar">
          <div className="nav-label">NAVIGATION &amp; QUICK ACTIONS</div>
          <div className="nav-links">
            {userRole === "Admin" && (
              <div
                className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => switchView("dashboard")}
              >
                OVERVIEW
              </div>
            )}
            <div
              className={`nav-btn ${currentView === "kanban" ? "active" : ""}`}
              onClick={() => switchView("kanban")}
            >
              DASHBOARD
            </div>
            <div
              className={`nav-btn highlight ${currentView === "entry" ? "active" : ""}`}
              onClick={() => switchView("entry")}
            >
              NEW TASK
            </div>
            <div
              className={`nav-btn ${currentView === "notebook" ? "active" : ""}`}
              onClick={() => switchView("notebook")}
            >
              NOTEBOOK
            </div>
            {userRole === "Admin" && (
              <div
                className={`nav-btn ${currentView === "admin" ? "active" : ""}`}
                onClick={() => switchView("admin")}
              >
                ADMIN
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Views */}
      {currentView === "dashboard" && <Dashboard />}
      {currentView === "kanban" && (
        <KanbanBoard
          userRole={userRole}
          actualRole={actualRole}
          userName={userName}
          openTaskModal={openTaskModal}
          onContextMenu={handleContextMenu}
          showModal={showModal}
        />
      )}
      {currentView === "entry" && (
        <TaskEntry
          userRole={userRole}
          userName={userName}
          onCreated={() => switchView("kanban")}
          showModal={showModal}
        />
      )}
      {currentView === "notebook" && (
        <Notebook userRole={userRole} userName={userName} />
      )}
      {currentView === "admin" && <AdminPanel showModal={showModal} />}

      {/* Task Modal */}
      {modalTaskId && (
        <TaskModal
          taskId={modalTaskId}
          isEditMode={modalEditMode}
          userRole={userRole}
          actualRole={actualRole}
          userName={userName}
          staff={staff || []}
          onClose={closeTaskModal}
          showModal={showModal}
        />
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              openTaskModal(contextMenu.taskId, true);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Task
          </div>
          <div
            className="context-menu-item delete-option"
            onClick={() => {
              showModal({
                title: "Delete Project",
                message: "Are you sure you want to permanently delete this project? This action cannot be undone.",
                type: "confirm",
                onConfirm: () => deleteTask({ taskId: contextMenu.taskId })
              });
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Task
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Modal */}
      <CustomModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />

      {/* Intro Animation Overlay */}
      {showIntro && <IntroAnimation onDone={() => setShowIntro(false)} />}
    </>
  );
}
