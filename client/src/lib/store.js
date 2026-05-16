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

// Module-level cache shared by all consumers
export const cache = {
  users: [],
  hackathons: [],
  registrations: [],
  submissions: [],
  evaluations: [],
  assignments: [],
  mentorAssignments: [],
  questions: [],
  ready: false,
};

// ---------- Bootstrap ----------
export async function bootstrap() {
  try {
    const data = await api.get("/api/bootstrap");
    cache.users = data.users || [];
    cache.hackathons = data.hackathons || [];
    cache.registrations = data.registrations || [];
    cache.submissions = data.submissions || [];
    cache.evaluations = data.evaluations || [];
    cache.assignments = data.assignments || [];
    cache.mentorAssignments = data.mentorAssignments || [];
    cache.questions = data.questions || [];
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
export function deleteHackathon(id) {
  cache.hackathons = cache.hackathons.filter((h) => h.id !== id);
  cache.registrations = cache.registrations.filter((r) => r.hackathonId !== id);
  cache.submissions = cache.submissions.filter((s) => s.hackathonId !== id);
  cache.assignments = cache.assignments.filter((a) => a.hackathonId !== id);
  cache.mentorAssignments = cache.mentorAssignments.filter((a) => a.hackathonId !== id);
  api.del(`/api/hackathons/${id}`).catch((e) => { console.error(e); });
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
  return cache.registrations.filter((r) => (r.participantEmail || "").toLowerCase() === m).length;
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
  const me = currentUser();
  if (!me) return [];
  const m = me.email.toLowerCase();
  const ownIds = new Set(
    cache.hackathons.filter((h) => (h.organizerEmail || "").toLowerCase() === m || h.organizerEmail === "system").map((h) => h.id)
  );
  return cache.submissions.filter((s) => ownIds.has(s.hackathonId));
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
export function deleteUser(email) {
  cache.users = cache.users.filter((u) => u.email !== email);
  api.del(`/api/users/${encodeURIComponent(email)}`).catch(() => refreshUsers());
}

// ---------- Stats ----------
export function stats() {
  const hackCount = cache.hackathons.length;
  const subCount = cache.submissions.length;
  const partCount = cache.users.filter((u) => u.role === "participant").length;
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
