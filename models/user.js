import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  leaves: {
    type: Number,
    default: 0
  },
  unlockedAchievements: {
    type: [String],
    default: []
  },
  purchasedItems: {
    type: [String],
    default: []
  },
  equippedPot: {
    type: String,
    default: "terracota"
  }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
