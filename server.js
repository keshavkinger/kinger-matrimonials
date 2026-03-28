require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const Submission = require("./models/Submission");
const submissionRoutes = require("./routes/submissionRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const memberAuthRoutes = require("./routes/memberAuthRoutes");

const app = express();

function getVerifiedMember(req) {
  const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope !== "member-access") return null;
    return { token, decoded };
  } catch (err) {
    return null;
  }
}

function buildRecommendations(member, profiles) {
  return profiles
    .filter((profile) => String(profile._id) !== String(member._id))
    .map((profile) => {
      let score = 0;
      if (profile.city && member.city && profile.city === member.city) score += 3;
      if (profile.religion && member.religion && profile.religion === member.religion) score += 3;
      if (
        profile.motherTongue &&
        member.motherTongue &&
        profile.motherTongue === member.motherTongue
      ) score += 2;
      if (
        Number.isFinite(Number(profile.age)) &&
        Number.isFinite(Number(member.age)) &&
        Math.abs(Number(profile.age) - Number(member.age)) <= 4
      ) score += 2;
      return { profile, score };
    })
    .sort((a, b) => b.score - a.score || b.profile.createdAt - a.profile.createdAt)
    .slice(0, 4)
    .map((entry) => entry.profile);
}

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
app.use("/api/member", memberAuthRoutes);


// ---------------- PAGE ROUTES ----------------

app.get("/", async (req, res) => {
  try {
    const [approvedCount, pendingCount] = await Promise.all([
      Submission.countDocuments({ status: "Approved" }),
      Submission.countDocuments({ status: "Pending" }),
    ]);

    res.render("index", {
      approvedCount,
      pendingCount,
    });
  } catch (err) {
    console.error("❌ Homepage load error:", err.message);
    res.render("index", {
      approvedCount: 0,
      pendingCount: 0,
    });
  }
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

app.get("/success", (req, res) => {
  res.render("success");
});

app.get("/gun-milan", (req, res) => {
  res.render("gun-milan");
});

app.get("/profiles", async (req, res) => {
  try {
    const memberAuth = getVerifiedMember(req);

    if (!memberAuth) {
      return res.status(403).render("profiles-access", {
        allowed: false,
        profiles: [],
        token: "",
      });
    }

    const submission = await Submission.findById(memberAuth.decoded.id);

    if (
      !submission ||
      submission.status !== "Approved" ||
      !submission.memberPassword
    ) {
      return res.status(403).render("profiles-access", {
        allowed: false,
        profiles: [],
        token: "",
      });
    }

    const profiles = await Submission.find({ status: "Approved" })
      .sort({ createdAt: -1 })
      .limit(24);

    const shortlistedIds = submission.shortlistedProfiles.map((id) => String(id));

    res.render("profiles-access", {
      allowed: true,
      profiles,
      token: memberAuth.token,
      member: submission,
      shortlistedIds,
    });
  } catch (err) {
    console.error("❌ Approved profiles load error:", err.message);
    res.status(500).render("profiles-access", {
      allowed: false,
      profiles: [],
      token: "",
      member: null,
      shortlistedIds: [],
    });
  }
});

app.get("/member/dashboard", async (req, res) => {
  try {
    const memberAuth = getVerifiedMember(req);

    if (!memberAuth) {
      return res.redirect("/member/login");
    }

    const member = await Submission.findById(memberAuth.decoded.id);

    if (!member || member.status !== "Approved" || !member.memberPassword) {
      return res.redirect("/member/login");
    }

    const [approvedCount, allApprovedProfiles, shortlistProfiles] = await Promise.all([
      Submission.countDocuments({ status: "Approved" }),
      Submission.find({ status: "Approved" }).sort({ createdAt: -1 }).limit(18),
      Submission.find({
        _id: { $in: member.shortlistedProfiles || [] },
      }).sort({ createdAt: -1 }),
    ]);

    const recommendations = buildRecommendations(member, allApprovedProfiles);

    res.render("member-dashboard", {
      token: memberAuth.token,
      member,
      approvedCount,
      recommendations,
      shortlistProfiles,
    });
  } catch (err) {
    console.error("❌ Member dashboard load error:", err.message);
    res.redirect("/member/login");
  }
});

app.get("/member/edit", (req, res) => {
  const memberAuth = getVerifiedMember(req);
  if (!memberAuth) {
    return res.redirect("/member/login");
  }
  res.render("member-edit-profile", { token: memberAuth.token });
});

app.get("/profiles/:id", async (req, res) => {
  try {
    const memberAuth = getVerifiedMember(req);

    if (!memberAuth) {
      return res.redirect("/member/login");
    }

    const [member, profile] = await Promise.all([
      Submission.findById(memberAuth.decoded.id),
      Submission.findById(req.params.id),
    ]);

    if (!member || member.status !== "Approved" || !member.memberPassword) {
      return res.redirect("/member/login");
    }

    if (!profile || profile.status !== "Approved") {
      return res.redirect(`/profiles?token=${memberAuth.token}`);
    }

    const isShortlisted = member.shortlistedProfiles.some(
      (id) => String(id) === String(profile._id)
    );
    const hasExpressedInterest = profile.interestRequests.some(
      (entry) => String(entry.memberId) === String(member._id)
    );
    const hasRequestedReveal = profile.contactRevealRequests.some(
      (entry) => String(entry.memberId) === String(member._id)
    );

    res.render("member-profile-detail", {
      token: memberAuth.token,
      member,
      profile,
      isShortlisted,
      hasExpressedInterest,
      hasRequestedReveal,
    });
  } catch (err) {
    console.error("❌ Member profile detail load error:", err.message);
    res.redirect("/member/login");
  }
});

app.get("/member/login", (req, res) => {
  res.render("member-login");
});

app.get("/member/setup-password", (req, res) => {
  res.render("member-setup-password", { token: req.query.token || "" });
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
