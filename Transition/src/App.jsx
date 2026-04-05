import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Dashboard from "./components/Dashboard";
import KanbanBoard from "./components/KanbanBoard";
import TaskEntry from "./components/TaskEntry";
import Notebook from "./components/Notebook";
import AdminPanel from "./components/AdminPanel";
import TaskModal from "./components/TaskModal";

/**
 * SIMULATED USER CONTEXT
 * Replace this with real auth (Clerk, Auth0, etc.) when ready.
 * Change the email below to match your own for testing.
 */
const SIMULATED_USER = {
  email: "jomari.garces@ececontactcenters.com",
};

export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [userRole, setUserRole] = useState("Admin");
  const [actualRole, setActualRole] = useState("Admin");
  const [userName, setUserName] = useState("");
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalTaskId, setModalTaskId] = useState(null);
  const [modalEditMode, setModalEditMode] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, taskId: null });

  // Fetch staff for user context resolution
  const staff = useQuery(api.staff.getStaff);

  // Resolve user context once staff loads
  useEffect(() => {
    if (!staff) return;

    const email = SIMULATED_USER.email;
    const user = staff.find(
      (s) => (s.email || "").toLowerCase() === email.toLowerCase()
    );
    const mainAdmin = email.toLowerCase() === "wmt@ececontactcenters.com";

    if (user || mainAdmin) {
      setHasAccess(true);
      setUserName(user ? user.name : "Main Admin");
      setIsMainAdmin(mainAdmin);
      const role = user ? user.role : "Admin";
      setActualRole(role);
      setUserRole(mainAdmin ? "Admin" : role);

      if (role === "Programmer") {
        setCurrentView("kanban");
      }
    }
    setLoading(false);
  }, [staff]);

  // Add/remove role class on body
  useEffect(() => {
    document.body.classList.remove("role-admin", "role-programmer");
    document.body.classList.add("role-" + userRole.toLowerCase());
  }, [userRole]);

  // Close context menu on click
  useEffect(() => {
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  function changeRole(role) {
    setUserRole(role);
    if (role === "Programmer") {
      setCurrentView("kanban");
    }
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

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loader"></div>
        <div className="loading-text">LOADING...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="no-access-container">
        <div className="header-box" style={{ marginBottom: 30 }}>
          <img src="https://i.imgur.com/BRd5lrB.png" alt="ECE Logo" className="header-logo" />
          <div className="header-text-content">
            <h1>WORKFORCE HERMES</h1>
            <p>Workforce Programming Project Database</p>
          </div>
          <img src="https://i.imgur.com/ycmU6oP.png" alt="WFM Logo" className="header-logo" />
        </div>
        <div style={{ background: "white", padding: 40, borderRadius: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxWidth: 400 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ marginBottom: 20 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ color: "#1e293b", marginBottom: 10 }}>Access Denied</h2>
          <p style={{ color: "#64748b", lineHeight: 1.6 }}>
            You do not have access to this site. Please contact the administrator.
          </p>
          <p style={{ marginTop: 20, fontWeight: 700, color: "#1e293b" }}>{SIMULATED_USER.email}</p>
        </div>
      </div>
    );
  }

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
          <div className="user-profile">
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
        </div>
        <div className="nav-bar">
          <div className="nav-label">NAVIGATION & QUICK ACTIONS</div>
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
        />
      )}
      {currentView === "entry" && (
        <TaskEntry
          userRole={userRole}
          userName={userName}
          onCreated={() => switchView("kanban")}
        />
      )}
      {currentView === "notebook" && (
        <Notebook userRole={userRole} userName={userName} />
      )}
      {currentView === "admin" && <AdminPanel />}

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
              if (confirm("Are you sure you want to delete this task?")) {
                // deletion handled inside KanbanBoard
              }
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
    </>
  );
}
