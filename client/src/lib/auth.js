import { api } from "./api";
import { cache, refreshUsers } from "./store";
import { notifyUserRegistered } from "./notifications";

const SESSION_KEY = "smarthack_session";
const isBrowser = () => typeof window !== "undefined";

export function currentUser() {
  if (!isBrowser()) return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

export function getUsers() {
  return cache.users.slice();
}

export async function saveUser(user) {
  const created = await api.post("/api/register", {
    name: user.fullName || user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    organization: user.organization,
    bio: user.bio,
    experience: user.experience,
    reason: user.reason,
    cvName: user.cvName,
    cvData: user.cvData,
  });
  await refreshUsers();
  notifyUserRegistered(cache.users, created);
  return created;
}

export async function login(email, password) {
  const { user } = await api.post("/api/login", { email, password });
  // shape match with old code (fullName)
  const stored = { ...user, fullName: user.fullName || user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  return stored;
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

export function dashboardPathFor(role) {
  switch (role) {
    case "participant": return "/participant-dashboard";
    case "judge":       return "/judge-dashboard";
    case "organizer":   return "/organizer-dashboard";
    case "mentor":      return "/mentor-dashboard";
    case "admin":       return "/admin-dashboard";
    default:            return "/";
  }
}

// Forgot-password helpers (demo, no email)
export async function resetPassword(email, newPassword, code) {
  return api.post("/api/reset-password", { email, newPassword, code });
}
export async function changePassword(email, oldPassword, newPassword) {
  return api.post("/api/change-password", { email, oldPassword, newPassword });
}
export async function updateProfile(currentEmail, patch) {
  const updated = await api.patch(`/api/users/${encodeURIComponent(currentEmail)}/profile`, patch);
  await refreshUsers();
  const me = currentUser();
  if (me && me.email === currentEmail) {
    const next = { ...me, ...updated, fullName: updated.fullName || updated.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  }
  return updated;
}
