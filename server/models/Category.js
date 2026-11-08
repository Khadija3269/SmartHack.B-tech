import mongoose from "mongoose";

// Hackathon categories are managed by admins (no longer a fixed list).
// `key` is the lower-cased name and is unique, so "AI" and "ai" can't both exist.
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, unique: true },
  createdBy: { type: String, default: "system" },
}, { timestamps: true });

export default mongoose.model("Category", CategorySchema);
