import mongoose from "mongoose";

const PasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }
});

export default mongoose.model("PasswordReset", PasswordResetSchema);
