import mongoose from "mongoose";

const HackathonSchema = new mongoose.Schema({
  title: String,
  theme: String,
  startDate: String,
  endDate: String,
  location: String,
  duration: String,
  description: String,
  teamSize: String,
  rewards: String,
  category: String,
  organizerEmail: { type: String, default: "system" },
}, { timestamps: true });

export default mongoose.model("Hackathon", HackathonSchema);
