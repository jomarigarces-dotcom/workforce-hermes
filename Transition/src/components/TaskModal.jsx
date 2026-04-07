import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    addNoteToTask({ taskId, noteText: text });
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

        <div className="modal-grid">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              {isEditMode ? (
                <input 
                  type="text" 
                  className="form-input" 
                  value={editedTitle} 
                  onChange={(e) => setEditedTitle(e.target.value)}
                  style={{ fontSize: "1.8rem", fontWeight: 900, padding: "5px 10px", width: "100%", marginRight: 20 }}
                />
              ) : (
                <h1 className="modal-title" style={{ marginBottom: 0 }}>{task.title}</h1>
              )}
              
              {isEditMode ? (
                <button className="btn-primary" style={{ background: "#3b82f6", color: "white", padding: "8px 16px", fontSize: "0.8rem", borderRadius: 8, width: "auto" }} onClick={handleSaveEdits}>
                  Save Changes
                </button>
              ) : userRole === "Admin" ? (
                <button className="btn-secondary" style={{ background: "#ef4444", color: "white", padding: "8px 16px", fontSize: "0.8rem", borderRadius: 8 }} onClick={handleDelete}>
                  Delete Task
                </button>
              ) : null}
            </div>

            <div className="modal-assignee">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {isEditMode ? (
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div className="custom-multiselect">
                    <div className="multiselect-trigger" onClick={() => setShowOptions(!showOptions)} style={{ color: selectedAssignees.size > 0 ? "#1e293b" : "#64748b", padding: "4px 8px", fontSize: "0.85rem" }}>
                      {selectedAssignees.size > 0 ? Array.from(selectedAssignees).join(", ") : "Select Assignees..."}
                    </div>
                    <div className={`multiselect-options ${showOptions ? "show" : ""}`} style={{ fontSize: "0.85rem" }}>
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
                `Assigned to: ${task.assignee || "Unassigned"}`
              )}
            </div>

            <div className="modal-desc">
              <h3 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "0.9rem", color: "#1e293b", marginBottom: 10 }}>Project Description</h3>
              {isEditMode ? (
                <textarea 
                  className="form-input" 
                  value={editedDesc} 
                  onChange={(e) => setEditedDesc(e.target.value)}
                  style={{ width: "100%", height: 100, fontSize: "0.9rem", padding: 10 }}
                  placeholder="Enter project description..."
                />
              ) : (
                task.description || "No description provided."
              )}
            </div>

            <div style={{ background: "white", border: "1px solid #dcfce7", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 auto" }}>
                  Milestones: {doneM} / {milestones.length} ({progressPercent}%)
                </span>
              </div>
              <div className="progress-container" style={{ height: 10, marginBottom: 15, borderRadius: 10 }}>
                <div className="progress-fill" style={{ width: `${progressPercent}%`, borderRadius: 10 }}></div>
              </div>

              <div className="milestone-vertical-list" id="milestone-list-edit">
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
              {isEditMode && (
                <button type="button" className="btn-add-note" style={{ marginTop: 10, width: "100%" }} onClick={appendEditableMilestone}>
                  + Add Milestone
                </button>
              )}
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: 30, borderRadius: 20, alignSelf: "start" }}>
            <h3 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "0.9rem", color: "#1e293b", marginBottom: 20 }}>Notes & Updates</h3>
            <div className="notes-list" style={{ maxHeight: 400, overflowY: "auto" }}>
              {(task.notes || []).map((n, i) => (
                <div key={i} className="note-item">
                  <div className="note-date">{n.date}</div>
                  <div className="note-text">{n.text}</div>
                </div>
              ))}
              {(task.notes || []).length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>No notes yet</div>
              )}
            </div>
            <div className="note-input-group" style={{ marginTop: 20 }}>
              <input 
                type="text" 
                className="note-input" 
                id="modal-note-input" 
                placeholder="Add a note..." 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <button className="btn-add-note" onClick={handleAddNote}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
