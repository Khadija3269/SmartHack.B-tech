// ─────────────────────────────────────────────────────────────────────────────
// HackHub Notification Service
//
// Design rules:
//  1. ALL storage is keyed per-user email — users never share state.
//  2. Prefs are per-user:  smarthack_notif_prefs_<email>
//  3. Inbox is per-user:   smarthack_notifications_<email>
//  4. Dismissed set is per-user: smarthack_notif_dismissed_<email>
//     When a user closes/dismisses a notification its ID is recorded here
//     forever, so it is NEVER re-delivered even if the event fires again.
//  5. deliverTo() checks prefs THEN dismissed before adding to the inbox.
// ─────────────────────────────────────────────────────────────────────────────

const PREFS_PREFIX     = "smarthack_notif_prefs_";
const INBOX_PREFIX     = "smarthack_notifications_";
const DISMISSED_PREFIX = "smarthack_notif_dismissed_";

const DEFAULT_PREFS = {
  hackathonCreated: true,
  newSubmission:    true,
  userRegistered:   true,
  weeklySummary:    true,
  criticalAlerts:   true,
};

// ── Prefs (per user) ──────────────────────────────────────────────────────────

export function getNotifPrefs(email) {
  if (!email) return { ...DEFAULT_PREFS };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_PREFIX + email) || "null");
    return saved ? { ...DEFAULT_PREFS, ...saved } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveNotifPrefs(email, prefs) {
  if (!email) return;
  localStorage.setItem(PREFS_PREFIX + email, JSON.stringify(prefs));
}

// ── Dismissed set (per user) ──────────────────────────────────────────────────

function getDismissed(email) {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_PREFIX + email) || "[]"));
  } catch {
    return new Set();
  }
}

function addDismissed(email, id) {
  const set = getDismissed(email);
  set.add(id);
  // Cap at 500 IDs to avoid bloat (keep newest)
  const arr = [...set].slice(-500);
  localStorage.setItem(DISMISSED_PREFIX + email, JSON.stringify(arr));
}

// ── Inbox (per user) ──────────────────────────────────────────────────────────

export function getNotifications(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(INBOX_PREFIX + email) || "[]");
  } catch {
    return [];
  }
}

function saveInbox(email, notifs) {
  localStorage.setItem(INBOX_PREFIX + email, JSON.stringify(notifs));
}

export function getUnreadCount(email) {
  return getNotifications(email).filter((n) => !n.read).length;
}

export function markAllRead(email) {
  const notifs = getNotifications(email).map((n) => ({ ...n, read: true }));
  saveInbox(email, notifs);
}

export function markRead(email, id) {
  const notifs = getNotifications(email).map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveInbox(email, notifs);
}

/**
 * Permanently dismiss a notification.
 * - Removes it from the inbox.
 * - Records its ID in the dismissed set so it is never re-delivered.
 */
export function dismissNotification(email, id) {
  // Remove from inbox
  const notifs = getNotifications(email).filter((n) => n.id !== id);
  saveInbox(email, notifs);
  // Remember forever
  addDismissed(email, id);
}

/**
 * Dismiss ALL current notifications for this user.
 */
export function dismissAll(email) {
  const notifs = getNotifications(email);
  notifs.forEach((n) => addDismissed(email, n.id));
  saveInbox(email, []);
}

// ── Delivery ─────────────────────────────────────────────────────────────────

/**
 * Attempt to deliver a notification to one user.
 * Skipped if:
 *   - prefKey is set and user has that pref turned OFF
 *   - notification ID is already in the user's dismissed set
 *   - notification ID is already in the user's inbox (duplicate guard)
 */
function deliverTo(email, notification, prefKey) {
  // 1. Pref check
  if (prefKey) {
    const prefs = getNotifPrefs(email);
    if (!prefs[prefKey]) return;
  }

  const id = notification.id ||
    `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // 2. Dismissed check — this user closed this notification before; never show again
  const dismissed = getDismissed(email);
  if (dismissed.has(id)) return;

  // 3. Inbox duplicate check
  const inbox = getNotifications(email);
  if (inbox.find((n) => n.id === id)) return;

  const entry = {
    id,
    type:      notification.type || "info",
    title:     notification.title,
    message:   notification.message,
    link:      notification.link || null,
    createdAt: Date.now(),
    read:      false,
  };

  inbox.unshift(entry);
  // Keep only the latest 50
  saveInbox(email, inbox.slice(0, 50));
}

// ── Public event broadcasters ─────────────────────────────────────────────────

/** Fired when an organizer creates a hackathon. Notifies all users (per pref). */
export function notifyHackathonCreated(allUsers, hackathon) {
  for (const user of allUsers) {
    if (!user.email) continue;
    deliverTo(
      user.email,
      {
        id:      `hack-created-${hackathon.id}-${user.email}`,
        type:    "hackathon",
        title:   "New Hackathon Created 🏆",
        message: `"${hackathon.title}" has been created. Theme: ${hackathon.theme || "—"}.`,
        link:    `/hackathon-details/${hackathon.id}`,
      },
      "hackathonCreated"
    );
  }
}

/** Fired when a participant submits a project. Notifies organizers/judges/admins (per pref). */
export function notifyNewSubmission(allUsers, submission, hackathon) {
  for (const user of allUsers) {
    if (!user.email) continue;
    if (!["organizer", "judge", "admin"].includes(user.role)) continue;
    deliverTo(
      user.email,
      {
        id:      `submission-${submission.id}-${user.email}`,
        type:    "submission",
        title:   "New Submission Received 📄",
        message: `"${submission.projectTitle}" was submitted for "${hackathon?.title || "a hackathon"}".`,
        link:    "/view-submissions",
      },
      "newSubmission"
    );
  }
}

/** Fired when a new user registers. Notifies admins (per pref). */
export function notifyUserRegistered(allUsers, newUser) {
  for (const user of allUsers) {
    if (!user.email) continue;
    if (user.role !== "admin") continue;
    deliverTo(
      user.email,
      {
        id:      `user-reg-${newUser.email}-${user.email}`,
        type:    "user",
        title:   "New User Registered 👤",
        message: `${newUser.fullName || newUser.name} (${newUser.role}) has registered and may need approval.`,
        link:    "/manage-users",
      },
      "userRegistered"
    );
  }
}

/** Deliver a direct personal notification (no pref gate). */
export function notifyDirect(email, title, message, link = null, type = "info") {
  deliverTo(
    email,
    {
      id:      `direct-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      link,
    },
    null
  );
}


/** Test trigger — sends a sample notification gated by the given pref. */
export function notifyTest(email, prefKey) {
  const map = {
    hackathonCreated: { title: "Test: New Hackathon 🏆", message: "This is a sample 'Hackathon Created' notification.", type: "hackathon" },
    newSubmission:    { title: "Test: New Submission 📄", message: "This is a sample 'New Submission' notification.", type: "submission" },
    userRegistered:   { title: "Test: New User 👤",      message: "This is a sample 'User Registered' notification.", type: "user" },
    weeklySummary:    { title: "Test: Weekly Summary 📊", message: "Here's a preview of your weekly activity summary.", type: "info" },
    criticalAlerts:   { title: "Test: Critical Alert ⚠️", message: "This is a sample critical system alert.", type: "info" },
  };
  const spec = map[prefKey];
  if (!spec) return false;
  const before = getNotifications(email).length;
  deliverTo(email, {
    id: `test-${prefKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...spec,
  }, prefKey);
  return getNotifications(email).length > before;
}
