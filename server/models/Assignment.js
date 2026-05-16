import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  judgeEmail: { type: String, lowercase: true },
}, { timestamps: true });

AssignmentSchema.index({ hackathonId: 1, judgeEmail: 1 }, { unique: true });

export default mongoose.model("Assignment", AssignmentSchema);
