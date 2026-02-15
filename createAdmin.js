require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./models/admin");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected for admin creation"))
  .catch((err) => {
    console.error("Mongo connect error:", err);
    process.exit(1);
  });

async function createAdmin() {
  try {
    const admin = new Admin({
      username: "keshav",
      password: "admin123",
    });

    await admin.save();

    console.log("✅ Admin created successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
}

createAdmin();
