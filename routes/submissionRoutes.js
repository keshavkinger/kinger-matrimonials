const express = require("express");
const router = express.Router();
const multer = require("multer");
const Submission = require("../models/Submission");
const verifyAdmin = require("../middleware/auth");

// 📧 Email utility
//const sendNewSubmissionEmail = require("../utils/mailer");
const { sendNewSubmissionEmail, sendApprovalEmail } = require("../utils/mailer");


// ---------------- MULTER STORAGE ----------------

// Photo storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "photo") {
      cb(null, "uploads/photos");
    } else {
      cb(null, "uploads/biodata");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// ---------------- SUBMIT ROUTE ----------------

router.post(
  "/submit",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "biodata", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const newSubmission = new Submission({
        fullName: req.body.fullName,
        email: req.body.email,
        age: req.body.age,
        gender: req.body.gender,
        religion: req.body.religion,
        city: req.body.city,
        photo: req.files.photo[0].path,
        biodata: req.files.biodata[0].path,
      });

      await newSubmission.save();
      console.log("✅ Submission saved");

      // ✅ Respond immediately (DO NOT WAIT FOR EMAIL)
      res.redirect("/success");

      // 📧 Send email in background
      sendNewSubmissionEmail(newSubmission)
        .then(() => console.log("📧 Email sent"))
        .catch(err => console.log("❌ Email failed:", err.message));

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Submission Failed ❌" });
    }
  }
);



// ---------------- GET SUBMISSIONS (FILTER + PAGINATION) ----------------

router.get("/submissions", verifyAdmin, async (req, res) => {
  try {
    const { search, minAge, maxAge } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    let filter = {};

    // 🔍 Search by name or city
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 Age filter
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }

    const total = await Submission.countDocuments(filter);

    const submissions = await Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      submissions,
      total,
      page,
      pages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});


// ---------------- APPROVE PROFILE ----------------

router.put("/submissions/:id/approve", verifyAdmin, async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    );

    // 📧 Send approval email
    await sendApprovalEmail(submission);

    res.json({ message: "Profile approved" });
  } catch (err) {
    res.status(500).json({ error: "Approval failed" });
  }
});


// ---------------- REJECT PROFILE ----------------

router.put("/submissions/:id/reject", verifyAdmin, async (req, res) => {
  try {
    await Submission.findByIdAndUpdate(req.params.id, { status: "Rejected" });
    res.json({ message: "Profile rejected" });
  } catch (err) {
    res.status(500).json({ error: "Rejection failed" });
  }
});


// ---------------- DELETE PROFILE ----------------

router.delete("/submissions/:id", verifyAdmin, async (req, res) => {
  try {
    await Submission.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;

