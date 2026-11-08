import mongoose from "mongoose";

const CriterionSchema = new mongoose.Schema({
  id: String,
  name: String,
  weight: Number,
  description: String,
}, { _id: false });

// Single-document collection: there is exactly one shared rubric for the
// whole platform, so every judge scores submissions against the same
// criteria and weights. Organizers/admins edit it from /scoring-config.
const ScoringConfigSchema = new mongoose.Schema({
  criteria: { type: [CriterionSchema], default: [] },
  updatedBy: { type: String, default: "system" },
}, { timestamps: true });

export default mongoose.model("ScoringConfig", ScoringConfigSchema);
