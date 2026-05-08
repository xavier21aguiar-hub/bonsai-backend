import mongoose from "mongoose";

const bonsaiSchema = new mongoose.Schema({
  name: String,
  species: String,
  lastWatered: Date,
  wateringHistory: [Date],
  health: {
    type: Number,
    default: 80
  },
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Bonsai = mongoose.model("Bonsai", bonsaiSchema);