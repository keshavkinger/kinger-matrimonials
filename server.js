require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const submissionRoutes = require("./routes/submissionRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminPageAuth = require("./middleware/adminPageAuth");

const app = express();

// ---------------- MIDDLEWARE ----------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// ---------------- DB CONNECTION ----------------

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ☁️"))
  .catch((err) => console.log("DB Error:", err));

// ---------------- API ROUTES ----------------

app.use("/api", submissionRoutes);
app.use("/api/admin", adminAuthRoutes);

// ---------------- PAGE ROUTES ----------------

app.get("/", (req, res) => {
  res.send("KINGER MATRIMONIALS Server Running ✅");
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

app.get("/success", (req, res) => {
  res.render("success");
});

app.get("/admin/login", (req, res) => {
  res.render("admin-login");
});

// 🔐 PROTECTED ADMIN PAGE
app.get("/admin/dashboard", (req, res) => {
  res.render("admin-dashboard");
});

// ---------------- SERVER ----------------

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
