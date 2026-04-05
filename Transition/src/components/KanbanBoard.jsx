import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function KanbanBoard({ userRole, actualRole, userName, openTaskModal, onContextMenu, showModal }) {
  const tasks = useQuery(api.tasks.getTasks);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus).withOptimisticUpdate(
    (localStore, { taskId, newStatus }) => {
      const allTasks = localStore.getQuery(api.tasks.getTasks, {});
      if (!Array.isArray(allTasks)) return;
      const task = allTasks.find((t) => t._id === taskId);
      if (task) {
        localStore.setQuery(api.tasks.getTasks, {}, (prevTasks) => {
          if (!Array.isArray(prevTasks)) return prevTasks;
          return prevTasks.map((t) => (t._id === taskId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t));
        });
      }
    }
  );
  const updateTaskMilestones = useMutation(api.tasks.updateTaskMilestones);
  const addNoteToTask = useMutation(api.tasks.addNoteToTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const [expandedCards, setExpandedCards] = useState({});
  const [draggedMilestoneIdx, setDraggedMilestoneIdx] = useState(null);

  // Persist last known tasks to prevent empty-board flicker during sync
  const [lastKnownTasks, setLastKnownTasks] = useState([]);

  useEffect(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      setLastKnownTasks(tasks);
    }
  }, [tasks]);

  // Show a minimal loading state only on the very first load (no known tasks yet)
  if (!tasks && lastKnownTasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#94a3b8" }}>Loading kanban...</p>
      </div>
    );
  }

  const displayTasks = (Array.isArray(tasks) && tasks.length > 0) ? tasks : lastKnownTasks;
  const sorted = [...(Array.isArray(displayTasks) ? displayTasks : [])].sort((a, b) => b.lastUpdated - a.lastUpdated);
  let filtered = sorted;
  if (userRole === "Programmer") {
    filtered = sorted.filter(
      (t) => t.assignee && t.assignee.toLowerCase().includes(userName.toLowerCase())
    );
  }

  // Count per column
  const totals = {};
  columns.forEach((c) => {
    totals[c] = filtered.filter((t) => {
      const s = (t.status || "").toLowerCase();
      if (c === "development") return s === "development" || s === "inprogress";
      return s === c;
    }).length;
  });

  function handleDrop(e, newStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      updateTaskStatus({ taskId, newStatus });
    }
  }

  function handleMoveTask(taskId, newStatus) {
    updateTaskStatus({ taskId, newStatus });
  }

  function toggleMilestone(taskId, milestoneIdx, task) {
    const milestones = JSON.parse(JSON.stringify(task.milestones));
    const isNowCompleted = !milestones[milestoneIdx].completed;
    milestones[milestoneIdx].completed = isNowCompleted;
    if (isNowCompleted) {
      milestones[milestoneIdx].completedAt = new Date().toLocaleString([], {
        year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } else {
      delete milestones[milestoneIdx].completedAt;
    }
    const completedCount = milestones.filter((m) => m.completed).length;
    updateTaskMilestones({ taskId, milestones, completedCount });
  }

  function handleAddNote(taskId, inputId) {
    const input = document.getElementById(inputId);
    const text = input?.value?.trim();
    if (!text) return;
    addNoteToTask({ taskId, noteText: text });
    input.value = "";
  }

  function toggleMilestoneView(taskId) {
    setExpandedCards((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  function handleMilestoneDrop(e, taskId, targetIdx, task) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMilestoneIdx === null || draggedMilestoneIdx === targetIdx) return;
    const milestones = [...task.milestones];
    const [moved] = milestones.splice(draggedMilestoneIdx, 1);
    milestones.splice(targetIdx, 0, moved);
    const completedCount = milestones.filter((m) => m.completed).length;
    updateTaskMilestones({ taskId, milestones, completedCount });
    setDraggedMilestoneIdx(null);
  }

  function renderTaskCard(t) {
    const milestones = t.milestones || [];
    const totalM = milestones.length > 0 ? milestones.length : 10;
    const doneM = t.completedMilestones || 0;
    const progressPercent = Math.round((doneM / totalM) * 100);

    let canEditMilestone = true;
    if (actualRole === "Admin") {
      const assigneeVal = (t.assignee || "").toLowerCase();
      const userNameVal = (userName || "").toLowerCase();
      if (!assigneeVal.includes(userNameVal)) canEditMilestone = false;
    }

    const isProgrammerView = userRole === "Programmer";
    const cardClass = isProgrammerView ? "programmer-card" : "task-card";

    return (
      <div
        key={t._id}
        className={cardClass}
        draggable
        data-id={t._id}
        onDragStart={(e) => {
          e.dataTransfer.setData("taskId", t._id);
          e.currentTarget.classList.add("dragging");
        }}
        onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
        onClick={() => openTaskModal(t._id)}
        onContextMenu={(e) => onContextMenu(e, t._id)}
      >
        <div className="card-header">
          <h4>{t.title}</h4>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>
            #{(t._id || "").slice(-4)}
          </div>
        </div>
        <div className="card-assignee">
          <svg className="assignee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {t.assignee || "Unassigned"}
        </div>

        {isProgrammerView ? (
          /* Programmer card: expandable milestones + notes */
          <>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 15, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Milestones: {doneM} / {totalM} ({progressPercent}%)
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.7rem", borderRadius: 6 }}
                  onClick={(e) => { e.stopPropagation(); toggleMilestoneView(t._id); }}
                >
                  {expandedCards[t._id] ? "Collapse" : "Expand"}
                </button>
              </div>
              <div className="progress-container" style={{ height: 8, marginBottom: 15, borderRadius: 10 }}>
                <div className="progress-fill" style={{ width: `${progressPercent}%`, borderRadius: 10 }}></div>
              </div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontStyle: "italic", marginBottom: 10, textAlign: "center" }}>
                Drag milestones to reorder them
              </div>
              <div className={`milestone-vertical-list ${expandedCards[t._id] ? "" : "collapsed-view"}`}>
                {milestones.map((m, idx) => {
                  const allCompleted = milestones.every((ms) => ms.completed);
                  let status = "waiting";
                  const firstIncompleteIdx = milestones.findIndex((ms) => !ms.completed);
                  if (m.completed) status = "completed";
                  else if (idx === firstIncompleteIdx) status = "active";

                  let actionBtn;
                  if (canEditMilestone) {
                    if (status === "completed") {
                      actionBtn = <button className="btn-milestone-undo" onClick={(e) => { e.stopPropagation(); toggleMilestone(t._id, idx, t); }}>Undo</button>;
                    } else if (status === "active") {
                      actionBtn = <button className="btn-milestone-complete" onClick={(e) => { e.stopPropagation(); toggleMilestone(t._id, idx, t); }}>Complete</button>;
                    } else {
                      actionBtn = <span className="badge-waiting">Waiting</span>;
                    }
                  } else {
                    if (status === "completed") actionBtn = <span className="badge-completed">Completed</span>;
                    else if (status === "active") actionBtn = <span className="badge-active">Active</span>;
                    else actionBtn = <span className="badge-waiting">Waiting</span>;
                  }

                  let visibilityClass = "";
                  if (status === "active" || (allCompleted && idx === milestones.length - 1)) {
                    visibilityClass = "m-active-or-last";
                  }

                  return (
                    <div
                      key={idx}
                      className={`milestone-list-item ${status} ${visibilityClass}`}
                      style={{ padding: 10, gap: 10 }}
                      draggable={canEditMilestone}
                      onDragStart={(e) => { e.stopPropagation(); setDraggedMilestoneIdx(idx); }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => handleMilestoneDrop(e, t._id, idx, t)}
                    >
                      <div className="drag-handle" style={{ fontSize: "1rem" }}>⋮⋮</div>
                      <div className="milestone-list-content">
                        <div className="milestone-name-row">
                          <span className={`m-name ${m.completed ? "strike" : ""}`} style={{ fontSize: "0.75rem" }}>
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

            {/* Notes section */}
            <div className="notes-section" onClick={(e) => e.stopPropagation()}>
              <div className="notes-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Latest Note
              </div>
              <div className="notes-list">
                {(t.notes || []).length > 0 ? (
                  <div className="note-item">
                    <div className="note-date">{t.notes[t.notes.length - 1].date}</div>
                    <div className="note-text">{t.notes[t.notes.length - 1].text}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic" }}>No notes yet</div>
                )}
              </div>
              <div className="note-input-group">
                <input 
                  type="text" 
                  className="note-input" 
                  id={`note-input-${t._id}`} 
                  placeholder="Add a note..." 
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNote(t._id, `note-input-${t._id}`);
                    }
                  }}
                />
                <button className="btn-add-note" onClick={() => handleAddNote(t._id, `note-input-${t._id}`)}>
                  Add
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Admin view: progress dots + action buttons */
          <>
            <div className="progress-container">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="milestones-grid">
              {Array.from({ length: totalM }, (_, i) => (
                <div key={i} className={`milestone-dot ${i < doneM ? "active" : ""}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="card-actions">
              {["todo", "pending", "development", "testing", "done", "scrapyard"].map((s) => (
                <div key={s} className="action-btn" onClick={(e) => { e.stopPropagation(); handleMoveTask(t._id, s); }}>
                  {s === "development" ? "Dev" : s === "testing" ? "Test" : s === "scrapyard" ? "Scrap" : s.charAt(0).toUpperCase() + s.slice(1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div id="kanban-view" className="view-section">
      {/* Totals Bar */}
      <div className="kanban-totals-bar">
        {columns.map((c) => (
          <div className="total-card" key={c}>
            <div className="total-value" style={{ color: `var(--${columnClasses[c].replace("col-", "col-")})` }}>
              {totals[c]}
            </div>
            <div className="total-label">{columnLabels[c]}</div>
          </div>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="kanban-container">
        {columns.map((col) => (
          <div
            key={col}
            className={`kanban-col ${columnClasses[col]}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
                e.currentTarget.classList.remove("drag-over");
              }
            }}
            onDrop={(e) => { e.currentTarget.classList.remove("drag-over"); handleDrop(e, col); }}
          >
            <div className="col-header">{columnLabels[col]}</div>
            <div className="col-content">
              {filtered
                .filter((t) => {
                  const s = (t.status || "").toLowerCase();
                  if (col === "development") return s === "development" || s === "inprogress";
                  return s === col;
                })
                .map((t) => renderTaskCard(t))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
