require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const submissionRoutes = require("./routes/submissionRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");

const app = express();

// ✅ Ensure upload folders exist (Render fix)
["uploads", "uploads/photos", "uploads/biodata"].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});


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
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));


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


// 🔐 PROTECTED ADMIN DASHBOARD (JWT in URL)
app.get("/admin/dashboard", (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.redirect("/admin/login");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.render("admin-dashboard");
  } catch (err) {
    console.log("❌ Invalid token");
    return res.redirect("/admin/login");
  }
});


// ---------------- SERVER ----------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
