import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  participantEmail: { type: String, required: true, lowercase: true },
  projectTitle: String,
  description: String,
  teamMembers: String,
  category: String,
  fileName: String,
  fileData: { type: String, default: "" }, // base64 data URL, same pattern as user CV uploads
  link: String,
  githubLink: { type: String, default: "" },
  demoLink: { type: String, default: "" },
  status: { type: String, enum: ["Submitted", "Evaluated"], default: "Submitted" },
}, { timestamps: true });


export default mongoose.model("Submission", SubmissionSchema);
