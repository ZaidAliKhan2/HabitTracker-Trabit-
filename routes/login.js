import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const router = express.Router();
router.use(express.json());

router.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

router.post("/", async (req, res) => {
  try {
    const { loginEmail, loginPassword } = req.body;

    const user = await User.findOne({ email: loginEmail });

    if (!user) {
      return res.status(400).send("❌ User not found");
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .send("❌ Please verify your email before logging in");
    }

    if (user.password !== loginPassword) {
      return res.status(401).send("❌ Invalid credentials");
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.jwtSecretKey,
      { expiresIn: "3h" }
    );

    res.json({ token, id: user._id });
  } catch (err) {
    res.status(500).send("⚠️ Server Error: " + err.message);
  }
});

export default router;
