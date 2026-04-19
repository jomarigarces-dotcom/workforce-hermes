import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { notifyTaskUpdated, notifyMilestoneCompleted, notifyNoteAdded } from "../utils/notifications";

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
  const [lastKnownTasks, setLastKnownTasks] = useState([]);
  const [fullViewColumn, setFullViewColumn] = useState(null);
  const [storageRefresh, setStorageRefresh] = useState(0); // Trigger re-render when tasks are viewed
  
  // Listen for custom event when tasks are marked as viewed (in same tab)
  useEffect(() => {
    const handleTaskViewed = () => {
      console.log("🔄 Task viewed event received, refreshing badges");
      setStorageRefresh(prev => prev + 1);
    };
    window.addEventListener("task-viewed", handleTaskViewed);
    return () => window.removeEventListener("task-viewed", handleTaskViewed);
  }, []);
  
  // For Programmer: calculate badge counts
  const isProgrammer = actualRole === "Programmer";
  const userEmail = localStorage.getItem("wf_email") || "";
  
  console.log("🎯 KanbanBoard render:", { 
    userRole, 
    actualRole, 
    isProgrammer,
    shouldShowBadges: userRole === "Programmer" || actualRole === "Programmer",
    tasksCount: displayTasks?.length || 0, 
    storageRefresh 
  });
  
  // Helper to calculate badges for a single task
  // Show badges if user is in Programmer view OR has Programmer role
  const getTaskBadges = (task) => {
    const canSeeBadges = userRole === "Programmer" || actualRole === "Programmer";
    if (!canSeeBadges || !task) {
      return { newNotes: 0, newFeatures: 0, newBugs: 0, hasBadges: false };
    }
    
    // Get last view time from localStorage as fallback
    const storageKey = `task_viewed_${task._id}`;
    const lastViewedTime = parseInt(localStorage.getItem(storageKey) || "0", 10);
    
    // For notes: include those with timestamp OR no timestamp (old notes are treated as old, only new timestamped ones count)
    // Only count notes that have explicit timestamps and are newer than last view
    const newNotes = (task.notes || []).filter(n => {
      const noteTime = n.timestamp || 0; // Old notes without timestamps get 0, treated as very old
      return noteTime > 0 && noteTime > lastViewedTime; // Only count if it has a timestamp AND is newer
    }).length;
    
    const newFeatures = (task.features || [])
      .filter(f => {
        if ((f.type || "feature") !== "feature") return false;
        const featureTime = f.createdAtTime || 0;
        return featureTime > 0 && featureTime > lastViewedTime;
      }).length;
      
    const newBugs = (task.features || [])
      .filter(f => {
        if ((f.type || "feature") !== "bug") return false;
        const featureTime = f.createdAtTime || 0;
        return featureTime > 0 && featureTime > lastViewedTime;
      }).length;
    
    const hasBadges = newNotes > 0 || newFeatures > 0 || newBugs > 0;
    const total = newNotes + newFeatures + newBugs;
    
    if (hasBadges || total > 0) {
      console.log(`📌 Badge calc for ${task.title} (${task._id}):`, { 
        hasBadges, 
        total,
        lastViewedTime,
        lastViewString: new Date(lastViewedTime).toLocaleString(),
        notesCount: (task.notes || []).length,
        notesDetail: (task.notes || []).map(n => ({ 
          text: n.text?.slice(0,15), 
          hasTimestamp: !!n.timestamp,
          timestamp: n.timestamp,
          isNew: (n.timestamp || 0) > lastViewedTime
        })),
        newNotes, 
        newFeatures, 
        newBugs,
      });
    }
    
    return { newNotes, newFeatures, newBugs, hasBadges, total };
  };
  
  // Body scroll lock for full column view
  useEffect(() => {
    if (fullViewColumn) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [fullViewColumn]);

  useEffect(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      setLastKnownTasks(tasks);
      console.log("📡 Tasks updated from server:", tasks.length, "tasks");
    }
  }, [tasks]);

  if (!tasks && lastKnownTasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#94a3b8" }}>Loading kanban...</p>
      </div>
    );
  }

  const displayTasks = (Array.isArray(tasks) && tasks.length > 0) ? tasks : lastKnownTasks;

  const columns = ["todo", "pending", "development", "testing", "done", "scrapyard"];
  const columnLabels = {
    todo: "To Do",
    pending: "Pending",
    development: "In Development",
    testing: "In Testing",
    done: "Done",
    scrapyard: "Scrapyard",
  };
  const columnClasses = {
    todo: "col-todo",
    pending: "col-pending",
    development: "col-dev",
    testing: "col-test",
    done: "col-done",
    scrapyard: "col-scrap",
  };

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
    const task = lastKnownTasks.find((t) => t._id === taskId);
    if (task) {
      notifyTaskUpdated(task.title);
    }
    updateTaskStatus({ taskId, newStatus });
  }

  function toggleMilestone(taskId, milestoneIdx, task) {
    const milestones = JSON.parse(JSON.stringify(task.milestones));
    const isNowCompleted = !milestones[milestoneIdx].completed;
    milestones[milestoneIdx].completed = isNowCompleted;
    if (isNowCompleted) {
      milestones[milestoneIdx].completedAt = new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      notifyMilestoneCompleted(task.title, milestones[milestoneIdx].name);
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
    const task = lastKnownTasks.find((t) => t._id === taskId);
    const estDate = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
    addNoteToTask({ taskId, noteText: text, writer: userName, date: estDate });
    if (task) {
      notifyNoteAdded(task.title, text);
    }
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

  function renderTaskCard(t, isFullView = false) {
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
    const cardClass = isFullView ? "rounded-task-card" : (isProgrammerView ? "programmer-card" : "task-card");

    return (
      <div
        key={t._id}
        className={cardClass}
        draggable={!isFullView}
        data-id={t._id}
        onDragStart={(e) => {
          if (isFullView) return;
          e.dataTransfer.setData("taskId", t._id);
          e.currentTarget.classList.add("dragging");
        }}
        onDragEnd={(e) => !isFullView && e.currentTarget.classList.remove("dragging")}
        onClick={() => { setFullViewColumn(null); openTaskModal(t._id); }}
        onContextMenu={(e) => onContextMenu(e, t)}
      >
        <div className="card-header" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 900, letterSpacing: "-0.4px" }}>{t.title}</h4>
            <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 800, letterSpacing: "0.8px" }}>
              #{(t._id || "").slice(-4).toUpperCase()}
            </div>
          </div>
          {(userRole === "Programmer" || actualRole === "Programmer") && getTaskBadges(t).hasBadges && (
            <div style={{
              background: "#ef4444",
              color: "white",
              fontSize: "0.65rem",
              fontWeight: 900,
              padding: "3px 7px",
              borderRadius: "12px",
              minWidth: "24px",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}>
              {getTaskBadges(t).total}
            </div>
          )}
        </div>
        
        {isFullView && (
          <div className="rounded-task-tag">
            {t.status.toUpperCase()}
          </div>
        )}

        <div className="card-assignee" style={{ marginBottom: 12, fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
          <svg className="assignee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {t.assignee || "Unassigned"}
        </div>

        {(isProgrammerView && !isFullView) ? (
          <>
            <div style={{ background: "white", border: "1px solid #dcfce7", borderRadius: 12, padding: 15, marginBottom: 20 }}>
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--color-text-secondary)", letterSpacing: "0.5px" }}>
                Progress
              </span>
              <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--color-accent)" }}>
                {progressPercent}%
              </span>
            </div>
            <div className="progress-container" style={{ height: 6, borderRadius: 10 }}>
              <div className="progress-fill" style={{ width: `${progressPercent}%`, borderRadius: 10 }}></div>
            </div>
            <div className="milestones-grid" style={{ marginTop: 10 }}>
              {Array.from({ length: totalM }, (_, i) => (
                <div key={i} className={`milestone-dot ${i < doneM ? "active" : ""}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            {!isFullView && (
              <div className="card-actions">
                {["todo", "pending", "development", "testing", "done", "scrapyard"].map((s) => (
                  <div key={s} className="action-btn" onClick={(e) => { e.stopPropagation(); handleMoveTask(t._id, s); }}>
                    {s === "development" ? "Dev" : s === "testing" ? "Test" : s === "scrapyard" ? "Scrap" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div id="kanban-view" className="view-section">
      <div className="kanban-totals-bar" style={{ gap: "15px", padding: "15px 20px", marginBottom: "15px" }}>
        {columns.map((c) => (
          <div className="total-card" key={c} onClick={() => setFullViewColumn(c)} style={{ padding: "15px", borderRadius: "var(--radius-md)", border: "1px solid #f1f5f9", boxShadow: "var(--shadow-sm)" }}>
            <div className="total-value" style={{ fontSize: "1.4rem", color: `var(--${columnClasses[c].replace("col-", "col-")})` }}>
              {totals[c]}
            </div>
            <div className="total-label" style={{ fontSize: "0.6rem", letterSpacing: "1.2px" }}>{columnLabels[c]}</div>
          </div>
        ))}
      </div>

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
            <div className="col-header" style={{ padding: "10px", letterSpacing: "0.8px", fontSize: "0.75rem" }}>{columnLabels[col]}</div>
            <div className="col-content">
              {filtered
                .filter((t) => {
                  const s = (t.status || "").toLowerCase();
                  if (col === "development") return s === "development" || s === "inprogress";
                  return s === col;
                })
                .slice(0, 5) // Show only latest 5
                .map((t) => renderTaskCard(t))}
            </div>
          </div>
        ))}
      </div>

      {/* Full View Modal */}
      {fullViewColumn && (
        <div className="modal-overlay" onClick={() => setFullViewColumn(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1200 }}>
            <button className="modal-close" onClick={() => setFullViewColumn(null)}>×</button>
            <h2 style={{ fontWeight: 900, textTransform: "uppercase", marginBottom: 30, color: "var(--color-text-primary)" }}>
              All Tasks: {columnLabels[fullViewColumn]} ({totals[fullViewColumn]})
            </h2>
            <div className="full-kanban-grid">
              {filtered
                .filter((t) => {
                  const s = (t.status || "").toLowerCase();
                  if (fullViewColumn === "development") return s === "development" || s === "inprogress";
                  return s === fullViewColumn;
                })
                .map((t) => renderTaskCard(t, true))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
