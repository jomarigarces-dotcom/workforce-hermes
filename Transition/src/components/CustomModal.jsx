import { useEffect } from "react";

/**
 * A reusable, premium-styled modal for alerts and confirmations.
 * 
 * Props:
 * - isOpen: boolean
 * - title: string
 * - message: string
 * - type: 'alert' | 'confirm' | 'error' | 'success'
 * - onConfirm: function (called for OK/Confirm)
 * - onCancel: function (called for Cancel/Close)
 */
export default function CustomModal({ isOpen, title, message, type = "alert", onConfirm, onCancel }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        onConfirm();
      } else if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "success":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "confirm":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default: // alert
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onCancel}>
      <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="custom-modal-icon">
          {getIcon()}
        </div>
        <h2 className="custom-modal-title">{title}</h2>
        <p className="custom-modal-message">{message}</p>
        
        <div className="custom-modal-actions">
          {type === "confirm" && (
            <button className="btn-modal-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button 
            className={`btn-modal-confirm ${type === 'confirm' ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
            autoFocus
          >
            {type === "confirm" ? "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
