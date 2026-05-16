import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  username:     { type: String, default: "" },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ["participant", "organizer", "judge", "mentor", "admin"], default: "participant" },
  organization: { type: String, default: "" },
  status:       { type: String, enum: ["Active", "Blocked", "Pending", "Rejected"], default: "Active" },

  // Professional application fields (judge / mentor / organizer)
  bio:          { type: String, default: "" },
  experience:   { type: String, default: "" },
  reason:       { type: String, default: "" },
  cvName:       { type: String, default: "" },
  cvData:       { type: String, default: "" }, // base64 data URL
  rejectionReason: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Users", UserSchema);
