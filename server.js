import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import loginRouter from "./routes/login.js";
import signupRouter from "./routes/signup.js";
import dashboardRouter from "./routes/dashboard.js";
import { User } from "./models/userSchema.js";

dotenv.config();

//db connection string
mongoose.connect(process.env.MONGO_URL);

//variables
const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//middleware
app.use(express.json());
app.use(express.static("public"));

//routes
app.get("/", (req, res) => {});
app.use("/login", loginRouter);
app.use("/signup", signupRouter);
app.use("/dashboard", dashboardRouter);
app.get("/quote", async (req, res) => {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
