import mongoose from "mongoose";

const EvaluationSchema = new mongoose.Schema({
  submissionId: { type: String, required: true },
  judgeEmail: { type: String, required: true, lowercase: true },
  innovation: Number,
  design: Number,
  functionality: Number,
  feedback: String,
  scores: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model("Evaluation", EvaluationSchema);
