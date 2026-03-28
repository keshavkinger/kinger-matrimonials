const express = require("express");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");
const Submission = require("../models/Submission");
const verifyAdmin = require("../middleware/auth");

// 📧 Email utility
//const sendNewSubmissionEmail = require("../utils/mailer");
const { sendNewSubmissionEmail, sendApprovalEmail } = require("../utils/mailer");


// ---------------- MULTER STORAGE ----------------

// Photo storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "photo" || file.fieldname === "photos") {
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
    { name: "photos", maxCount: 5 },
    { name: "biodata", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const uploadedPhotos = (req.files.photos || []).map((file) => file.path);

      const newSubmission = new Submission({
        fullName: req.body.fullName,
        email: req.body.email,
        age: req.body.age,
        height: req.body.height,
        gender: req.body.gender,
        religion: req.body.religion,
        motherTongue: req.body.motherTongue,
        city: req.body.city,
        education: req.body.education,
        occupation: req.body.occupation,
        income: req.body.income,
        maritalStatus: req.body.maritalStatus,
        familyType: req.body.familyType,
        phone: req.body.phone,
        whatsappNumber: req.body.whatsappNumber,
        contactPreference: req.body.contactPreference,
        requirements: req.body.requirements,
        photo: uploadedPhotos[0],
        photos: uploadedPhotos,
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

router.get("/submissions/stats", verifyAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({});

    const stats = submissions.reduce(
      (acc, submission) => {
        acc.total += 1;
        if (submission.status === "Approved") acc.approved += 1;
        if (submission.status === "Pending") acc.pending += 1;
        if (submission.status === "Rejected") acc.rejected += 1;
        if (submission.memberActivatedAt) acc.activeMembers += 1;
        acc.totalInterests += submission.interestRequests?.length || 0;
        acc.contactRequests += submission.contactRevealRequests?.length || 0;
        return acc;
      },
      {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        activeMembers: 0,
        totalInterests: 0,
        contactRequests: 0,
      }
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/submissions", verifyAdmin, async (req, res) => {
  try {
    const { search, minAge, maxAge, status } = req.query;

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

    if (status) {
      filter.status = status;
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
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    submission.status = "Approved";
    await submission.save();

    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("host");
    const setupToken = jwt.sign(
      { id: submission._id, email: submission.email, scope: "member-setup" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const setupLink = `${protocol}://${host}/member/setup-password?token=${setupToken}`;

    // 📧 Send approval email
    await sendApprovalEmail(submission, setupLink);

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
