// Centralized data store backed by the HackHub API + MongoDB.
//
// Components use the same SYNCHRONOUS function signatures as before. We keep
// an in-memory cache that is hydrated from the API on app boot and updated
// optimistically on writes (which also fire-and-forget to the server).

import { api } from "./api";
import { currentUser } from "./auth";
import {
  notifyHackathonCreated,
  notifyNewSubmission,
  notifyUserRegistered,
} from "./notifications";

export const MAX_HACKATHONS_PER_PARTICIPANT = 2;

// ---------- Categories, permissions & archive ----------
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

// A hackathon is archived once manually archived OR its end date has passed.
export function isArchived(h) {
  if (!h) return false;
  return !!h.archived || (!!h.endDate && h.endDate < todayStr());
}
export function isAdmin() { return currentUser()?.role === "admin"; }

// Categories the logged-in organizer is assigned to. Reads the live user record
// (so admin changes apply on refresh), falling back to the saved session.
export function myCategories() {
  const me = currentUser();
  if (!me) return [];
  if (me.role === "admin") return getCategories();
  const live = cache.users.find((u) => (u.email || "").toLowerCase() === me.email.toLowerCase());
  return (live?.categories || me.categories || []).slice();
}
// Admin: everything. Organizer: only hackathons in an assigned category.
export function canManage(h) {
  const me = currentUser();
  if (!me || !h) return false;
  if (me.role === "admin") return true;
  if (me.role === "organizer") return myCategories().includes(h.category);
  return false;
}
// Hackathons the current user may manage (admin = all, organizer = assigned categories).
export function manageableHackathons() {
  return cache.hackathons.filter(canManage);
}

// ---------- Categories (managed by admins, stored in MongoDB) ----------
export function getCategories() { return cache.categories.map((c) => c.name); }
export function getCategoryRecords() { return cache.categories.slice(); }
export async function refreshCategories() {
  try { cache.categories = await api.get("/api/categories"); } catch {}
}
const sortCategories = () => { cache.categories.sort((a, b) => a.name.localeCompare(b.name)); };
export async function addCategory(name) {
  const row = await api.post("/api/categories", { name });
  cache.categories = [...cache.categories.filter((c) => c.id !== row.id), row];
  sortCategories();
  return row;
}
// Renaming cascades to hackathons, announcements and organizers on the server,
// so pull those back down afterwards.
export async function renameCategory(id, name) {
  const row = await api.put(`/api/categories/${id}`, { name });
  cache.categories = cache.categories.map((c) => (c.id === id ? row : c));
  sortCategories();
  await Promise.all([refreshHackathons(), refreshUsers(), refreshAnnouncements()]);
  return row;
}
export async function removeCategory(id) {
  await api.del(`/api/categories/${id}`);
  const gone = cache.categories.find((c) => c.id === id);
  cache.categories = cache.categories.filter((c) => c.id !== id);
  if (gone) {
    cache.users = cache.users.map((u) =>
      (u.categories || []).includes(gone.name) ? { ...u, categories: u.categories.filter((x) => x !== gone.name) } : u
    );
  }
}

// Module-level cache shared by all consumers
export const cache = {
  categories: [],
  users: [],
  hackathons: [],
  registrations: [],
  submissions: [],
  evaluations: [],
  assignments: [],
  mentorAssignments: [],
  questions: [],
  announcements: [],
  scoringCriteria: [],
  discussionPosts: [],
  eventFeedback: [],
  ready: false,
};

// ---------- Bootstrap ----------
export async function bootstrap() {
  try {
    const data = await api.get("/api/bootstrap");
    cache.categories = data.categories || [];
    cache.users = data.users || [];
    cache.hackathons = data.hackathons || [];
    cache.registrations = data.registrations || [];
    cache.submissions = data.submissions || [];
    cache.evaluations = data.evaluations || [];
    cache.assignments = data.assignments || [];
    cache.mentorAssignments = data.mentorAssignments || [];
    cache.questions = data.questions || [];
    cache.announcements = data.announcements || [];
    cache.scoringCriteria = data.scoringConfig?.criteria || [];
  } catch (e) {
    console.error("Bootstrap failed:", e.message);
  } finally {
    cache.ready = true;
  }
}

export async function refreshUsers() {
  try { cache.users = await api.get("/api/users"); } catch {}
}
export async function refreshHackathons() {
  try { cache.hackathons = await api.get("/api/hackathons"); } catch {}
}
export async function refreshAnnouncements() {
  try { cache.announcements = await api.get("/api/announcements"); } catch {}
}
export async function refreshScoringCriteria() {
  try {
    const doc = await api.get("/api/scoring-config");
    cache.scoringCriteria = doc.criteria || [];
  } catch {}
}
export async function refreshDiscussion(hackathonId) {
  try {
    const q = hackathonId ? `?hackathonId=${encodeURIComponent(hackathonId)}` : "";
    cache.discussionPosts = await api.get(`/api/discussion${q}`);
  } catch {}
}
export async function refreshFeedback(hackathonId) {
  try {
    const q = hackathonId ? `?hackathonId=${encodeURIComponent(hackathonId)}` : "";
    cache.eventFeedback = await api.get(`/api/feedback${q}`);
  } catch {}
}
export async function refreshRegistrations() {
  try { cache.registrations = await api.get("/api/registrations"); } catch {}
}
export async function refreshSubmissions() {
  try { cache.submissions = await api.get("/api/submissions"); } catch {}
}
export async function refreshEvaluations() {
  try { cache.evaluations = await api.get("/api/evaluations"); } catch {}
}
export async function refreshAssignments() {
  try { cache.assignments = await api.get("/api/assignments"); } catch {}
}
export async function refreshMentorAssignments() {
  try { cache.mentorAssignments = await api.get("/api/mentor-assignments"); } catch {}
}
export async function refreshQuestions() {
  try { cache.questions = await api.get("/api/questions"); } catch {}
}

// kept for compatibility; seeding now lives on the server.
export function ensureSeed() {}

// ---------- Hackathons ----------
export function getHackathons() { return cache.hackathons.slice(); }
export function getHackathon(id) { return cache.hackathons.find((h) => h.id === id); }
export function createHackathon(input) {
  const me = currentUser();
  const payload = { ...input, organizerEmail: me?.email || "system" };
  // optimistic
  const tempId = "tmp-" + Math.random().toString(36).slice(2);
  const tempRow = { ...payload, id: tempId };
  cache.hackathons.push(tempRow);
  api.post("/api/hackathons", payload).then((row) => {
    const i = cache.hackathons.findIndex((h) => h.id === tempId);
    if (i >= 0) cache.hackathons[i] = row;
    notifyHackathonCreated(cache.users, row);
  }).catch((e) => { console.error(e); refreshHackathons(); });
  return tempRow;
}
export function updateHackathon(id, patch) {
  cache.hackathons = cache.hackathons.map((h) => h.id === id ? { ...h, ...patch } : h);
  api.put(`/api/hackathons/${id}`, patch).catch((e) => { console.error(e); refreshHackathons(); });
}

export function setArchived(id, archived) {
  const prev = cache.hackathons.find((h) => h.id === id);
  cache.hackathons = cache.hackathons.map((h) => h.id === id ? { ...h, archived } : h);
  return api.put(`/api/hackathons/${id}`, { archived }).then((row) => {
    cache.hackathons = cache.hackathons.map((h) => h.id === id ? row : h);
    return row;
  }).catch((e) => {
    if (prev) cache.hackathons = cache.hackathons.map((h) => h.id === id ? prev : h);
    throw e;
  });
}

// ---------- Announcements & ads ----------
// An announcement may carry a link (another HackHub hackathon or an external URL),
// which makes it work as an advertisement.
export function announcementsFor(hackathonId) {
  return cache.announcements
    .filter((a) => a.hackathonId === hackathonId)
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
export function adHasLink(a) { return !!(a?.linkedHackathonId || a?.linkUrl); }
// An ad pointing at a hackathon that has since been archived/removed is stale:
// there is nothing left to join, so readers shouldn't see it.
export function isAdLive(a) {
  if (!a?.linkedHackathonId) return true;
  const target = getHackathon(a.linkedHackathonId);
  return !!target && !isArchived(target);
}
const linkFields = (link = {}) => ({
  linkedHackathonId: link.linkedHackathonId || "",
  linkUrl: (link.linkUrl || "").trim(),
  linkLabel: (link.linkLabel || "").trim(),
});
export function publishAnnouncement(hackathonId, title, message, link) {
  const me = currentUser();
  const payload = { hackathonId, title, message, ...linkFields(link), organizerEmail: me?.email || "system" };
  const tempId = "tmp-" + Math.random().toString(36).slice(2);
  const tempRow = { ...payload, id: tempId, createdAt: Date.now() };
  cache.announcements = [tempRow, ...cache.announcements];
  return api.post("/api/announcements", payload).then((row) => {
    const i = cache.announcements.findIndex((a) => a.id === tempId);
    if (i >= 0) cache.announcements[i] = row;
    return row;
  }).catch((e) => {
    cache.announcements = cache.announcements.filter((a) => a.id !== tempId);
    refreshAnnouncements();
    throw e;
  });
}
// Announce / advertise on every active hackathon in a category at once.
export function publishCategoryAnnouncement(category, title, message, link) {
  return api.post("/api/announcements", { category, title, message, ...linkFields(link) }).then((res) => {
    const rows = res.created || [];
    cache.announcements = [...rows, ...cache.announcements];
    return rows;
  });
}
export function deleteAnnouncement(id) {
  cache.announcements = cache.announcements.filter((a) => a.id !== id);
  api.del(`/api/announcements/${id}`).catch((e) => { console.error(e); refreshAnnouncements(); });
}
// Active hackathons an ad can point to (any hackathon on the platform, not just your own).
export function promotableHackathons(excludeId) {
  return cache.hackathons
    .filter((h) => !isArchived(h) && h.id !== excludeId && !String(h.id).startsWith("tmp-"))
    .slice()
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

// ---------- Scoring Criteria (shared rubric, stored in MongoDB) ----------
// All judges read this same list, so scores are directly comparable and the
// leaderboard's totals mean the same thing for every submission.
export function getScoringCriteria() {
  return cache.scoringCriteria.slice();
}
export async function saveScoringCriteria(criteria) {
  const doc = await api.put("/api/scoring-config", { criteria });
  cache.scoringCriteria = doc.criteria || [];
  return cache.scoringCriteria;
}

// ---------- Discussion Board ----------
// Open threads per hackathon: any post can be replied to by anyone
// (participants, mentors, organizers), unlike the mentor-directed Q&A.
export function discussionThreadsFor(hackathonId) {
  const posts = cache.discussionPosts.filter((p) => p.hackathonId === hackathonId);
  const roots = posts.filter((p) => !p.parentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return roots.map((root) => ({
    ...root,
    replies: posts
      .filter((p) => p.parentId === root.id)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
  }));
}
export function postDiscussion(hackathonId, message, parentId = null) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  if (!message.trim()) throw new Error("Message cannot be empty.");
  const payload = { hackathonId, parentId, message: message.trim(), authorName: me.fullName || me.name || me.email };
  const temp = {
    ...payload,
    id: "tmp-" + Math.random(),
    authorEmail: me.email,
    authorRole: me.role,
    createdAt: Date.now(),
  };
  cache.discussionPosts = [...cache.discussionPosts, temp];
  return api.post("/api/discussion", payload).then((row) => {
    const i = cache.discussionPosts.findIndex((p) => p.id === temp.id);
    if (i >= 0) cache.discussionPosts[i] = row;
    return row;
  }).catch((e) => {
    cache.discussionPosts = cache.discussionPosts.filter((p) => p.id !== temp.id);
    throw e;
  });
}
export function deleteDiscussionPost(id) {
  cache.discussionPosts = cache.discussionPosts.filter((p) => p.id !== id && p.parentId !== id);
  api.del(`/api/discussion/${id}`).catch((e) => { console.error(e); refreshDiscussion(); });
}

// ---------- Event Feedback ----------
export function feedbackFor(hackathonId) {
  return cache.eventFeedback
    .filter((f) => f.hackathonId === hackathonId)
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
export function myFeedbackFor(hackathonId) {
  const me = currentUser();
  if (!me) return null;
  return cache.eventFeedback.find(
    (f) => f.hackathonId === hackathonId && (f.participantEmail || "").toLowerCase() === me.email.toLowerCase()
  ) || null;
}
export function feedbackSummary(hackathonId) {
  const list = feedbackFor(hackathonId);
  if (!list.length) return { count: 0, average: null, positive: 0, neutral: 0, negative: 0 };
  const average = list.reduce((s, f) => s + (Number(f.rating) || 0), 0) / list.length;
  return {
    count: list.length,
    average,
    positive: list.filter((f) => f.sentiment === "positive").length,
    neutral: list.filter((f) => f.sentiment === "neutral").length,
    negative: list.filter((f) => f.sentiment === "negative").length,
  };
}
export function submitFeedback(hackathonId, rating, comment) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  const payload = { hackathonId, rating, comment, participantName: me.fullName || me.name || me.email };
  return api.post("/api/feedback", payload).then((row) => {
    const i = cache.eventFeedback.findIndex(
      (f) => f.hackathonId === hackathonId && (f.participantEmail || "").toLowerCase() === me.email.toLowerCase()
    );
    if (i >= 0) cache.eventFeedback[i] = row; else cache.eventFeedback = [row, ...cache.eventFeedback];
    return row;
  });
}
export function deleteFeedback(id) {
  cache.eventFeedback = cache.eventFeedback.filter((f) => f.id !== id);
  api.del(`/api/feedback/${id}`).catch((e) => { console.error(e); refreshFeedback(); });
}

// ---------- Team Matching (recommendation system) ----------
// Ranks other joined participants in a hackathon by how good a teammate
// match they'd be for the current user: participants who share interests
// (aligned on what they want to build) and bring complementary skills
// (skills the current user doesn't already have) score highest.
const norm2 = (s) => (s || "").toString().trim().toLowerCase();

export function teamMatchesFor(hackathonId) {
  const me = currentUser();
  if (!me) return [];
  const meUser = cache.users.find((u) => u.email.toLowerCase() === me.email.toLowerCase());
  const mySkills = (meUser?.skills || []).map(norm2).filter(Boolean);
  const myInterests = (meUser?.interests || []).map(norm2).filter(Boolean);

  const joinedEmails = [...new Set(
    cache.registrations
      .filter((r) => r.hackathonId === hackathonId)
      .map((r) => norm2(r.participantEmail))
      .filter((e) => e && e !== me.email.toLowerCase())
  )];

  const candidates = joinedEmails.map((email) => {
    const u = cache.users.find((x) => x.email.toLowerCase() === email);
    if (!u) return null;
    const theirSkills = (u.skills || []).map(norm2).filter(Boolean);
    const theirInterests = (u.interests || []).map(norm2).filter(Boolean);

    const sharedInterests = myInterests.filter((i) => theirInterests.includes(i));
    const interestUnion = new Set([...myInterests, ...theirInterests]);
    const interestScore = interestUnion.size ? sharedInterests.length / interestUnion.size : 0;

    const complementarySkills = theirSkills.filter((s) => !mySkills.includes(s));
    const skillScore = theirSkills.length ? complementarySkills.length / theirSkills.length : 0;

    const score = Math.round((interestScore * 0.5 + skillScore * 0.5) * 100);

    return { user: u, score, sharedInterests, complementarySkills };
  }).filter(Boolean);

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}
// "Deleting" archives the hackathon (reason "deleted"); nothing is destroyed, so
// registrations, submissions and scores stay in the cache and in the database.
export function deleteHackathon(id) {
  const prev = cache.hackathons.find((h) => h.id === id);
  cache.hackathons = cache.hackathons.map((h) =>
    h.id === id ? { ...h, archived: true, archivedReason: "deleted", archivedAt: new Date().toISOString() } : h
  );
  return api.del(`/api/hackathons/${id}`).then((res) => {
    if (res?.hackathon) cache.hackathons = cache.hackathons.map((h) => (h.id === id ? res.hackathon : h));
    return res;
  }).catch((e) => {
    if (prev) cache.hackathons = cache.hackathons.map((h) => (h.id === id ? prev : h));
    throw e;
  });
}

// ---------- Registrations ----------
export function getRegistrations() { return cache.registrations.slice(); }
export function isJoined(hackathonId, email) {
  const me = email || currentUser()?.email;
  if (!me) return false;
  const m = me.toLowerCase();
  return cache.registrations.some((r) => r.hackathonId === hackathonId && (r.participantEmail || "").toLowerCase() === m);
}
export function joinedCount(email) {
  const me = email || currentUser()?.email;
  if (!me) return 0;
  const m = me.toLowerCase();
  // Archived (ended / deleted) hackathons no longer count towards the limit.
  return cache.registrations.filter((r) => {
    if ((r.participantEmail || "").toLowerCase() !== m) return false;
    const h = cache.hackathons.find((x) => x.id === r.hackathonId);
    return !!h && !isArchived(h);
  }).length;
}
export function joinHackathon(hackathonId) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  if (isJoined(hackathonId, me.email)) return;
  if (joinedCount(me.email) >= MAX_HACKATHONS_PER_PARTICIPANT) {
    throw new Error(`You can join a maximum of ${MAX_HACKATHONS_PER_PARTICIPANT} hackathons.`);
  }
  cache.registrations.push({ id: "tmp-" + Math.random(), hackathonId, participantEmail: me.email.toLowerCase() });
  api.post("/api/registrations", { hackathonId, participantEmail: me.email })
    .then(() => refreshRegistrations())
    .catch((e) => { console.error(e); refreshRegistrations(); });
}
export function leaveHackathon(hackathonId) {
  const me = currentUser();
  if (!me) return;
  const m = me.email.toLowerCase();
  cache.registrations = cache.registrations.filter(
    (r) => !(r.hackathonId === hackathonId && (r.participantEmail || "").toLowerCase() === m)
  );
  api.del("/api/registrations", { hackathonId, participantEmail: me.email })
    .catch((e) => { console.error(e); refreshRegistrations(); });
}
export function myJoinedHackathons() {
  const me = currentUser();
  if (!me) return [];
  const m = me.email.toLowerCase();
  const ids = new Set(
    cache.registrations.filter((r) => (r.participantEmail || "").toLowerCase() === m).map((r) => r.hackathonId)
  );
  return cache.hackathons.filter((h) => ids.has(h.id));
}

// ---------- Submissions ----------
export function getSubmissions() { return cache.submissions.slice(); }
export function submitProject(input) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  const payload = { ...input, participantEmail: me.email, status: "Submitted" };
  const tempId = "tmp-" + Math.random().toString(36).slice(2);
  const temp = { ...payload, id: tempId, createdAt: Date.now() };
  cache.submissions.push(temp);
  api.post("/api/submissions", payload).then((row) => {
    const i = cache.submissions.findIndex((s) => s.id === tempId);
    if (i >= 0) cache.submissions[i] = row;
    const hackathon = cache.hackathons.find((h) => h.id === row.hackathonId);
    notifyNewSubmission(cache.users, row, hackathon);
  }).catch((e) => { console.error(e); refreshSubmissions(); });
  return temp;
}
export function updateSubmission(id, input) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  const payload = { ...input, participantEmail: me.email };
  const i = cache.submissions.findIndex((s) => s.id === id);
  if (i >= 0) cache.submissions[i] = { ...cache.submissions[i], ...payload };
  api.put(`/api/submissions/${id}`, payload).then((row) => {
    const idx = cache.submissions.findIndex((s) => s.id === id);
    if (idx >= 0) cache.submissions[idx] = row;
  }).catch((e) => { console.error(e); refreshSubmissions(); });
}
export function mySubmissions() {
  const me = currentUser();
  if (!me) return [];
  const m = me.email.toLowerCase();
  return cache.submissions.filter((s) => (s.participantEmail || "").toLowerCase() === m);
}
export function submissionsForHackathon(hackathonId) {
  return cache.submissions.filter((s) => s.hackathonId === hackathonId);
}
export function submissionsForOrganizer() {
  const ids = new Set(manageableHackathons().map((h) => h.id));
  return cache.submissions.filter((s) => ids.has(s.hackathonId));
}
export function deleteSubmission(id) {
  cache.submissions = cache.submissions.filter((s) => s.id !== id);
  cache.evaluations = cache.evaluations.filter((e) => e.submissionId !== id);
  api.del(`/api/submissions/${id}`).catch(() => refreshSubmissions());
}

// ---------- Judge Assignments ----------
export function getAssignments() { return cache.assignments.slice(); }
export function judgesForHackathon(hackathonId) {
  return cache.assignments
    .filter((a) => a.hackathonId === hackathonId && a.judgeEmail)
    .map((a) => a.judgeEmail);
}
export function judgeForHackathon(hackathonId) {
  return judgesForHackathon(hackathonId)[0];
}
export function addJudge(hackathonId, judgeEmail) {
  const email = (judgeEmail || "").trim().toLowerCase();
  if (!email) return;
  if (cache.assignments.some((a) => a.hackathonId === hackathonId && (a.judgeEmail || "").toLowerCase() === email)) return;
  cache.assignments.push({ id: "tmp-" + Math.random(), hackathonId, judgeEmail: email });
  api.post("/api/assignments", { hackathonId, judgeEmail: email })
    .then(() => refreshAssignments())
    .catch(() => refreshAssignments());
}
export function removeJudge(hackathonId, judgeEmail) {
  const email = (judgeEmail || "").trim().toLowerCase();
  cache.assignments = cache.assignments.filter(
    (a) => !(a.hackathonId === hackathonId && (a.judgeEmail || "").toLowerCase() === email)
  );
  api.del("/api/assignments", { hackathonId, judgeEmail: email })
    .then(() => refreshAssignments())
    .catch(() => refreshAssignments());
}
export function assignJudge(hackathonId, judgeEmail) {
  const email = (judgeEmail || "").trim().toLowerCase();
  if (!email) {
    cache.assignments = cache.assignments.filter((a) => a.hackathonId !== hackathonId);
    api.post("/api/assignments", { hackathonId, judgeEmail: "" })
      .then(() => refreshAssignments())
      .catch(() => refreshAssignments());
    return;
  }
  addJudge(hackathonId, email);
}
export function submissionsForJudge() {
  const me = currentUser();
  if (!me) return [];
  const m = me.email.trim().toLowerCase();
  const myHackIds = new Set(
    cache.assignments.filter((a) => (a.judgeEmail || "").toLowerCase() === m).map((a) => a.hackathonId)
  );
  return cache.submissions
    .filter((s) => myHackIds.has(s.hackathonId))
    .map((sub) => ({ sub, hackathon: getHackathon(sub.hackathonId) }));
}

// ---------- Mentor Assignments ----------
export function getMentorAssignments() { return cache.mentorAssignments.slice(); }
export function assignMentor(hackathonId, mentorEmail) {
  const email = (mentorEmail || "").trim().toLowerCase();
  cache.mentorAssignments = cache.mentorAssignments.filter((a) => a.hackathonId !== hackathonId);
  if (email) cache.mentorAssignments.push({ id: "tmp-" + Math.random(), hackathonId, mentorEmail: email });
  api.post("/api/mentor-assignments", { hackathonId, mentorEmail: email })
    .then(() => refreshMentorAssignments())
    .catch(() => refreshMentorAssignments());
}
export function mentorForHackathon(hackathonId) {
  return cache.mentorAssignments.find((a) => a.hackathonId === hackathonId)?.mentorEmail;
}
export function hackathonsForMentor() {
  const me = currentUser();
  if (!me) return [];
  const m = me.email.trim().toLowerCase();
  const ids = new Set(
    cache.mentorAssignments.filter((a) => (a.mentorEmail || "").toLowerCase() === m).map((a) => a.hackathonId)
  );
  return cache.hackathons.filter((h) => ids.has(h.id));
}

// ---------- Evaluations ----------
export function getEvaluations() { return cache.evaluations.slice(); }
export function evaluateSubmission(input) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  const payload = { ...input, judgeEmail: me.email };
  const temp = { ...payload, id: "tmp-" + Math.random(), createdAt: Date.now() };
  cache.evaluations.push(temp);
  cache.submissions = cache.submissions.map((s) => s.id === input.submissionId ? { ...s, status: "Evaluated" } : s);
  api.post("/api/evaluations", payload)
    .then(() => { refreshEvaluations(); refreshSubmissions(); })
    .catch(() => { refreshEvaluations(); refreshSubmissions(); });
  return temp;
}
export function evaluationFor(submissionId) {
  return cache.evaluations.find((e) => e.submissionId === submissionId);
}

// ---------- Leaderboard ----------
// Ranks a hackathon's submissions by their average judge score.
// A submission's score = mean, across all judges who scored it, of the
// sum of that judge's per-criterion scores (innovation/design/functionality,
// or whatever custom criteria a judge used, via evaluation.scores).
function totalForEvaluation(ev) {
  if (ev.scores && typeof ev.scores === "object" && Object.keys(ev.scores).length) {
    return Object.values(ev.scores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }
  // legacy fallback for evaluations saved before per-criterion `scores` existed
  return (Number(ev.innovation) || 0) + (Number(ev.design) || 0) + (Number(ev.functionality) || 0);
}

export function leaderboardFor(hackathonId) {
  const submissions = submissionsForHackathon(hackathonId);
  const rows = submissions.map((sub) => {
    const evals = cache.evaluations.filter((e) => e.submissionId === sub.id);
    const totals = evals.map(totalForEvaluation);
    const avgScore = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
    return {
      submission: sub,
      avgScore,
      judgeCount: evals.length,
    };
  });

  // Judged submissions first (highest average score wins), ties broken by
  // whoever has been reviewed by more judges; unjudged submissions sink to
  // the bottom, ordered by submission date.
  rows.sort((a, b) => {
    if (a.avgScore == null && b.avgScore == null) {
      return (a.submission.createdAt || 0) - (b.submission.createdAt || 0);
    }
    if (a.avgScore == null) return 1;
    if (b.avgScore == null) return -1;
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.judgeCount - a.judgeCount;
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

// Platform-wide leaderboard: every judged submission across every
// hackathon, ranked together by the same average-score logic used
// per-hackathon. Only submissions that have been judged appear here
// (an unjudged score isn't comparable to a judged one).
export function globalLeaderboard() {
  const rows = cache.hackathons.flatMap((h) =>
    leaderboardFor(h.id)
      .filter((r) => r.avgScore != null)
      .map((r) => ({ ...r, hackathon: h }))
  );
  rows.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.judgeCount - a.judgeCount;
  });
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

// ---------- Reports (for organizers) ----------
// Per-hackathon performance report: team/submission counts, judging
// progress, and score statistics, all derived from data already in cache.
export function performanceReport(hackathonId) {
  const hackathon = getHackathon(hackathonId);
  const teams = submissionsForHackathon(hackathonId); // one submission == one team's entry
  const registrations = cache.registrations.filter((r) => r.hackathonId === hackathonId);
  const board = leaderboardFor(hackathonId);
  const judgedScores = board.filter((r) => r.avgScore != null).map((r) => r.avgScore);

  const evaluatedCount = teams.filter((t) => t.status === "Evaluated").length;

  return {
    hackathon,
    teamsCount: teams.length,
    participantsCount: registrations.length,
    evaluatedCount,
    pendingCount: teams.length - evaluatedCount,
    judgesAssigned: (judgesForHackathon(hackathonId) || []).length,
    mentorAssigned: !!mentorForHackathon(hackathonId),
    averageScore: judgedScores.length ? judgedScores.reduce((a, b) => a + b, 0) / judgedScores.length : null,
    highestScore: judgedScores.length ? Math.max(...judgedScores) : null,
    lowestScore: judgedScores.length ? Math.min(...judgedScores) : null,
    leaderboard: board,
    feedback: feedbackSummary(hackathonId),
  };
}

// Platform-wide statistical report across every hackathon.
// opts: { category: "" | name, status: "all" | "active" | "archived" }.
// Organizers are always limited to their own categories; admins see everything.
export function platformReport({ category = "", status = "all" } = {}) {
  const hackathons = manageableHackathons().filter((h) =>
    (!category || h.category === category) &&
    (status === "all" || (status === "archived") === isArchived(h))
  );
  const perHackathon = hackathons.map((h) => performanceReport(h.id));

  const totalTeams = perHackathon.reduce((s, r) => s + r.teamsCount, 0);
  const totalEvaluated = perHackathon.reduce((s, r) => s + r.evaluatedCount, 0);
  const allAverages = perHackathon.map((r) => r.averageScore).filter((v) => v != null);
  const totalPositive = perHackathon.reduce((s, r) => s + r.feedback.positive, 0);
  const totalNeutral = perHackathon.reduce((s, r) => s + r.feedback.neutral, 0);
  const totalNegative = perHackathon.reduce((s, r) => s + r.feedback.negative, 0);
  const totalFeedback = perHackathon.reduce((s, r) => s + r.feedback.count, 0);

  return {
    hackathonCount: hackathons.length,
    userCount: cache.users.length,
    participantCount: cache.users.filter((u) => u.role === "participant").length,
    judgeCount: cache.users.filter((u) => u.role === "judge").length,
    mentorCount: cache.users.filter((u) => u.role === "mentor").length,
    organizerCount: cache.users.filter((u) => u.role === "organizer").length,
    totalTeams,
    totalEvaluated,
    totalPending: totalTeams - totalEvaluated,
    totalRegistrations: perHackathon.reduce((s, r) => s + r.participantsCount, 0),
    evaluationCompletionRate: totalTeams ? totalEvaluated / totalTeams : 0,
    platformAverageScore: allAverages.length ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length : null,
    totalFeedback,
    sentimentBreakdown: { positive: totalPositive, neutral: totalNeutral, negative: totalNegative },
    perHackathon,
  };
}

// ---------- User status (admin) ----------
export function getUserStatus(email) {
  return cache.users.find((u) => u.email === email)?.status || "Active";
}
export function setUserStatus(email, status) {
  cache.users = cache.users.map((u) => u.email === email ? { ...u, status } : u);
  api.patch(`/api/users/${encodeURIComponent(email)}/status`, { status })
    .catch(() => refreshUsers());
}
export function getUsersWithStatus() {
  return cache.users.map((u) => ({ ...u, status: u.status || "Active" }));
}
export function setOrganizerCategories(email, categories) {
  cache.users = cache.users.map((u) => u.email === email ? { ...u, categories } : u);
  return api.put(`/api/users/${encodeURIComponent(email)}/categories`, { categories }).catch((e) => { refreshUsers(); throw e; });
}
export function deleteUser(email) {
  cache.users = cache.users.filter((u) => u.email !== email);
  api.del(`/api/users/${encodeURIComponent(email)}`).catch(() => refreshUsers());
}

// ---------- Users summary (admin) ----------
// Everything the admin "Users Summary" page shows, derived from the cache.
export function usersSummary() {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const ROLES = ["participant", "organizer", "judge", "mentor", "admin"];
  const STATUSES = ["Active", "Pending", "Blocked", "Rejected"];
  const users = cache.users.map((u) => ({ ...u, status: u.status || "Active" }));
  const lc = (e) => (e || "").toLowerCase();

  const byRole = ROLES.map((role) => {
    const list = users.filter((u) => u.role === role);
    const row = { role, total: list.length };
    STATUSES.forEach((st) => { row[st] = list.filter((u) => u.status === st).length; });
    return row;
  });
  const byStatus = {};
  STATUSES.forEach((st) => { byStatus[st] = users.filter((u) => u.status === st).length; });

  const signupsSince = (days) => users.filter((u) => u.createdAt && now - u.createdAt <= days * DAY).length;
  const recent = users.filter((u) => u.createdAt).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  const participants = users.filter((u) => u.role === "participant");
  const joined = new Set(cache.registrations.map((r) => lc(r.participantEmail)));
  const submitted = new Set(cache.submissions.map((s) => lc(s.participantEmail)));
  const participantsJoined = participants.filter((u) => joined.has(lc(u.email))).length;
  const participantsSubmitted = participants.filter((u) => submitted.has(lc(u.email))).length;

  const judgeEmails = new Set(cache.assignments.map((a) => lc(a.judgeEmail)).filter(Boolean));
  const mentorEmails = new Set(cache.mentorAssignments.map((a) => lc(a.mentorEmail)).filter(Boolean));
  const activeOf = (role) => users.filter((u) => u.role === role && u.status === "Active");
  const judgesUnassigned = activeOf("judge").filter((u) => !judgeEmails.has(lc(u.email)));
  const mentorsUnassigned = activeOf("mentor").filter((u) => !mentorEmails.has(lc(u.email)));

  const organizers = users.filter((u) => u.role === "organizer");
  const covered = new Set(organizers.filter((u) => u.status === "Active").flatMap((u) => u.categories || []));
  const uncoveredCategories = getCategories().filter((c) => !covered.has(c));

  return {
    total: users.length,
    byRole,
    byStatus,
    pending: users.filter((u) => u.status === "Pending"),
    signups7: signupsSince(7),
    signups30: signupsSince(30),
    recent,
    participants: {
      total: participants.length,
      joined: participantsJoined,
      submitted: participantsSubmitted,
      inactive: participants.length - participantsJoined,
    },
    judgesUnassigned,
    mentorsUnassigned,
    organizers,
    uncoveredCategories,
  };
}

// ---------- Stats ----------
export function stats() {
  const scoped = manageableHackathons();
  const ids = new Set(scoped.map((h) => h.id));
  const hackCount = scoped.length;
  const subCount = cache.submissions.filter((s) => ids.has(s.hackathonId)).length;
  const partCount = isAdmin()
    ? cache.users.filter((u) => u.role === "participant").length
    : new Set(cache.registrations.filter((r) => ids.has(r.hackathonId)).map((r) => r.participantEmail)).size;
  const userCount = cache.users.length;
  return { hackCount, subCount, partCount, userCount };
}

// ---------- Questions / Mentor Q&A ----------
export function getQuestions(hackathonId) {
  return hackathonId ? cache.questions.filter((q) => q.hackathonId === hackathonId) : cache.questions.slice();
}
export function askQuestion(hackathonId, question) {
  const me = currentUser();
  if (!me) throw new Error("Login required.");
  if (!question.trim()) throw new Error("Question cannot be empty.");
  if (question.length > 500) throw new Error("Question is too long (max 500 chars).");
  const payload = {
    hackathonId,
    askerEmail: me.email,
    askerName: me.fullName || me.name,
    question: question.trim(),
  };
  const temp = { ...payload, id: "tmp-" + Math.random(), createdAt: Date.now() };
  cache.questions.push(temp);
  api.post("/api/questions", payload).then((row) => {
    const i = cache.questions.findIndex((q) => q.id === temp.id);
    if (i >= 0) cache.questions[i] = row;
  }).catch(() => refreshQuestions());
  return temp;
}
export function answerQuestion(questionId, answer, role = "mentor", overrideAnswerer) {
  const me = currentUser();
  const patch = {
    answer: (answer || "").trim(),
    answererEmail: overrideAnswerer?.email || me?.email || "ai@smarthack",
    answererName: overrideAnswerer?.name || me?.fullName || me?.name || "SmartHack AI",
    answererRole: role,
    answeredAt: Date.now(),
  };
  cache.questions = cache.questions.map((q) => q.id === questionId ? { ...q, ...patch } : q);
  api.patch(`/api/questions/${questionId}`, patch).catch(() => refreshQuestions());
}
export function questionsForMentor() {
  const me = currentUser();
  if (!me) return [];
  const m = me.email.trim().toLowerCase();
  const myHackIds = new Set(
    cache.mentorAssignments.filter((a) => (a.mentorEmail || "").toLowerCase() === m).map((a) => a.hackathonId)
  );
  return cache.questions.filter((q) => myHackIds.has(q.hackathonId));
}
