import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSmartAnswer } from "./ai.js";
//
import Users from "./models/Users.js";
import Hackathon from "./models/Hackathon.js";
import Registration from "./models/Registration.js";
import Submission from "./models/Submission.js";
import Evaluation from "./models/Evaluation.js";
import Assignment from "./models/Assignment.js";
import MentorAssignment from "./models/MentorAssignment.js";
import Question from "./models/Question.js";
import PasswordReset from "./models/PasswordReset.js";
import Announcement from "./models/Announcement.js";
import Category from "./models/Category.js";
import ScoringConfig from "./models/ScoringConfig.js";
import DiscussionPost from "./models/DiscussionPost.js";
import EventFeedback from "./models/EventFeedback.js";
import nodemailer from "nodemailer";

import dns from "node:dns";
dns.setServers(["8.8.8.8","1.1.1.1"]);
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hackhub";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ---- Helpers ----
const norm = (s) => (s || "").toString().trim().toLowerCase();
const toClient = (doc) => {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = String(o._id);
  if (o.createdAt instanceof Date) o.createdAt = o.createdAt.getTime();
  delete o._id; delete o.__v;
  return o;
};
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message || "Server error" });
});

// ---- Categories & permissions ----
// Categories live in the database and are managed by admins. These are only the
// starting set, inserted the first time the server runs against an empty collection.
const DEFAULT_CATEGORIES = ["Mobile", "Web", "AI", "Data Science", "Cybersecurity", "Game Development"];
const cleanCategoryName = (s) => (s || "").toString().trim().replace(/\s+/g, " ");
const categoryKey = (s) => cleanCategoryName(s).toLowerCase();

async function getCategoryNames() {
  const list = await Category.find().sort({ name: 1 }).lean();
  return list.map((c) => c.name);
}
// Returns the canonical (stored) name for a category, or null if it doesn't exist.
async function resolveCategory(name) {
  const key = categoryKey(name);
  if (!key) return null;
  const c = await Category.findOne({ key }).lean();
  return c ? c.name : null;
}
// Keeps only names that exist, mapped to their canonical spelling, without duplicates.
async function cleanCategories(arr) {
  const byKey = new Map((await getCategoryNames()).map((n) => [categoryKey(n), n]));
  return [...new Set((Array.isArray(arr) ? arr : []).map((c) => byKey.get(categoryKey(c))).filter(Boolean))];
}
// First run: seed the defaults, plus any category already used by existing
// hackathons/organizers so older data keeps working after upgrading.
async function ensureCategories() {
  if (await Category.countDocuments()) return;
  const used = new Set(DEFAULT_CATEGORIES);
  (await Hackathon.distinct("category")).forEach((c) => c && used.add(cleanCategoryName(c)));
  (await Users.distinct("categories")).forEach((c) => c && used.add(cleanCategoryName(c)));
  const seen = new Set();
  for (const name of used) {
    if (!name || seen.has(categoryKey(name))) continue;
    seen.add(categoryKey(name));
    await Category.create({ name, key: categoryKey(name), createdBy: "system" });
  }
}

// Loads the *current* user record (so admin changes to an organizer's
// categories apply immediately, without waiting for the JWT to expire).
async function loadActor(req) {
  const u = await Users.findById(req.user.id).lean();
  return u || null;
}
// Admins can manage everything; organizers only hackathons in their categories.
const canManageCategory = (actor, category) =>
  !!actor && (actor.role === "admin" || (actor.role === "organizer" && (actor.categories || []).includes(category)));
async function canManageHackathon(actor, hackathonId) {
  if (!actor) return false;
  if (actor.role === "admin") return true;
  const h = await Hackathon.findById(hackathonId).lean();
  return !!h && canManageCategory(actor, h.category);
}

// ---- Archiving ----
// A hackathon is archived automatically once its end date has passed
// (and can also be archived manually before then).
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, server-local
async function archiveEndedHackathons() {
  await Hackathon.updateMany(
    { archived: { $ne: true }, endDate: { $nin: ["", null], $lt: todayStr() } },
    { $set: { archived: true, archivedAt: new Date(), archivedReason: "ended" } }
  );
}

// ---- Auth middleware ----
// Verifies the JWT sent in the Authorization: Bearer <token> header and
// attaches the decoded payload ({ id, role }) to req.user.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// Restricts a route to specific roles. Must run after requireAuth.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "You don't have permission to do that." });
  }
  next();
};

// ---- Shared AI helper ----
// Tries Anthropic, then Gemini, then OpenAI (whichever key is configured),
// returning the model's text reply, or null if none are configured/working
// so callers can fall back to a local answer.
async function callAiText(systemPrompt, userMessage) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  try {
    if (ANTHROPIC_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userMessage }] }),
      });
      const data = await r.json();
      if (r.ok) return data?.content?.map((b) => b.text || "").join("").trim();
      console.error("Anthropic API error:", r.status, JSON.stringify(data));
    }
    if (GEMINI_KEY) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userMessage }] }] }),
      });
      const data = await r.json();
      if (r.ok) return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
      console.error("Gemini API error:", r.status, JSON.stringify(data));
    }
    if (OPENAI_KEY) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
      });
      const data = await r.json();
      if (r.ok) return data?.choices?.[0]?.message?.content?.trim();
      console.error("OpenAI API error:", r.status, JSON.stringify(data));
    }
  } catch (e) {
    console.error("External AI request threw an exception:", e.message);
  }
  return null;
}

// ---- Sentiment analysis (M2F3) ----
// Cheap keyword fallback used only if no AI provider is configured/working,
// so the feature still works out of the box.
const POSITIVE_WORDS = ["great", "good", "amazing", "excellent", "love", "loved", "awesome", "fantastic", "helpful", "smooth", "enjoyed", "fun", "perfect", "best", "well organized", "nice", "wonderful"];
const NEGATIVE_WORDS = ["bad", "terrible", "poor", "confusing", "disorganized", "awful", "hate", "hated", "worst", "broken", "slow", "frustrating", "disappointing", "boring", "unclear", "messy"];
function naiveSentiment(text) {
  const t = text.toLowerCase();
  let score = 0;
  POSITIVE_WORDS.forEach((w) => { if (t.includes(w)) score++; });
  NEGATIVE_WORDS.forEach((w) => { if (t.includes(w)) score--; });
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}
async function classifySentiment(text) {
  if (!text || !text.trim()) return null;
  const sysPrompt = "Classify the sentiment of the user's feedback comment as exactly one word: positive, neutral, or negative. Respond with only that single word, lowercase, nothing else.";
  const raw = await callAiText(sysPrompt, text);
  const word = (raw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (["positive", "neutral", "negative"].includes(word)) return word;
  return naiveSentiment(text);
}

// ---- Seed default hackathons once ----
const SEED = [
  { _id: new mongoose.Types.ObjectId("000000000000000000000001"), title: "AI Innovative Hackathon", theme: "Artificial Intelligence", startDate: "2026-03-09", endDate: "2026-03-11", location: "Sultan Qaboos University", duration: "48 Hours", description: "The AI Innovative Hackathon brings together students and innovators to create AI-powered solutions for real-world challenges.", teamSize: "2–5 members", rewards: "Certificates and prizes for the top teams.", category: "AI", organizerEmail: "system" },
  { _id: new mongoose.Types.ObjectId("000000000000000000000002"), title: "Smart City Hackathon", theme: "Smart Cities", startDate: "2026-04-12", endDate: "2026-04-13", location: "Muscat Innovation Hub", duration: "36 Hours", description: "Build smart, sustainable solutions for urban challenges.", teamSize: "3–5 members", rewards: "Cash prizes and mentorship.", category: "Web", organizerEmail: "system" },
  { _id: new mongoose.Types.ObjectId("000000000000000000000003"), title: "HealthTech Hackathon", theme: "Healthcare Innovation", startDate: "2026-05-20", endDate: "2026-05-22", location: "Oman Medical College", duration: "48 Hours", description: "Innovate at the intersection of healthcare and technology.", teamSize: "2–4 members", rewards: "Internship offers and prize money.", category: "AI", organizerEmail: "system" },
];
async function ensureSeed() {
  for (const s of SEED) {
    const exists = await Hackathon.findById(s._id).lean();
    if (!exists) await Hackathon.create(s);
  }
}

// ---- Connect ----
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    // Drop legacy unique index on hackathonId so multiple judges can be assigned
    try { await Assignment.collection.dropIndex("hackathonId_1"); } catch (e) { }
    try { await Assignment.syncIndexes(); } catch (e) { }
    await ensureSeed();
    await ensureCategories();
    await archiveEndedHackathons();
    setInterval(() => archiveEndedHackathons().catch(() => {}), 60 * 60 * 1000);
  })
  .catch(err => console.error("Mongo error:", err.message));

app.get("/", (req, res) => res.json({ ok: true, name: "HackHub API" }));

// ---- Email helper ----
async function sendEmail({ to, subject, text, html }) {
  let transporter;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log("Using SMTP user:", process.env.EMAIL_USER);
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
      tls: { rejectUnauthorized: false },
    });
  }
  const info = await transporter.sendMail({
    from: `"HackHub" <${process.env.EMAIL_USER || 'noreply@hackhub.com'}>`,
    to, subject, text, html,
  });
  console.log(`Email sent to ${to} — subject: ${subject}`);
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log("Ethereal URL:", preview);
  return info;
}

// ---- Auth ----
app.post("/api/register", wrap(async (req, res) => {
  const { name, fullName, email, password, role, organization, bio, experience, reason, cvName, cvData, categories } = req.body;
  const displayName = name || fullName;
  if (!displayName || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = await Users.findOne({ email: norm(email) });
  if (exists) return res.status(400).json({ error: "An account with this email already exists." });
  const hash = await bcrypt.hash(password, 10);
  const userRole = role || "participant";
  const isPro = ["judge", "mentor", "organizer", "admin"].includes(userRole);
  const status = isPro ? "Pending" : "Active";
  if (isPro) {
    if (!bio || !experience || !reason) return res.status(400).json({ error: "Bio, experience and reason are required for this role." });
    if (!cvData || !cvName) return res.status(400).json({ error: "CV file is required for this role." });
  }
  const orgCategories = userRole === "organizer" ? await cleanCategories(categories) : [];
  if (userRole === "organizer" && !orgCategories.length) {
    return res.status(400).json({ error: "Please select at least one category you will organize." });
  }
  const defaultUsername = norm(email).split("@")[0];
  const user = await Users.create({
    name: displayName, username: defaultUsername, email: norm(email), password: hash,
    role: userRole, organization: organization || "", status,
    bio: bio || "", experience: experience || "", reason: reason || "",
    cvName: cvName || "", cvData: cvData || "", categories: orgCategories,
  });

  // Send registration confirmation email (fire-and-forget)
  try {
    if (isPro) {
      const reviewerLabel = userRole === "admin" ? "a super-admin" : "an admin";
      await sendEmail({
        to: user.email,
        subject: "HackHub — Registration received, pending review",
        text: `Hi ${displayName},\n\nThanks for registering on HackHub as a ${userRole}. Your application has been received and is now pending review by ${reviewerLabel}. You'll receive another email once a decision has been made.\n\n— The HackHub Team`,
        html: `<p>Hi ${displayName},</p><p>Thanks for registering on <b>HackHub</b> as a <b>${userRole}</b>. Your application has been received and is now <b>pending review</b> by ${reviewerLabel}.</p><p>You'll receive another email once a decision has been made.</p><p>— The HackHub Team</p>`,
      });
    } else {
      await sendEmail({
        to: user.email,
        subject: "Welcome to HackHub 🎉",
        text: `Hi ${displayName},\n\nWelcome to HackHub! Your account has been created successfully. You can now log in and start joining hackathons.\n\n— The HackHub Team`,
        html: `<p>Hi ${displayName},</p><p>Welcome to <b>HackHub</b>! Your account has been created successfully. You can now log in and start joining hackathons.</p><p>— The HackHub Team</p>`,
      });
    }
  } catch (e) { console.error("Registration email failed:", e.message); }

  res.json({ id: String(user._id), fullName: user.name, name: user.name, username: user.username, email: user.email, role: user.role, organization: user.organization, status: user.status, categories: user.categories });
}));

// Approve / reject a pending professional account
app.post("/api/users/:email/decision", wrap(async (req, res) => {
  const { decision, reason } = req.body; // "approved" | "rejected"
  const user = await Users.findOne({ email: norm(req.params.email) });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (decision === "approved") { user.status = "Active"; user.rejectionReason = ""; }
  else if (decision === "rejected") { user.status = "Rejected"; user.rejectionReason = reason || ""; }
  else return res.status(400).json({ error: "Invalid decision" });
  await user.save();

  // Notify the user by email
  try {
    if (decision === "approved") {
      await sendEmail({
        to: user.email,
        subject: "HackHub — Your account has been approved ✅",
        text: `Hi ${user.name},\n\nGood news! Your ${user.role} account on HackHub has been approved by the admin. You can now log in and start using the platform.\n\n— The HackHub Team`,
        html: `<p>Hi ${user.name},</p><p>Good news! Your <b>${user.role}</b> account on <b>HackHub</b> has been <b style="color:#16a34a">approved</b> by the admin. You can now log in and start using the platform.</p><p>— The HackHub Team</p>`,
      });
    } else {
      const reasonLine = reason ? `\n\nReason: ${reason}` : "";
      const reasonHtml = reason ? `<p><b>Reason:</b> ${reason}</p>` : "";
      await sendEmail({
        to: user.email,
        subject: "HackHub — Your application was not approved",
        text: `Hi ${user.name},\n\nWe're sorry to inform you that your ${user.role} application on HackHub has been rejected by the admin.${reasonLine}\n\nYou may contact support if you have any questions.\n\n— The HackHub Team`,
        html: `<p>Hi ${user.name},</p><p>We're sorry to inform you that your <b>${user.role}</b> application on <b>HackHub</b> has been <b style="color:#dc2626">rejected</b> by the admin.</p>${reasonHtml}<p>You may contact support if you have any questions.</p><p>— The HackHub Team</p>`,
      });
    }
  } catch (e) { console.error("Decision email failed:", e.message); }

  res.json({ ok: true });
}));

// Download a user's CV (returns base64 data URL)
app.get("/api/users/:email/cv", wrap(async (req, res) => {
  const user = await Users.findOne({ email: norm(req.params.email) }).lean();
  if (!user || !user.cvData) return res.status(404).json({ error: "No CV uploaded" });
  res.json({ cvName: user.cvName || "cv", cvData: user.cvData });
}));

app.post("/api/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await Users.findOne({ email: norm(email) });
  if (!user) return res.status(400).json({ error: "Invalid email or password." });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Invalid email or password." });
  if (user.status === "Blocked") return res.status(403).json({ error: "This account has been blocked." });
  if (user.status === "Pending") return res.status(403).json({ error: "Your account is pending admin approval." });
  if (user.status === "Rejected") return res.status(403).json({ error: "Your account has been rejected by the admin." });
  const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: mapUser(user) });
}));

// Change password
app.post("/api/change-password", wrap(async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const user = await Users.findOne({ email: norm(email) });
  if (!user) return res.status(400).json({ error: "User not found" });
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
}));

// Forgot password flow
app.post("/api/forgot-password", wrap(async (req, res) => {
  const { email, username } = req.body;
  const user = await Users.findOne({ email: norm(email) });
  if (!user) return res.status(400).json({ error: "No account found with that email." });



  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await PasswordReset.deleteMany({ email: norm(email) });
  await PasswordReset.create({ email: norm(email), code, expiresAt: Date.now() + 15 * 60 * 1000 });

  await sendEmail({
    to: user.email,
    subject: "HackHub — Password Reset Code",
    text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.`,
    html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 15 minutes.</p>`,
  });

  res.json({ ok: true });
}));

const MAX_VERIFY_ATTEMPTS = 5;
app.post("/api/verify-code", wrap(async (req, res) => {
  const { email, code } = req.body;
  const entry = await PasswordReset.findOne({ email: norm(email) });
  if (!entry) return res.status(400).json({ error: "No active code. Please request a new one." });
  if (Date.now() > entry.expiresAt) {
    await PasswordReset.deleteOne({ _id: entry._id });
    return res.status(400).json({ error: "Code expired. Please request a new one." });
  }
  if ((entry.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    await PasswordReset.deleteOne({ _id: entry._id });
    return res.status(429).json({ error: "Too many failed attempts. Please request a new code." });
  }
  if (entry.code !== String(code)) {
    entry.attempts = (entry.attempts || 0) + 1;
    await entry.save();
    const left = MAX_VERIFY_ATTEMPTS - entry.attempts;
    return res.status(400).json({ error: `Invalid code. ${left} attempt${left === 1 ? "" : "s"} left.` });
  }
  res.json({ ok: true });
}));

app.post("/api/reset-password", wrap(async (req, res) => {
  const { email, newPassword, code } = req.body;

  if (code) {
    const entry = await PasswordReset.findOne({ email: norm(email), code });
    if (!entry || Date.now() > entry.expiresAt) return res.status(400).json({ error: "Invalid or expired code" });
    await PasswordReset.deleteOne({ _id: entry._id });
  }

  const user = await Users.findOne({ email: norm(email) });
  if (!user) return res.status(400).json({ error: "User not found" });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
}));

// ---- Bootstrap (single fetch on app load) ----
const mapUser = (u) => ({
  id: String(u._id), fullName: u.name, name: u.name, username: u.username || norm(u.email).split("@")[0],
  email: u.email, role: u.role, organization: u.organization, status: u.status || "Active",
  bio: u.bio || "", experience: u.experience || "", reason: u.reason || "", cvName: u.cvName || "",
  hasCv: !!u.cvData, rejectionReason: u.rejectionReason || "",
  skills: u.skills || [], interests: u.interests || [], categories: u.categories || [],
  createdAt: u.createdAt ? new Date(u.createdAt).getTime() : null,
});

app.get("/api/bootstrap", wrap(async (req, res) => {
  await archiveEndedHackathons();
  const [users, hackathons, registrations, submissions, evaluations, assignments, mentorAssignments, questions, announcements, scoringConfig, categories] = await Promise.all([
    Users.find().lean(),
    Hackathon.find().lean(),
    Registration.find().lean(),
    Submission.find().lean(),
    Evaluation.find().lean(),
    Assignment.find().lean(),
    MentorAssignment.find().lean(),
    Question.find().lean(),
    Announcement.find().lean(),
    getOrCreateScoringConfig(),
    Category.find().sort({ name: 1 }).lean(),
  ]);
  const cleanUsers = users.map(mapUser);
  const map = (arr) => arr.map(d => {
    const o = { ...d, id: String(d._id) };
    if (o.createdAt instanceof Date) o.createdAt = o.createdAt.getTime();
    delete o._id; delete o.__v;
    return o;
  });
  res.json({
    users: cleanUsers,
    hackathons: map(hackathons),
    registrations: map(registrations),
    submissions: map(submissions),
    evaluations: map(evaluations),
    assignments: map(assignments),
    mentorAssignments: map(mentorAssignments),
    questions: map(questions),
    announcements: map(announcements),
    scoringConfig: toClient(scoringConfig),
    categories: map(categories),
  });
}));

// ---- Users (admin) ----
app.get("/api/users", wrap(async (req, res) => {
  const list = await Users.find().lean();
  res.json(list.map(mapUser));
}));
app.patch("/api/users/:email/status", wrap(async (req, res) => {
  const { status } = req.body;
  await Users.updateOne({ email: norm(req.params.email) }, { status });
  res.json({ ok: true });
}));
app.patch("/api/users/:email/profile", wrap(async (req, res) => {
  const { name, email, username, skills, interests } = req.body;
  const target = await Users.findOne({ email: norm(req.params.email) });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (name) target.name = name;
  if (username !== undefined) target.username = username.trim();
  if (skills !== undefined) target.skills = Array.isArray(skills) ? skills : [];
  if (interests !== undefined) target.interests = Array.isArray(interests) ? interests : [];
  if (email && norm(email) !== target.email) {
    const exists = await Users.findOne({ email: norm(email) });
    if (exists) return res.status(400).json({ error: "Email already in use" });
    target.email = norm(email);
  }
  await target.save();
  res.json(mapUser(target));
}));
// Admin: change the categories an organizer is assigned to
app.put("/api/users/:email/categories", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  const target = await Users.findOne({ email: norm(req.params.email) });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role !== "organizer") return res.status(400).json({ error: "Only organizers have categories." });
  target.categories = await cleanCategories(req.body.categories);
  await target.save();
  res.json(mapUser(target));
}));
app.delete("/api/users/:email", wrap(async (req, res) => {
  await Users.deleteOne({ email: norm(req.params.email) });
  res.json({ ok: true });
}));

// ---- Hackathons ----
app.get("/api/hackathons", wrap(async (req, res) => {
  await archiveEndedHackathons();
  const list = await Hackathon.find().lean();
  res.json(list.map(toClient));
}));
app.post("/api/hackathons", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const actor = await loadActor(req);
  const category = await resolveCategory(req.body.category);
  if (!category) return res.status(400).json({ error: "A valid category is required." });
  if (!canManageCategory(actor, category)) {
    return res.status(403).json({ error: "You are not assigned to this category." });
  }
  const { archived, archivedAt, archivedReason, archivedBy, ...rest } = req.body;
  const h = await Hackathon.create({ ...rest, category, organizerEmail: actor.email });
  res.json(toClient(h));
}));
app.put("/api/hackathons/:id", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const actor = await loadActor(req);
  if (!(await canManageHackathon(actor, req.params.id))) {
    return res.status(403).json({ error: "You can only manage hackathons in your assigned categories." });
  }
  const patch = { ...req.body };
  delete patch.organizerEmail;
  delete patch.archivedReason;
  delete patch.archivedBy;
  if (patch.category !== undefined) {
    const resolved = await resolveCategory(patch.category);
    if (!resolved || !canManageCategory(actor, resolved)) {
      return res.status(403).json({ error: "You can't move a hackathon into a category you don't manage." });
    }
    patch.category = resolved;
  }
  // Archive handling: manual archive/unarchive, or moving the end date into the future re-opens it.
  const reopen = () => { patch.archived = false; patch.archivedAt = null; patch.archivedReason = ""; patch.archivedBy = ""; };
  if (patch.archived === true) { patch.archivedAt = new Date(); patch.archivedReason = "manual"; patch.archivedBy = actor.email; }
  else if (patch.archived === false) reopen();
  else if (patch.endDate && patch.endDate >= todayStr()) reopen();
  if (patch.archived === false) {
    const cur = await Hackathon.findById(req.params.id).lean();
    const end = patch.endDate !== undefined ? patch.endDate : cur?.endDate;
    if (end && end < todayStr()) {
      return res.status(400).json({ error: "This hackathon has already ended. Extend its end date to re-open it." });
    }
  }
  const h = await Hackathon.findByIdAndUpdate(req.params.id, patch, { new: true });
  res.json(toClient(h));
}));
// "Deleting" a hackathon never destroys it: it is moved to the archive (reason
// "deleted") with all its registrations, submissions, scores and discussion
// intact, and can be restored from Manage Hackathons.
app.delete("/api/hackathons/:id", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const actor = await loadActor(req);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Hackathon not found." });
  if (!(await canManageHackathon(actor, req.params.id))) {
    return res.status(403).json({ error: "You can only manage hackathons in your assigned categories." });
  }
  const h = await Hackathon.findByIdAndUpdate(
    req.params.id,
    { $set: { archived: true, archivedAt: new Date(), archivedReason: "deleted", archivedBy: actor.email } },
    { new: true }
  );
  if (!h) return res.status(404).json({ error: "Hackathon not found." });
  res.json({ ok: true, archived: true, hackathon: toClient(h) });
}));

// ---- Categories ----
// Anyone can read the list (the sign-up form needs it before login); only admins change it.
app.get("/api/categories", wrap(async (req, res) => {
  const list = await Category.find().sort({ name: 1 }).lean();
  res.json(list.map(toClient));
}));
app.post("/api/categories", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  const name = cleanCategoryName(req.body.name);
  if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "Category name must be 2–40 characters." });
  if (await Category.findOne({ key: categoryKey(name) })) return res.status(400).json({ error: `"${name}" already exists.` });
  const actor = await loadActor(req);
  const c = await Category.create({ name, key: categoryKey(name), createdBy: actor?.email || "admin" });
  res.json(toClient(c));
}));
// Renaming cascades to hackathons, announcements and organizers' assigned categories.
app.put("/api/categories/:id", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Category not found." });
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: "Category not found." });
  const name = cleanCategoryName(req.body.name);
  if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "Category name must be 2–40 characters." });
  const key = categoryKey(name);
  const clash = await Category.findOne({ key, _id: { $ne: cat._id } });
  if (clash) return res.status(400).json({ error: `"${clash.name}" already exists.` });
  const oldName = cat.name;
  cat.name = name; cat.key = key;
  await cat.save();
  if (oldName !== name) {
    await Hackathon.updateMany({ category: oldName }, { $set: { category: name } });
    await Announcement.updateMany({ category: oldName }, { $set: { category: name } });
    const organizers = await Users.find({ categories: oldName });
    for (const u of organizers) {
      u.categories = [...new Set(u.categories.map((c) => (c === oldName ? name : c)))];
      await u.save();
    }
  }
  res.json(toClient(cat));
}));
// A category that hackathons still use (active or archived) can't be deleted.
app.delete("/api/categories/:id", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.json({ ok: true });
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.json({ ok: true });
  const inUse = await Hackathon.countDocuments({ category: cat.name });
  if (inUse) {
    return res.status(400).json({
      error: `${inUse} hackathon${inUse === 1 ? "" : "s"} (including archived) still use "${cat.name}". Rename the category instead, or move those hackathons first.`,
    });
  }
  const organizers = await Users.find({ categories: cat.name });
  for (const u of organizers) {
    u.categories = u.categories.filter((c) => c !== cat.name);
    await u.save();
  }
  await cat.deleteOne();
  res.json({ ok: true });
}));

// ---- Announcements ----
// Anyone can read announcements (participants need to see them); only
// organizers/admins can publish or remove one.
app.get("/api/announcements", wrap(async (req, res) => {
  const filter = req.query.hackathonId ? { hackathonId: req.query.hackathonId } : {};
  const list = await Announcement.find(filter).sort({ createdAt: -1 }).lean();
  res.json(list.map(toClient));
}));
// Validates the optional "advertisement" link on an announcement: either another
// hackathon on HackHub, or an external http(s) URL — never both, never javascript: etc.
async function cleanAdLink(body) {
  const linkedId = (body.linkedHackathonId || "").toString().trim();
  let url = (body.linkUrl || "").toString().trim();
  const empty = { linkedHackathonId: "", linkUrl: "", linkLabel: "" };
  if (!linkedId && !url) return { link: empty };
  if (linkedId && url) return { error: "Choose either a HackHub hackathon or an external link, not both." };
  const linkLabel = (body.linkLabel || "").toString().trim().slice(0, 40);
  if (linkedId) {
    const target = mongoose.isValidObjectId(linkedId) ? await Hackathon.findById(linkedId).lean() : null;
    if (!target) return { error: "The hackathon you're linking to was not found." };
    if (target.archived) return { error: "You can't promote an archived hackathon." };
    return { link: { linkedHackathonId: String(target._id), linkUrl: "", linkLabel } };
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
  let parsed;
  try { parsed = new URL(url); } catch { return { error: "Enter a valid link, e.g. https://example.com" }; }
  if (!["http:", "https:"].includes(parsed.protocol)) return { error: "Links must start with http:// or https://" };
  return { link: { linkedHackathonId: "", linkUrl: parsed.toString(), linkLabel } };
}

app.post("/api/announcements", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const { hackathonId, category, title, message } = req.body;
  if ((!hackathonId && !category) || !title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "A hackathon (or category), a title, and a message are required." });
  }
  if (title.trim().length > 120) return res.status(400).json({ error: "Title is too long (max 120 characters)." });
  if (message.trim().length > 1000) return res.status(400).json({ error: "Message is too long (max 1000 characters)." });
  const { link, error: linkError } = await cleanAdLink(req.body);
  if (linkError) return res.status(400).json({ error: linkError });
  const actor = await loadActor(req);
  const base = { title: title.trim(), message: message.trim(), organizerEmail: actor.email, ...link };

  // Announce to every active hackathon in a category at once.
  if (!hackathonId && category) {
    const cat = await resolveCategory(category);
    if (!cat) return res.status(400).json({ error: "Unknown category." });
    if (!canManageCategory(actor, cat)) {
      return res.status(403).json({ error: "You are not assigned to this category." });
    }
    await archiveEndedHackathons();
    // Don't show an ad for a hackathon on that hackathon's own page.
    const targets = (await Hackathon.find({ category: cat, archived: { $ne: true } }).lean())
      .filter((h) => String(h._id) !== link.linkedHackathonId);
    if (!targets.length) return res.status(400).json({ error: `No active hackathons in "${cat}" to show this on.` });
    const created = await Announcement.insertMany(targets.map((h) => ({ ...base, hackathonId: String(h._id), category: cat })));
    return res.json({ created: created.map(toClient) });
  }

  // Announce to a single hackathon.
  const h = mongoose.isValidObjectId(hackathonId) ? await Hackathon.findById(hackathonId).lean() : null;
  if (!h) return res.status(404).json({ error: "Hackathon not found." });
  if (!canManageCategory(actor, h.category)) {
    return res.status(403).json({ error: "You can only announce for hackathons in your assigned categories." });
  }
  if (h.archived) return res.status(400).json({ error: "This hackathon is archived." });
  if (link.linkedHackathonId && link.linkedHackathonId === String(h._id)) {
    return res.status(400).json({ error: "A hackathon can't advertise itself — pick a different hackathon to link to." });
  }
  const a = await Announcement.create({ ...base, hackathonId: String(h._id), category: h.category });
  res.json(toClient(a));
}));
app.delete("/api/announcements/:id", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.json({ ok: true });
  const actor = await loadActor(req);
  if (!(await canManageHackathon(actor, a.hackathonId))) {
    return res.status(403).json({ error: "You can only manage announcements in your assigned categories." });
  }
  await a.deleteOne();
  res.json({ ok: true });
}));

// ---- Scoring Config (shared rubric, single document) ----
const DEFAULT_CRITERIA = [
  { id: "innovation", name: "Innovation", weight: 5, description: "Originality and creativity of the idea." },
  { id: "design", name: "Design", weight: 5, description: "UI / UX quality and visual appeal." },
  { id: "functionality", name: "Functionality", weight: 5, description: "How well the project works." },
];
async function getOrCreateScoringConfig() {
  let doc = await ScoringConfig.findOne();
  if (!doc) doc = await ScoringConfig.create({ criteria: DEFAULT_CRITERIA, updatedBy: "system" });
  return doc;
}
// Anyone (including judges scoring submissions) can read the rubric;
// only organizers/admins can change it, so every judge uses the same one.
app.get("/api/scoring-config", wrap(async (req, res) => {
  const doc = await getOrCreateScoringConfig();
  res.json(toClient(doc));
}));
app.put("/api/scoring-config", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const { criteria } = req.body;
  if (!Array.isArray(criteria) || !criteria.length) {
    return res.status(400).json({ error: "At least one criterion is required." });
  }
  const cleaned = criteria
    .map((c) => ({
      id: (c.id || c.name || "").toString().trim() || `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      name: (c.name || "").toString().trim(),
      weight: Math.max(1, Math.min(10, Number(c.weight) || 1)),
      description: (c.description || "").toString().trim(),
    }))
    .filter((c) => c.name);
  if (!cleaned.length) return res.status(400).json({ error: "At least one named criterion is required." });
  let doc = await ScoringConfig.findOne();
  if (!doc) doc = new ScoringConfig();
  doc.criteria = cleaned;
  doc.updatedBy = req.user.email || "system";
  await doc.save();
  res.json(toClient(doc));
}));

// ---- Discussion Board ----
// Open, multi-party threads per hackathon (unlike Mentor Q&A, anyone who
// posts can reply to anyone else — participants, mentors, organizers).
app.get("/api/discussion", wrap(async (req, res) => {
  const filter = req.query.hackathonId ? { hackathonId: req.query.hackathonId } : {};
  const list = await DiscussionPost.find(filter).sort({ createdAt: 1 }).lean();
  res.json(list.map(toClient));
}));
app.post("/api/discussion", requireAuth, wrap(async (req, res) => {
  const { hackathonId, parentId, message, authorName } = req.body;
  if (!hackathonId || !message?.trim()) {
    return res.status(400).json({ error: "hackathonId and message are required." });
  }
  const post = await DiscussionPost.create({
    hackathonId,
    parentId: parentId || null,
    message: message.trim(),
    authorEmail: req.user.email,
    authorName: authorName || req.user.email,
    authorRole: req.user.role,
  });
  res.json(toClient(post));
}));
app.delete("/api/discussion/:id", requireAuth, wrap(async (req, res) => {
  const post = await DiscussionPost.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  const isOwner = post.authorEmail === req.user.email;
  const isModerator = ["organizer", "admin"].includes(req.user.role);
  if (!isOwner && !isModerator) return res.status(403).json({ error: "You can only delete your own posts." });
  await DiscussionPost.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---- Event Feedback ----
// One rating + comment per participant per hackathon; resubmitting updates
// their existing entry rather than creating a duplicate.
app.get("/api/feedback", wrap(async (req, res) => {
  const filter = req.query.hackathonId ? { hackathonId: req.query.hackathonId } : {};
  const list = await EventFeedback.find(filter).sort({ createdAt: -1 }).lean();
  res.json(list.map(toClient));
}));
app.post("/api/feedback", requireAuth, requireRole("participant"), wrap(async (req, res) => {
  const { hackathonId, rating, comment, participantName } = req.body;
  const r = Number(rating);
  if (!hackathonId || !r || r < 1 || r > 5) {
    return res.status(400).json({ error: "hackathonId and a rating from 1–5 are required." });
  }
  const trimmedComment = (comment || "").trim();
  const sentiment = await classifySentiment(trimmedComment);
  const doc = await EventFeedback.findOneAndUpdate(
    { hackathonId, participantEmail: req.user.email },
    { rating: r, comment: trimmedComment, participantName: participantName || req.user.email, sentiment },
    { new: true, upsert: true }
  );
  res.json(toClient(doc));
}));
app.delete("/api/feedback/:id", requireAuth, wrap(async (req, res) => {
  const fb = await EventFeedback.findById(req.params.id);
  if (!fb) return res.status(404).json({ error: "Feedback not found." });
  const isOwner = fb.participantEmail === req.user.email;
  const isModerator = ["organizer", "admin"].includes(req.user.role);
  if (!isOwner && !isModerator) return res.status(403).json({ error: "You can only delete your own feedback." });
  await EventFeedback.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---- Registrations ----
app.get("/api/registrations", wrap(async (req, res) => {
  res.json((await Registration.find().lean()).map(toClient));
}));
app.post("/api/registrations", wrap(async (req, res) => {
  const { hackathonId, participantEmail } = req.body;
  const exists = await Registration.findOne({ hackathonId, participantEmail: norm(participantEmail) });
  if (exists) return res.json(toClient(exists));
  const target = await Hackathon.findById(hackathonId).lean();
  if (target?.archived) return res.status(400).json({ error: "This hackathon is archived and closed to new participants." });
  // Only hackathons that are still running count towards the limit; archived /
  // deleted ones must not keep a participant locked out of new events.
  await archiveEndedHackathons();
  const myRegs = await Registration.find({ participantEmail: norm(participantEmail) }).lean();
  const myIds = myRegs.map((r) => r.hackathonId).filter((id) => mongoose.isValidObjectId(id));
  const count = myIds.length ? await Hackathon.countDocuments({ _id: { $in: myIds }, archived: { $ne: true } }) : 0;
  if (count >= 2) return res.status(400).json({ error: "You can join a maximum of 2 hackathons." });
  const r = await Registration.create({ hackathonId, participantEmail: norm(participantEmail) });
  res.json(toClient(r));
}));
app.delete("/api/registrations", wrap(async (req, res) => {
  const { hackathonId, participantEmail } = req.body;
  await Registration.deleteOne({ hackathonId, participantEmail: norm(participantEmail) });
  res.json({ ok: true });
}));

// ---- Submissions ----
app.get("/api/submissions", wrap(async (req, res) => {
  res.json((await Submission.find().lean()).map(toClient));
}));
app.post("/api/submissions", wrap(async (req, res) => {
  const target = await Hackathon.findById(req.body.hackathonId).lean();
  if (target?.archived) return res.status(400).json({ error: "This hackathon is archived; submissions are closed." });
  const body = { ...req.body, participantEmail: norm(req.body.participantEmail) };
  const s = await Submission.create(body);
  res.json(toClient(s));
}));
app.put("/api/submissions/:id", wrap(async (req, res) => {
  const body = { ...req.body };
  if (body.participantEmail) body.participantEmail = norm(body.participantEmail);
  const s = await Submission.findByIdAndUpdate(req.params.id, body, { new: true });
  res.json(toClient(s));
}));
app.delete("/api/submissions/:id", wrap(async (req, res) => {
  await Submission.findByIdAndDelete(req.params.id);
  await Evaluation.deleteMany({ submissionId: req.params.id });
  res.json({ ok: true });
}));

// ---- Evaluations ----
app.get("/api/evaluations", wrap(async (req, res) => {
  res.json((await Evaluation.find().lean()).map(toClient));
}));
app.post("/api/evaluations", wrap(async (req, res) => {
  const body = { ...req.body, judgeEmail: norm(req.body.judgeEmail) };
  const e = await Evaluation.create(body);
  await Submission.findByIdAndUpdate(body.submissionId, { status: "Evaluated" });
  res.json(toClient(e));
}));

// ---- Judge Assignments ----
app.get("/api/assignments", wrap(async (req, res) => {
  res.json((await Assignment.find().lean()).map(toClient));
}));
app.post("/api/assignments", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const { hackathonId, judgeEmail } = req.body;
  if (!(await canManageHackathon(await loadActor(req), hackathonId))) return res.status(403).json({ error: "Not allowed for this category." });
  const email = norm(judgeEmail);
  if (!email) {
    await Assignment.deleteMany({ hackathonId });
    return res.json({ ok: true });
  }
  const a = await Assignment.findOneAndUpdate(
    { hackathonId, judgeEmail: email },
    { hackathonId, judgeEmail: email },
    { upsert: true, new: true }
  );
  res.json(toClient(a));
}));
app.delete("/api/assignments", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const { hackathonId, judgeEmail } = req.body;
  if (!(await canManageHackathon(await loadActor(req), hackathonId))) return res.status(403).json({ error: "Not allowed for this category." });
  const email = norm(judgeEmail);
  if (!hackathonId || !email) return res.status(400).json({ error: "Missing fields" });
  await Assignment.deleteOne({ hackathonId, judgeEmail: email });
  res.json({ ok: true });
}));

// Mentor Assignments 
app.get("/api/mentor-assignments", wrap(async (req, res) => {
  res.json((await MentorAssignment.find().lean()).map(toClient));
}));
app.post("/api/mentor-assignments", requireAuth, requireRole("organizer", "admin"), wrap(async (req, res) => {
  const { hackathonId, mentorEmail } = req.body;
  if (!(await canManageHackathon(await loadActor(req), hackathonId))) return res.status(403).json({ error: "Not allowed for this category." });
  const email = norm(mentorEmail);
  if (!email) {
    await MentorAssignment.deleteOne({ hackathonId });
    return res.json({ ok: true });
  }
  const a = await MentorAssignment.findOneAndUpdate(
    { hackathonId },
    { hackathonId, mentorEmail: email },
    { upsert: true, new: true }
  );
  res.json(toClient(a));
}));

// ---- Questions ----
app.get("/api/questions", wrap(async (req, res) => {
  res.json((await Question.find().lean()).map(toClient));
}));
app.post("/api/questions", wrap(async (req, res) => {
  const body = { ...req.body };

  // Mentor-initiated message: has answer/answererEmail but no question text
  const isMentorMessage =
    !body.question &&
    (body.answer || body.answererEmail) &&
    body.answererRole === "mentor";

  if (isMentorMessage) {
    // Store as a mentor_message type — no asker required
    const q = await Question.create({
      hackathonId: body.hackathonId,
      type: "mentor_message",
      answer: body.answer,
      answererEmail: norm(body.answererEmail),
      answererName: body.answererName,
      answererRole: "mentor",
      answeredAt: Date.now(),
    });
    return res.json(toClient(q));
  }

  // Normal participant question
  if (!body.question) return res.status(400).json({ error: "Question text is required." });
  const q = await Question.create({
    ...body,
    type: "question",
    askerEmail: norm(body.askerEmail),
  });
  res.json(toClient(q));
}));
app.patch("/api/questions/:id", wrap(async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { ...req.body, answeredAt: Date.now() }, { new: true });
  res.json(toClient(q));
}));


// ---- Ask AI ----
app.post("/api/ask-ai", wrap(async (req, res) => {
  const { question, hackathonTitle, hackathonTheme } = req.body || {};
  const q = (question || "").trim();
  if (!q || q.length > 1000) return res.status(400).json({ error: "Question must be 1-1000 characters." });

  const ctx = (hackathonTitle || hackathonTheme)
    ? `\n\nThe participant is working on the hackathon "${hackathonTitle || "(untitled)"}" with theme "${hackathonTheme || "(no theme)"}".`
    : "";
  const systemPrompt = `You are SmartHack AI, an experienced hackathon mentor. Help participants with practical, encouraging guidance about ideation, team coordination, technical choices, scoping, demos, and pitching. Keep answers concise (4-8 sentences), structured with bullet points when useful, and actionable.${ctx}`;

  const answer = (await callAiText(systemPrompt, q)) || getSmartAnswer(q, hackathonTitle, hackathonTheme);
  res.json({ answer });
}));

// ---- General FAQ Chatbot (M2F1) ----
// Platform-wide assistant, unlike the hackathon-scoped Mentor Q&A above:
// answers questions about how HackHub itself works, for anyone (including
// logged-out visitors), not tied to a specific hackathon.
const FAQ_SYSTEM_PROMPT = `You are the HackHub Assistant, a friendly support chatbot embedded across the HackHub platform (a hackathon management site). Answer questions about how to use HackHub itself: creating an account and choosing a role (participant, mentor, judge, organizer, admin), browsing and joining hackathons (participants can join up to 2 hackathons at a time), submitting a project, how judges score submissions against a shared rubric, the leaderboard, the per-hackathon Mentor Q&A, the open Discussion Board, and leaving event feedback/ratings. Be concise (2-5 sentences), friendly, and specific to HackHub's features. If asked something unrelated to the platform, answer briefly if you can, then offer to help with HackHub questions instead. If you don't know a specific platform detail, say so honestly rather than guessing.`;
const FAQ_FALLBACK_ANSWER = "I'm having trouble reaching the AI service right now. In the meantime: browse hackathons from the Hackathons page, manage your account from Settings, and organizers can find event tools from the Organizer Dashboard. Please try asking again shortly.";

app.post("/api/faq-chat", wrap(async (req, res) => {
  const { message } = req.body || {};
  const m = (message || "").trim();
  if (!m || m.length > 1000) return res.status(400).json({ error: "Message must be 1-1000 characters." });
  const answer = (await callAiText(FAQ_SYSTEM_PROMPT, m)) || FAQ_FALLBACK_ANSWER;
  res.json({ answer });
}));


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
