import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  // "question" posts (participant-initiated)
  askerEmail: { type: String, lowercase: true },
  askerName: String,
  question: String,          // optional — absent for mentor-initiated messages
  // response / mentor-initiated message
  answer: String,
  answererEmail: String,
  answererName: String,
  answererRole: { type: String, enum: ["mentor", "ai"] },
  answeredAt: Number,
  // discriminator: "question" | "mentor_message"
  type: { type: String, enum: ["question", "mentor_message"], default: "question" },
}, { timestamps: true });

export default mongoose.model("Question", QuestionSchema);
