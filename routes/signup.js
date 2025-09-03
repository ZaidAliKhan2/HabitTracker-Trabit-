import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
const port = 3000;

dotenv.config();

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Parse JSON body
router.use(express.json());

// Parse URL-encoded body (if form submissions)
router.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/signup.html"));
});

router.post("/", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let newUser;

    let existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).send("Email already in use.");
      } else {
        newUser = existingUser; // reuse same document
      }
    } else {
      newUser = await User.create({
        name: username,
        email,
        password,
        isVerified: false,
      });
    }

    // 2️⃣ Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.jwtSecretKey,
      { expiresIn: "3h" }
    );
    const verificationLink = `${req.protocol}://${req.get(
      "host"
    )}/signup/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: newUser.email,
      subject: "Verify your email",
      html: `<p>Click the link below to verify your email:</p>
         <a href="${verificationLink}">Verify Email</a>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error(err);
      else console.log("Email sent:", info.response);
    });

    res.sendFile(
      path.join(__dirname, "../public/modals/emailVerification.html")
    );
  } catch (err) {
    res.status(500).send("Something went wrong: " + err.message);
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("No token provided.");
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.jwtSecretKey);

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { isVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send("User not found or already verified.");
    }
    res.redirect("/login?verified=success");
  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid or expired token.");
  }
});

export default router;
