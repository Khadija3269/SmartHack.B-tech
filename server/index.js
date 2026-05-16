import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSmartAnswer } from "./ai.js";
//import all pages
import Users from "./models/Users.js";
import Hackathon from "./models/Hackathon.js";
import Registration from "./models/Registration.js";
import Submission from "./models/Submission.js";
import Evaluation from "./models/Evaluation.js";
import Assignment from "./models/Assignment.js";
import MentorAssignment from "./models/MentorAssignment.js";
import Question from "./models/Question.js";
import PasswordReset from "./models/PasswordReset.js";
import nodemailer from "nodemailer";

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
  const { name, fullName, email, password, role, organization, bio, experience, reason, cvName, cvData } = req.body;
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
  const defaultUsername = norm(email).split("@")[0];
  const user = await Users.create({
    name: displayName, username: defaultUsername, email: norm(email), password: hash,
    role: userRole, organization: organization || "", status,
    bio: bio || "", experience: experience || "", reason: reason || "",
    cvName: cvName || "", cvData: cvData || "",
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

  res.json({ id: String(user._id), fullName: user.name, name: user.name, username: user.username, email: user.email, role: user.role, organization: user.organization, status: user.status });
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
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: String(user._id), fullName: user.name, name: user.name, username: user.username || norm(user.email).split("@")[0], email: user.email, role: user.role, organization: user.organization, status: user.status } });
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
app.get("/api/bootstrap", wrap(async (req, res) => {
  const [users, hackathons, registrations, submissions, evaluations, assignments, mentorAssignments, questions] = await Promise.all([
    Users.find().lean(),
    Hackathon.find().lean(),
    Registration.find().lean(),
    Submission.find().lean(),
    Evaluation.find().lean(),
    Assignment.find().lean(),
    MentorAssignment.find().lean(),
    Question.find().lean(),
  ]);
  const cleanUsers = users.map(u => ({ id: String(u._id), fullName: u.name, name: u.name, username: u.username || norm(u.email).split("@")[0], email: u.email, role: u.role, organization: u.organization, status: u.status || "Active", bio: u.bio || "", experience: u.experience || "", reason: u.reason || "", cvName: u.cvName || "", hasCv: !!u.cvData, rejectionReason: u.rejectionReason || "" }));
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
  });
}));

// ---- Users (admin) ----
app.get("/api/users", wrap(async (req, res) => {
  const list = await Users.find().lean();
  res.json(list.map(u => ({ id: String(u._id), fullName: u.name, name: u.name, username: u.username || norm(u.email).split("@")[0], email: u.email, role: u.role, organization: u.organization, status: u.status || "Active", bio: u.bio || "", experience: u.experience || "", reason: u.reason || "", cvName: u.cvName || "", hasCv: !!u.cvData, rejectionReason: u.rejectionReason || "" })));
}));
app.patch("/api/users/:email/status", wrap(async (req, res) => {
  const { status } = req.body;
  await Users.updateOne({ email: norm(req.params.email) }, { status });
  res.json({ ok: true });
}));
app.patch("/api/users/:email/profile", wrap(async (req, res) => {
  const { name, email, username } = req.body;
  const target = await Users.findOne({ email: norm(req.params.email) });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (name) target.name = name;
  if (username !== undefined) target.username = username.trim();
  if (email && norm(email) !== target.email) {
    const exists = await Users.findOne({ email: norm(email) });
    if (exists) return res.status(400).json({ error: "Email already in use" });
    target.email = norm(email);
  }
  await target.save();
  res.json({ id: String(target._id), fullName: target.name, name: target.name, username: target.username || norm(target.email).split("@")[0], email: target.email, role: target.role, status: target.status });
}));
app.delete("/api/users/:email", wrap(async (req, res) => {
  await Users.deleteOne({ email: norm(req.params.email) });
  res.json({ ok: true });
}));

// ---- Hackathons ----
app.get("/api/hackathons", wrap(async (req, res) => {
  const list = await Hackathon.find().lean();
  res.json(list.map(toClient));
}));
app.post("/api/hackathons", wrap(async (req, res) => {
  const h = await Hackathon.create(req.body);
  res.json(toClient(h));
}));
app.put("/api/hackathons/:id", wrap(async (req, res) => {
  const h = await Hackathon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(toClient(h));
}));
app.delete("/api/hackathons/:id", wrap(async (req, res) => {
  const id = req.params.id;
  await Promise.all([
    Hackathon.findByIdAndDelete(id),
    Registration.deleteMany({ hackathonId: id }),
    Submission.deleteMany({ hackathonId: id }),
    Assignment.deleteMany({ hackathonId: id }),
    MentorAssignment.deleteMany({ hackathonId: id }),
    Question.deleteMany({ hackathonId: id }),
  ]);
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
  const count = await Registration.countDocuments({ participantEmail: norm(participantEmail) });
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
app.post("/api/assignments", wrap(async (req, res) => {
  const { hackathonId, judgeEmail } = req.body;
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
app.delete("/api/assignments", wrap(async (req, res) => {
  const { hackathonId, judgeEmail } = req.body;
  const email = norm(judgeEmail);
  if (!hackathonId || !email) return res.status(400).json({ error: "Missing fields" });
  await Assignment.deleteOne({ hackathonId, judgeEmail: email });
  res.json({ ok: true });
}));

// ---- Mentor Assignments ----
app.get("/api/mentor-assignments", wrap(async (req, res) => {
  res.json((await MentorAssignment.find().lean()).map(toClient));
}));
app.post("/api/mentor-assignments", wrap(async (req, res) => {
  const { hackathonId, mentorEmail } = req.body;
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

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  const ctx = (hackathonTitle || hackathonTheme)
    ? `\n\nThe participant is working on the hackathon "${hackathonTitle || "(untitled)"}" with theme "${hackathonTheme || "(no theme)"}".`
    : "";
  const systemPrompt = `You are SmartHack AI, an experienced hackathon mentor. Help participants with practical, encouraging guidance about ideation, team coordination, technical choices, scoping, demos, and pitching. Keep answers concise (4-8 sentences), structured with bullet points when useful, and actionable.${ctx}`;

  // Try external APIs if configured
  try {
    if (ANTHROPIC_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: q }] }),
      });
      const data = await r.json();
      if (r.ok) return res.json({ answer: data?.content?.map(b => b.text || "").join("").trim() });
    }
    if (GEMINI_KEY) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: q }] }] }),
      });
      const data = await r.json();
      if (r.ok) return res.json({ answer: data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("").trim() });
    }
    if (OPENAI_KEY) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: q }] }),
      });
      const data = await r.json();
      if (r.ok) return res.json({ answer: data?.choices?.[0]?.message?.content?.trim() });
    }
  } catch (e) {
    console.warn("External AI failed, falling back to local:", e.message);
  }

  // Built-in smart AI — works with zero API keys
  const answer = getSmartAnswer(q, hackathonTitle, hackathonTheme);
  return res.json({ answer });
}));


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
