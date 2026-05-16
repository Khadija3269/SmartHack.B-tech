import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  participantEmail: { type: String, required: true, lowercase: true },
}, { timestamps: true });

RegistrationSchema.index({ hackathonId: 1, participantEmail: 1 }, { unique: true });

export default mongoose.model("Registration", RegistrationSchema);
