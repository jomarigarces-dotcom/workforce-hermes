import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import FeatureModal from "./FeatureModal";

export default function TaskModal({ taskId, isEditMode, userRole, actualRole, userName, staff, onClose, showModal }) {
  const tasks = useQuery(api.tasks.getTasks);
  const updateTaskMilestones = useMutation(api.tasks.updateTaskMilestones);
  const addNoteToTask = useMutation(api.tasks.addNoteToTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);

  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [showOptions, setShowOptions] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDesc, setEditedDesc] = useState("");
  const [featureModalConfig, setFeatureModalConfig] = useState(null);

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
    }
  }, [task, isEditMode]);

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
      updated[idx].completedAt = new Date().toLocaleString([], {
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
    addNoteToTask({ taskId, noteText: text, writer: userName });
    input.value = "";
  }

  function handleDelete() {
    showModal({
      title: "Delete Project",
      message: "Are you sure you want to permanently delete this project? This action cannot be undone.",
      type: "confirm",
      onConfirm: () => {
        deleteTask({ taskId });
        onClose();
      }
    });
  }

  function handleSaveEdits() {
    const items = document.querySelectorAll(`#milestone-list-edit .edit-mode-item`);
    const newMilestones = [];
    items.forEach((item, idx) => {
      const nameInput = item.querySelector(".edit-m-name");
      const daysInput = item.querySelector(".edit-m-days");
      const oldM = milestones[idx];
      newMilestones.push({
        name: nameInput.value.trim() || "Unnamed",
        days: parseInt(daysInput.value) || 0,
        completed: oldM && nameInput.value.trim() === oldM.name ? (oldM.completed || false) : false,
        completedAt: oldM && nameInput.value.trim() === oldM.name ? oldM.completedAt : undefined,
      });
    });

    updateTaskDetails({ 
      taskId, 
      newTitle: editedTitle,
      newDescription: editedDesc,
      newAssignee: Array.from(selectedAssignees).join(", "), 
      newMilestones 
    });
    onClose();
  }

  function appendEditableMilestone() {
    const list = document.getElementById("milestone-list-edit");
    if (!list) return;
    const div = document.createElement("div");
    div.className = "milestone-list-item edit-mode-item";
    div.style.padding = "10px";
    div.style.gap = "10px";
    div.innerHTML = `
      <div class="milestone-list-content">
        <div class="milestone-name-row" style="gap:10px;">
          <input type="text" class="form-input edit-m-name" placeholder="Milestone Name" style="flex:2; padding:4px 8px; font-size:0.8rem;" />
          <input type="number" class="form-input edit-m-days" placeholder="Days" style="flex:1; padding:4px 8px; font-size:0.8rem;" />
          <button type="button" class="btn-remove-milestone" style="padding:4px 8px; font-size:0.8rem;" onclick="this.closest('.edit-mode-item').remove()">×</button>
        </div>
      </div>`;
    list.appendChild(div);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-grid-3">
          <div className="features-sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="features-header" style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3>Features</h3>
                {(task.features || []).filter(f => f.status === 'pending').length > 0 && (
                  <span style={{ background: "#fef3c7", color: "#d97706", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "10px", fontWeight: "900" }}>
                    {(task.features || []).filter(f => f.status === 'pending').length} PENDING
                  </span>
                )}
              </div>
              {canManageFeatures && (
                <button className="btn-add-feature" onClick={() => setFeatureModalConfig({ mode: "add" })}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  ADD
                </button>
              )}
            </div>
            
            <div className="features-list" style={{ flex: 1, overflowY: "auto", paddingRight: "5px" }}>
              {(task.features || []).map((f) => (
                <div 
                  key={f.id} 
                  className={`feature-card ${f.status === 'completed' ? 'completed' : ''}`}
                  onClick={() => setFeatureModalConfig({ mode: "view", feature: f })}
                >
                  <div className="feature-icon-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <div className="feature-info">
                    <h4>{f.name}</h4>
                    <p>{f.description}</p>
                    <span className={`feature-badge ${f.status}`}>
                      {f.status === "completed" ? "COMPLETED" : "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
              {(task.features || []).length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", fontSize: "0.8rem", marginTop: 20 }}>
                  No features added yet.
                </div>
              )}
            </div>
          </div>

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
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ background: "var(--color-accent)", color: "white", padding: "8px 16px", fontSize: "0.65rem", borderRadius: 8, textDecoration: "none", fontWeight: 800, textAlign: "center", display: "inline-flex", alignItems: "center" }}
                      >
                        VIEW PROJECT
                      </a>
                    )}
                    {userRole === "Admin" && (
                      <button className="btn-danger" onClick={handleDelete}>
                        DELETE TASK
                      </button>
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
                            <input
                              type="checkbox"
                              id={`modal-staff-${s.email}`}
                              checked={selectedAssignees.has(s.name)}
                              onChange={() => toggleAssignee(s.name)}
                            />
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
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", letterSpacing: "0.5px" }}>
                    Milestones: {doneM} / {milestones.length} ({progressPercent}%)
                  </span>
                </div>
                <div className="progress-container" style={{ height: 10, marginBottom: 0, borderRadius: 10 }}>
                  <div className="progress-fill" style={{ width: `${progressPercent}%`, borderRadius: 10 }}></div>
                </div>
              </div>
            </div>

            <div className="milestone-scroll-area" style={{ overflowY: "auto", paddingRight: "5px", marginTop: "10px" }}>
              <div className="milestone-vertical-list" id="milestone-list-edit" style={{ marginTop: 10 }}>
                {milestones.map((m, idx) => {
                  if (isEditMode) {
                    return (
                      <div key={idx} className="milestone-list-item edit-mode-item" style={{ padding: 10, gap: 10 }}>
                        <div className="milestone-list-content">
                          <div className="milestone-name-row" style={{ gap: 10 }}>
                            <input type="text" className="form-input edit-m-name" defaultValue={m.name} placeholder="Milestone Name" style={{ flex: 2, padding: "4px 8px", fontSize: "0.8rem" }} />
                            <input type="number" className="form-input edit-m-days" defaultValue={m.days} placeholder="Days" style={{ flex: 1, padding: "4px 8px", fontSize: "0.8rem" }} />
                            <button type="button" className="btn-remove-milestone" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={(e) => e.currentTarget.closest(".edit-mode-item").remove()}>
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

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
                    <div key={idx} className={`milestone-list-item ${status}`} draggable={canEditMilestone}>
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
                })}
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
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", fontFamily: "monospace" }}>
                      {task.adminCredentials?.password || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: "rgba(241, 245, 249, 0.5)", border: "1px solid #f1f5f9", padding: "15px 20px", borderRadius: "var(--radius-lg)", alignSelf: "stretch", display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", overflow: "hidden" }}>
            <h3 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: 10, letterSpacing: "1px" }}>Notes & Updates</h3>
            <div className="notes-list" style={{ overflowY: "auto", paddingRight: "5px", marginBottom: 10 }}>
              {(task.notes || []).map((n, i) => (
                <div key={i} className="note-item" style={{ background: "white", padding: 12, borderRadius: "var(--radius-md)", border: "1px solid #f1f5f9", marginBottom: 8, boxShadow: "var(--shadow-sm)" }}>
                  <div className="note-date" style={{ color: "#10b981", marginBottom: 4, fontSize: "0.65rem", fontWeight: 700 }}>
                    {n.date} {n.writer && <span style={{ color: "#065f46", fontWeight: 900 }}> - {n.writer}</span>}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <button className="btn-add-note" style={{ background: "var(--color-nav-bg)", color: "white", padding: "0 15px", borderRadius: "8px", fontWeight: 800, fontSize: "0.75rem" }} onClick={handleAddNote}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {featureModalConfig && (
        <FeatureModal
          mode={featureModalConfig.mode}
          feature={featureModalConfig.feature}
          taskId={taskId}
          onClose={() => setFeatureModalConfig(null)}
          canEdit={canManageFeatures}
          userName={userName}
        />
      )}
    </div>
  );
}
