import mongoose from "mongoose";

const bonsaiSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  species: String,
  lastWatered: Date,
  wateringHistory: [Date],
  health: {
    type: Number,
    default: 80
  },
  mood: {
    type: String,
    default: "normal"
  },
  state: {
    type: String,
    default: "normal"
  },
  xp: {
    type: Number,
    default: 0
  },
  healthHistory: [
    {
      value: Number,
      date: {
        type:Date,
        default: Date.now
      }
    }
  ],
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Bonsai = mongoose.model("Bonsai", bonsaiSchema);