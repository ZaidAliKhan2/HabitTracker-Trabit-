import mongoose from "mongoose";
import { type } from "os";

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  habitName: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  lastCompleted: { type: Date },
  streak: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Habit = mongoose.model("Habit", habitSchema);
