import mongoose from "mongoose";

const DiscussionPostSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  parentId: { type: String, default: null }, // null = top-level thread, else replying to another post
  authorEmail: { type: String, required: true, lowercase: true },
  authorName: { type: String, default: "" },
  authorRole: { type: String, default: "participant" },
  message: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("DiscussionPost", DiscussionPostSchema);
