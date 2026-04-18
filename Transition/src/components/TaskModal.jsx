import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import FeatureModal from "./FeatureModal";

export default function TaskModal({ taskId, isEditMode, userRole, actualRole, userName, staff, onClose, showModal }) {
  const tasks = useQuery(api.tasks.getTasks);
  const updateTaskMilestones = useMutation(api.tasks.updateTaskMilestones);
  const addNoteToTask = useMutation(api.tasks.addNoteToTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);
  const deleteTaskFeature = useMutation(api.tasks.deleteTaskFeature);

  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [showOptions, setShowOptions] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [featureModalConfig, setFeatureModalConfig] = useState(null);
  const [featureContextMenu, setFeatureContextMenu] = useState(null);
  const [editedMilestones, setEditedMilestones] = useState([]);
  const [featureView, setFeatureView] = useState("feature"); // 'feature' or 'bug'

  // Drag refs — no React state updated during drag to avoid re-render/listener issues
  const milestoneListRef = useRef(null);
  const dragFromRef = useRef(null);
  const dragOverRef = useRef(null);

  const task = tasks?.find((t) => t._id === taskId);

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title || "");
      setEditedDesc(task.description || "");
      const initialAssignees = (task.assignee || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      setSelectedAssignees(new Set(initialAssignees));
      if (isEditMode) {
        setEditedMilestones(task.milestones ? JSON.parse(JSON.stringify(task.milestones)) : []);
      }
    }
  }, [task?._id, isEditMode]);

  if (!tasks || !task) return null;

  const milestones = task.milestones || [];
  const doneM = task.completedMilestones || 0;
  const progressPercent = milestones.length > 0 ? Math.round((doneM / milestones.length) * 100) : 0;

  let canEditMilestone = true;
  if (actualRole === "Admin") {
    const assigneeVal = (task.assignee || "").toLowerCase();
    const userNameVal = (userName || "").toLowerCase();
    if (!assigneeVal.includes(userNameVal)) canEditMilestone = false;
  }

  const canManageFeatures = actualRole === "Admin" || canEditMilestone;

  function toggleAssignee(name) {
    setSelectedAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleToggleMilestone(idx) {
    const updated = JSON.parse(JSON.stringify(milestones));
    const isNowCompleted = !updated[idx].completed;
    updated[idx].completed = isNowCompleted;
    if (isNowCompleted) {
      updated[idx].completedAt = new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } else {
      delete updated[idx].completedAt;
    }
    const completedCount = updated.filter((m) => m.completed).length;
    updateTaskMilestones({ taskId, milestones: updated, completedCount });
  }

  function handleAddNote() {
    const input = document.getElementById("modal-note-input");
    const text = input?.value?.trim();
    if (!text) return;
    const estDate = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    addNoteToTask({ taskId, noteText: text, writer: userName, date: estDate });
    input.value = "";
  }

  function handleDelete() {
    showModal({
      title: "Delete Project",
      message: "Are you sure you want to permanently delete this project? This action cannot be undone.",
      type: "confirm",
      onConfirm: () => { deleteTask({ taskId }); onClose(); }
    });
  }

  function handleSaveEdits() {
    const newMilestones = editedMilestones.map((m) => ({
      name: (m.name || "").trim() || "Unnamed",
      days: parseInt(m.days) || 0,
      completed: m.completed || false,
      completedAt: m.completedAt,
    }));
    updateTaskDetails({
      taskId,
      newTitle: editedTitle,
      newDescription: editedDesc,
      newAssignee: Array.from(selectedAssignees).join(", "),
      newMilestones,
    });
    onClose();
  }

  function appendEditableMilestone() {
    setEditedMilestones(prev => [...prev, { name: "", days: 0 }]);
  }

  function handleFeatureContextMenu(e, f) {
    if (!canManageFeatures) return;
    e.preventDefault();
    e.stopPropagation();
    setFeatureContextMenu({ x: e.clientX, y: e.clientY, feature: f });
  }

  function handleFeatureEdit(f) {
    setFeatureModalConfig({ mode: "edit", feature: f });
    setFeatureContextMenu(null);
  }

  function handleFeatureDelete(f) {
    setFeatureContextMenu(null);
    showModal({
      title: `Delete ${f.type === "bug" ? "Bug" : "Feature"}`,
      message: `Are you sure you want to permanently delete the ${f.type === "bug" ? "bug" : "feature"} "${f.name}"?`,
      type: "confirm",
      onConfirm: () => { deleteTaskFeature({ taskId, featureId: f.id }); }
    });
  }

  // ── Pure DOM drag-and-drop (no React state during drag) ─────────────────────
  // We mutate DOM styles directly for visual feedback; only call setEditedMilestones
  // once on pointerup. This avoids all React re-render / listener teardown issues.
  function startMilestoneDrag(fromIdx) {
    dragFromRef.current = fromIdx;
    dragOverRef.current = fromIdx;

    function getRows() {
      return milestoneListRef.current
        ? [...milestoneListRef.current.querySelectorAll(".ms-drag-row")]
        : [];
    }

    function applyVisuals(overIdx) {
      getRows().forEach((r, i) => {
        r.style.opacity = i === fromIdx ? "0.35" : "1";
        r.style.borderTop = "";
        r.style.borderBottom = "";
      });
      const rows = getRows();
      if (overIdx !== fromIdx && rows[overIdx]) {
        if (overIdx < fromIdx) {
          rows[overIdx].style.borderTop = "3px solid #3b82f6";
        } else {
          rows[overIdx].style.borderBottom = "3px solid #3b82f6";
        }
      }
    }

    function clearVisuals() {
      getRows().forEach(r => {
        r.style.opacity = "";
        r.style.borderTop = "";
        r.style.borderBottom = "";
      });
    }

    applyVisuals(fromIdx);

    function onMove(e) {
      const rows = getRows();
      let found = dragOverRef.current;
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = i;
          break;
        }
      }
      if (found !== dragOverRef.current) {
        dragOverRef.current = found;
        applyVisuals(found);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      clearVisuals();
      const from = dragFromRef.current;
      const to = dragOverRef.current;
      dragFromRef.current = null;
      dragOverRef.current = null;
      if (from !== null && to !== null && from !== to) {
        setEditedMilestones(prev => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-grid-3">

          {/* ── Features & Bugs sidebar ── */}
          <div className="features-sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="features-header" style={{ flexShrink: 0, paddingBottom: 12, borderBottom: "1px solid #f1f5f9", marginBottom: 14 }}>

              {/* ── Segmented Toggle ── */}
              <div style={{ position: "relative", display: "flex", background: "#f8fafc", borderRadius: "14px", padding: "4px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                {/* Animated pill — uses transform so no layout recalc and no border glitch */}
                <div style={{
                  position: "absolute",
                  top: 4, bottom: 4,
                  left: 4,
                  width: "calc(50% - 4px)",
                  background: featureView === "feature"
                    ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                  borderRadius: "10px",
                  transform: featureView === "feature" ? "translateX(0)" : "translateX(100%)",
                  transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.35s ease",
                  boxShadow: featureView === "feature"
                    ? "0 4px 12px rgba(99,102,241,0.35)"
                    : "0 4px 12px rgba(239,68,68,0.35)",
                  zIndex: 1,
                }} />

                <button
                  onClick={() => setFeatureView("feature")}
                  style={{
                    flex: 1, position: "relative", zIndex: 2,
                    padding: "9px 4px",
                    border: "none", cursor: "pointer", background: "transparent",
                    color: featureView === "feature" ? "white" : "#94a3b8",
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.5px",
                    transition: "color 0.3s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    userSelect: "none",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Features
                </button>

                <button
                  onClick={() => setFeatureView("bug")}
                  style={{
                    flex: 1, position: "relative", zIndex: 2,
                    padding: "9px 4px",
                    border: "none", cursor: "pointer", background: "transparent",
                    color: featureView === "bug" ? "white" : "#94a3b8",
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.5px",
                    transition: "color 0.3s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    userSelect: "none",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v2m0 16v2m7-9h2M3 12h2M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                  Bugs
                </button>
              </div>

              {/* ── Row: title + pending badge + add button ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.2px" }}>
                    {featureView === "feature" ? "Features" : "Bug Reports"}
                  </h3>
                  {(task.features || []).filter(f => (f.type || "feature") === featureView && f.status === "pending").length > 0 && (
                    <span style={{
                      background: featureView === "bug" ? "#fee2e2" : "#ede9fe",
                      color: featureView === "bug" ? "#ef4444" : "#7c3aed",
                      fontSize: "0.58rem", padding: "2px 7px", borderRadius: "20px", fontWeight: 800, letterSpacing: "0.5px",
                    }}>
                      {(task.features || []).filter(f => (f.type || "feature") === featureView && f.status === "pending").length} OPEN
                    </span>
                  )}
                </div>
                {canManageFeatures && (
                  <button
                    className="btn-add-feature"
                    style={{
                      background: featureView === "bug" ? "#fef2f2" : "#f5f3ff",
                      color: featureView === "bug" ? "#ef4444" : "#7c3aed",
                      border: `1.5px solid ${featureView === "bug" ? "#fca5a5" : "#c4b5fd"}`,
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => setFeatureModalConfig({ mode: "add", type: featureView })}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    ADD
                  </button>
                )}
              </div>
            </div>
            <div className="features-list" style={{ flex: 1, overflowY: "auto", paddingRight: "5px" }}>
              {(task.features || []).filter(f => (f.type || "feature") === featureView).map((f) => (
                <div
                  key={f.id}
                  className={`feature-card ${f.status === "completed" ? "completed" : ""}`}
                  onClick={() => setFeatureModalConfig({ mode: "view", feature: f, type: featureView })}
                  onContextMenu={(e) => handleFeatureContextMenu(e, f)}
                  style={{ cursor: "pointer", userSelect: "none", borderLeft: featureView === "bug" && f.status !== "completed" ? "3px solid #ef4444" : undefined }}
                >
                  <div className="feature-icon-box" style={{ background: featureView === "bug" ? "#fef2f2" : undefined, color: featureView === "bug" ? "#ef4444" : undefined }}>
                    {featureView === "bug" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20.9 9.1C21.7 8.3 21.7 7 20.9 6.2c-.8-.8-2.1-.8-2.9 0L17.5 6.7m-11 0L6 6.2C5.2 5.4 3.9 5.4 3.1 6.2c-.8.8-.8 2.1 0 2.9l.5.5m0 6L3.1 16.1C2.3 16.9 2.3 18.2 3.1 19c.8.8 2.1.8 2.9 0l.5-.5m11 0l.5.5c.8.8 2.1.8 2.9 0 .8-.8.8-2.1 0-2.9l-.5-.5" />
                        <path d="M12 2v2m0 16v2m7-9h2M3 12h2M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    )}
                  </div>
                  <div className="feature-info">
                    <h4>{f.name}</h4>
                    <p>{f.description}</p>
                    <span className={`feature-badge ${f.status}`} style={{ background: featureView === "bug" && f.status === "pending" ? "#fee2e2" : undefined, color: featureView === "bug" && f.status === "pending" ? "#ef4444" : undefined }}>
                      {f.status === "completed" ? "COMPLETED" : "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
              {(task.features || []).filter(f => (f.type || "feature") === featureView).length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", fontSize: "0.8rem", marginTop: 20 }}>
                  No {featureView === "bug" ? "bugs" : "features"} added yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Main column ── */}
          <div className="modal-main-column" style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", overflow: "hidden" }}>
            <div className="modal-fixed-top" style={{ paddingBottom: 15, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                {isEditMode ? (
                  <input
                    type="text"
                    className="form-input"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    style={{ fontSize: "1.2rem", fontWeight: 900, padding: "6px 10px", width: "100%", marginRight: 15, borderRadius: "var(--radius-md)" }}
                  />
                ) : (
                  <h1 className="modal-title" style={{ marginBottom: 0, fontSize: "1.3rem", letterSpacing: "-0.5px" }}>{task.title}</h1>
                )}
                {isEditMode ? (
                  <button className="btn-primary" style={{ background: "#3b82f6", color: "white", padding: "8px 16px", fontSize: "0.65rem", borderRadius: 8, width: "auto", fontWeight: 800 }} onClick={handleSaveEdits}>
                    SAVE CHANGES
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    {task.projectLink && (
                      <a
                        href={task.projectLink.startsWith("http") ? task.projectLink : `https://${task.projectLink}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ background: "var(--color-accent)", color: "white", padding: "8px 16px", fontSize: "0.65rem", borderRadius: 8, textDecoration: "none", fontWeight: 800, textAlign: "center", display: "inline-flex", alignItems: "center" }}
                      >
                        VIEW PROJECT
                      </a>
                    )}
                    {userRole === "Admin" && (
                      <button className="btn-danger" onClick={handleDelete}>DELETE TASK</button>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-assignee" style={{ marginBottom: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {isEditMode ? (
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <div className="custom-multiselect">
                      <div className="multiselect-trigger" onClick={() => setShowOptions(!showOptions)} style={{ color: selectedAssignees.size > 0 ? "#1e293b" : "#64748b", padding: "4px 8px", fontSize: "0.8rem" }}>
                        {selectedAssignees.size > 0 ? Array.from(selectedAssignees).join(", ") : "Select Assignees..."}
                      </div>
                      <div className={`multiselect-options ${showOptions ? "show" : ""}`} style={{ fontSize: "0.8rem" }}>
                        {(staff || []).map((s) => (
                          <div key={s.email} className="multiselect-option" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" id={`modal-staff-${s.email}`} checked={selectedAssignees.has(s.name)} onChange={() => toggleAssignee(s.name)} />
                            <label htmlFor={`modal-staff-${s.email}`}>{s.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "0.8rem" }}>Assigned to: {task.assignee || "Unassigned"}</span>
                )}
              </div>

              <div className="modal-desc" style={{ marginTop: 20 }}>
                <h3 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "0.65rem", color: "var(--color-text-secondary)", marginBottom: 8, letterSpacing: "1px" }}>Project Description</h3>
                {isEditMode ? (
                  <textarea
                    className="form-input"
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    style={{ width: "100%", height: 80, fontSize: "0.85rem", padding: 12, borderRadius: "var(--radius-md)" }}
                    placeholder="Enter project description..."
                  />
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                    {task.description || "No description provided."}
                  </div>
                )}
              </div>

              <div style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "15px 20px", boxShadow: "var(--shadow-sm)", marginTop: 15 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", letterSpacing: "0.5px", fontWeight: 800 }}>
                    Milestones: {doneM} / {milestones.length} ({progressPercent}%)
                  </span>
                </div>
                <div className="progress-container" style={{ height: 10, marginBottom: 0, borderRadius: 10 }}>
                  <div className="progress-fill" style={{ width: `${progressPercent}%`, borderRadius: 10 }}></div>
                </div>
              </div>
            </div>

            {/* ── Milestone list ── */}
            <div className="milestone-scroll-area" style={{ overflowY: "auto", paddingRight: "5px", marginTop: "10px" }}>
              <div className="milestone-vertical-list" style={{ marginTop: 10 }} ref={milestoneListRef}>
                {isEditMode ? (
                  <>
                    {editedMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="milestone-list-item edit-mode-item ms-drag-row"
                        style={{ padding: 10, gap: 10, userSelect: "none" }}
                      >
                        {/* ⋮⋮ handle: pointerdown triggers pure-DOM drag */}
                        <div
                          className="drag-handle"
                          style={{ fontSize: "1.1rem", color: "#94a3b8", cursor: "grab", padding: "0 6px", flexShrink: 0, userSelect: "none", touchAction: "none" }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            // Release implicit pointer capture so pointermove fires
                            // on whatever element the cursor is over (and bubbles to window)
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            startMilestoneDrag(idx);
                          }}
                        >⋮⋮</div>
                        <div className="milestone-list-content">
                          <div className="milestone-name-row" style={{ gap: 10 }}>
                            <input
                              type="text"
                              className="form-input edit-m-name"
                              value={m.name}
                              onChange={(e) => {
                                const next = [...editedMilestones];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setEditedMilestones(next);
                              }}
                              placeholder="Milestone Name"
                              style={{ flex: 2, padding: "4px 8px", fontSize: "0.8rem" }}
                            />
                            <input
                              type="number"
                              className="form-input edit-m-days"
                              value={m.days}
                              onChange={(e) => {
                                const next = [...editedMilestones];
                                next[idx] = { ...next[idx], days: e.target.value };
                                setEditedMilestones(next);
                              }}
                              placeholder="Days"
                              style={{ flex: 1, padding: "4px 8px", fontSize: "0.8rem" }}
                            />
                            <button
                              type="button"
                              className="btn-remove-milestone"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => setEditedMilestones(prev => prev.filter((_, i) => i !== idx))}
                            >×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: 10, alignSelf: "flex-start", width: "auto", padding: "6px 12px", fontSize: "0.75rem", background: "white", color: "var(--color-nav-bg)", border: "2px dashed #cbd5e1" }}
                      onClick={appendEditableMilestone}
                    >
                      + ADD MILESTONE
                    </button>
                  </>
                ) : (
                  milestones.map((m, idx) => {
                    let status = "waiting";
                    const firstIncompleteIdx = milestones.findIndex((ms) => !ms.completed);
                    if (m.completed) status = "completed";
                    else if (idx === firstIncompleteIdx) status = "active";

                    let actionBtn;
                    if (canEditMilestone) {
                      if (status === "completed") actionBtn = <button className="btn-milestone-undo" onClick={() => handleToggleMilestone(idx)}>Undo</button>;
                      else if (status === "active") actionBtn = <button className="btn-milestone-complete" onClick={() => handleToggleMilestone(idx)}>Complete</button>;
                      else actionBtn = <span className="badge-waiting">Waiting</span>;
                    } else {
                      if (status === "completed") actionBtn = <span className="badge-completed">Completed</span>;
                      else if (status === "active") actionBtn = <span className="badge-active">Active</span>;
                      else actionBtn = <span className="badge-waiting">Waiting</span>;
                    }

                    return (
                      <div key={idx} className={`milestone-list-item ${status}`}>
                        <div className="drag-handle">⋮⋮</div>
                        <div className="milestone-list-content">
                          <div className="milestone-name-row">
                            <span className={`m-name ${m.completed ? "strike" : ""}`}>
                              {m.name} <span style={{ fontWeight: "normal", color: "#94a3b8" }}>({m.days} days)</span>
                            </span>
                            {actionBtn}
                          </div>
                          {m.completed && m.completedAt && (
                            <div className="milestone-date">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              Completed {m.completedAt}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {userRole === "Admin" && (
              <div className="admin-creds-box" style={{ flexShrink: 0, marginTop: 10, background: "#ecfdf5", border: "2px solid #10b981", borderRadius: "8px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div className="creds-header" style={{ background: "#10b981", padding: "6px 12px", color: "white", fontSize: "0.6rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "8px", letterSpacing: "1px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  ADMIN CREDENTIALS (SENSITIVE)
                </div>
                <div className="creds-content" style={{ padding: "8px 12px", color: "#064e3b" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "2px 10px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", color: "#059669" }}>Email:</span>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", fontFamily: "monospace" }}>{task.adminCredentials?.email || "—"}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", color: "#059669" }}>Pass:</span>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", fontFamily: "monospace" }}>{task.adminCredentials?.password || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Notes column ── */}
          <div style={{ background: "rgba(241, 245, 249, 0.5)", border: "1px solid #f1f5f9", padding: "15px 20px", borderRadius: "var(--radius-lg)", alignSelf: "stretch", display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", overflow: "hidden" }}>
            <h3 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: 10, letterSpacing: "1px" }}>Notes & Updates</h3>
            <div className="notes-list" style={{ overflowY: "auto", paddingRight: "5px", marginBottom: 10 }}>
              {(task.notes || []).map((n, i) => (
                <div key={i} className="note-item" style={{ background: "white", padding: 12, borderRadius: "var(--radius-md)", border: "1px solid #f1f5f9", marginBottom: 8, boxShadow: "var(--shadow-sm)" }}>
                  <div className="note-date" style={{ color: "#10b981", marginBottom: 4, fontSize: "0.65rem", fontWeight: 700 }}>
                    {n.date} {n.writer && <span style={{ color: "#065f46", fontWeight: 900 }}>- {n.writer}</span>}
                  </div>
                  <div className="note-text" style={{ fontSize: "0.8rem", lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.text}</div>
                </div>
              ))}
              {(task.notes || []).length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", marginTop: 40, fontSize: "0.8rem" }}>No updates yet.</div>
              )}
            </div>
            <div className="note-input-group" style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #e2e8f0", marginBottom: 40 }}>
              <input
                type="text"
                className="note-input"
                id="modal-note-input"
                placeholder="Share an update..."
                style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNote(); } }}
              />
              <button className="btn-add-note" style={{ background: "var(--color-nav-bg)", color: "white", padding: "0 15px", borderRadius: "8px", fontWeight: 800, fontSize: "0.75rem" }} onClick={handleAddNote}>Add</button>
            </div>
          </div>

        </div>
      </div>

      {/* Feature Modal */}
      {featureModalConfig && (
        <FeatureModal
          mode={featureModalConfig.mode}
          feature={featureModalConfig.feature}
          taskId={taskId}
          onClose={() => setFeatureModalConfig(null)}
          canEdit={canManageFeatures}
          userName={userName}
          type={featureModalConfig.type || featureModalConfig.feature?.type || "feature"}
        />
      )}

      {/* Feature Context Menu — backdrop closes on outside click */}
      {featureContextMenu && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setFeatureContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setFeatureContextMenu(null); }}
          />
          <div
            style={{
              position: "fixed",
              top: featureContextMenu.y,
              left: featureContextMenu.x,
              background: "white",
              padding: "4px 0",
              borderRadius: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
              zIndex: 9999,
              border: "1px solid #e2e8f0",
              minWidth: 160,
              overflow: "hidden",
            }}
          >
            <button
              style={{ width: "100%", padding: "9px 16px", textAlign: "left", background: "none", border: "none", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#1e293b", fontWeight: 700 }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
              onClick={() => handleFeatureEdit(featureContextMenu.feature)}
            >
              ✏️ {featureContextMenu.feature?.type === "bug" ? "Edit Bug" : "Edit Feature"}
            </button>
            <div style={{ height: 1, background: "#f1f5f9", margin: "2px 0" }} />
            <button
              style={{ width: "100%", padding: "9px 16px", textAlign: "left", background: "none", border: "none", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontWeight: 700 }}
              onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
              onClick={() => handleFeatureDelete(featureContextMenu.feature)}
            >
              🗑️ {featureContextMenu.feature?.type === "bug" ? "Delete Bug" : "Delete Feature"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
