// Notification utility for desktop notifications

export const initNotifications = () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return;
  }

  if (Notification.permission === "granted") {
    console.log("Notifications already permitted");
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      console.log("Notification permission result:", permission);
      if (permission === "granted") {
        console.log("Notification permission granted");
      }
    });
  } else {
    console.warn("Notification permission was denied");
  }
};

export const sendNotification = (title, options = {}) => {
  console.log("🔔 sendNotification called:", { title, hasNotificationAPI: "Notification" in window, permission: "Notification" in window ? Notification.permission : "N/A" });
  
  if (!("Notification" in window)) {
    console.warn("❌ Browser does not support Notification API");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn(`❌ Notification permission not granted (status: ${Notification.permission})`);
    return;
  }

  const defaultOptions = {
    icon: "/notification-icon.png",
    tag: "wf-hermes-notification",
    requireInteraction: false,
    ...options,
  };

  try {
    console.log("✅ Creating notification:", title);
    new Notification(title, defaultOptions);
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
};

export const notifyTaskUpdated = (taskTitle) => {
  sendNotification("Task Updated", {
    body: `"${taskTitle}" has been updated`,
    tag: "task-update",
  });
};

export const notifyFeatureAdded = (taskTitle, featureName) => {
  sendNotification("Feature/Bug Added", {
    body: `"${featureName}" added to "${taskTitle}"`,
    tag: "feature-add",
  });
};

export const notifyFeatureCompleted = (taskTitle, featureName) => {
  sendNotification("Feature/Bug Completed", {
    body: `"${featureName}" in "${taskTitle}" is now complete`,
    tag: "feature-complete",
  });
};

export const notifyNoteAdded = (taskTitle, notePreview) => {
  sendNotification("Note Added", {
    body: `New note on "${taskTitle}": ${notePreview.substring(0, 50)}${notePreview.length > 50 ? "..." : ""}`,
    tag: "note-add",
  });
};

export const notifyMilestoneCompleted = (taskTitle, milestoneName) => {
  sendNotification("Milestone Completed", {
    body: `"${milestoneName}" in "${taskTitle}" is complete`,
    tag: "milestone-complete",
  });
};
