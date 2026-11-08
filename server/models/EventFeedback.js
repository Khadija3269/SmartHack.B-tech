import mongoose from "mongoose";

const EventFeedbackSchema = new mongoose.Schema({
  hackathonId: { type: String, required: true },
  participantEmail: { type: String, required: true, lowercase: true },
  participantName: { type: String, default: "" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  sentiment: { type: String, enum: ["positive", "neutral", "negative", null], default: null },
}, { timestamps: true });

// One feedback entry per participant per hackathon — resubmitting updates it.
EventFeedbackSchema.index({ hackathonId: 1, participantEmail: 1 }, { unique: true });

export default mongoose.model("EventFeedback", EventFeedbackSchema);
