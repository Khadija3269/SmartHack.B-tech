import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  participantEmail: { type: String, required: true, lowercase: true },
  projectTitle: String,
  description: String,
  teamMembers: String,
  category: String,
  fileName: String,
  link: String,
  status: { type: String, enum: ["Submitted", "Evaluated"], default: "Submitted" },
}, { timestamps: true });

export default mongoose.model("Submission", SubmissionSchema);
