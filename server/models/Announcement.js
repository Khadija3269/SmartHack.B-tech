import mongoose from "mongoose";

// An announcement can also work as an advertisement: it may carry a link to
// another hackathon on HackHub (linkedHackathonId) or to an external page
// (linkUrl), shown to readers as a call-to-action button (linkLabel).
const AnnouncementSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  category: { type: String, default: "" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  linkedHackathonId: { type: String, default: "" },
  linkUrl: { type: String, default: "" },
  linkLabel: { type: String, default: "" },
  organizerEmail: { type: String, default: "system" },
}, { timestamps: true });

export default mongoose.model("Announcement", AnnouncementSchema);
