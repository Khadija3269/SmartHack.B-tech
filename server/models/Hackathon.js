import mongoose from "mongoose";

const TimelineItemSchema = new mongoose.Schema({
  label: String,
  date: String,
}, { _id: false });

const HackathonSchema = new mongoose.Schema({
  title: String,
  theme: String,
  startDate: String,
  endDate: String,
  location: String,
  duration: String,
  description: String,
  teamSize: String,
  rewards: String,
  category: { type: String, default: "" },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  // Why it's archived: "ended" (end date passed), "manual" (archived by hand) or
  // "deleted" (an organizer/admin deleted it — kept, never destroyed).
  archivedReason: { type: String, default: "" },
  archivedBy: { type: String, default: "" },
  submissionDeadline: { type: String, default: "" },
  timeline: { type: [TimelineItemSchema], default: [] },
  organizerEmail: { type: String, default: "system" },
}, { timestamps: true });

export default mongoose.model("Hackathon", HackathonSchema);
