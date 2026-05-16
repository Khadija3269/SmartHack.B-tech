import mongoose from "mongoose";

const MentorAssignmentSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true, unique: true },
  mentorEmail: { type: String, lowercase: true },
}, { timestamps: true });

export default mongoose.model("MentorAssignment", MentorAssignmentSchema);
