import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/userSchema.js";
import { Habit } from "../models/habitsSchema.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
export function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwtSecretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  const { verified } = req.query;

  if (verified !== "success") {
    console.log("User not verified, redirecting to login...");
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.log("No user found for this ID.");
      return res.status(404).send("User not found");
    }

    res.render("dashboard", { user });
  } catch (err) {
    console.error("Error in /:id route:", err);
    res.status(500).send("Server error");
  }
});

router.get("/displayHabits/:id", authMiddleware, async (req, res) => {
  const userId = req.params.id;
  const habits = await Habit.find({ userId: userId });
  res.json(habits);
});

router.post("/addHabit", authMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader.split(" ")[1];

    let payload;
    payload = jwt.verify(token, process.env.jwtSecretKey);

    const userID = payload.id;

    const { habitName } = req.body;
    const userHabit = await Habit.create({
      userId: userID,
      habitName,
      isCompleted: false,
      streak: 0,
    });

    res.status(201).json(userHabit);
  } catch (err) {
    console.error("Error in /addHabit route:", err);
    res.status(500).json({ success: false, error: "Failed to add habit" });
  }
});
router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Habit not found or not authorized" });
    }

    res.json({ message: "Habit deleted successfully" });
  } catch (err) {
    console.error("Error deleting habit:", err);
    res
      .status(500)
      .json({ message: "Error deleting habit", error: err.message });
  }
});
router.put("/isCompleted/:id", async (req, res) => {
  try {
    const habitId = req.params.id;

    // Update habit based on checkbox value
    const updated = await Habit.findByIdAndUpdate(
      habitId,
      {
        isCompleted: req.body.isCompleted,
        lastCompleted: req.body.lastCompleted,
        streak: req.body.streak,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating habit:", err);
    res.status(500).json({ message: "Error updating habit" });
  }
});

router.put("/updateName/:id", async (req, res) => {
  const habitId = req.params.id;
  try {
    const updatedName = await Habit.findByIdAndUpdate(
      habitId, // first argument: ID
      { habitName: req.body.habitName }, // second: update object
      { new: true } // third: options
    );
    res.status(201).json(updatedName);
  } catch (err) {
    res.status(500).send("Error Ocuured: ", err);
  }
});

export default router;
