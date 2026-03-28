const express = require("express");
const jwt = require("jsonwebtoken");

const Submission = require("../models/Submission");

const router = express.Router();

async function getVerifiedMember(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.body.token || req.query.token;

  if (!token) {
    return { error: "Member token missing" };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.scope !== "member-access") {
      return { error: "Invalid member token" };
    }

    const member = await Submission.findById(decoded.id);

    if (!member || member.status !== "Approved" || !member.memberPassword) {
      return { error: "Approved member not found" };
    }

    return { member, token };
  } catch (err) {
    return { error: "Invalid or expired member token" };
  }
}

router.post("/setup-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: "Valid token and password are required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.scope !== "member-setup") {
      return res.status(401).json({ error: "Invalid setup token" });
    }

    const submission = await Submission.findById(decoded.id);

    if (!submission || submission.status !== "Approved") {
      return res.status(404).json({ error: "Approved member not found" });
    }

    submission.memberPassword = password;
    submission.memberActivatedAt = new Date();
    await submission.save();

    res.json({ message: "Password set successfully" });
  } catch (err) {
    res.status(401).json({ error: "Setup link is invalid or expired" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const submission = await Submission.findOne({ email });

    if (!submission || submission.status !== "Approved" || !submission.memberPassword) {
      return res.status(401).json({ error: "Account not ready for login" });
    }

    const isMatch = await submission.compareMemberPassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: submission._id, email: submission.email, scope: "member-access" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Member login failed" });
  }
});

router.get("/me", async (req, res) => {
  const result = await getVerifiedMember(req);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  res.json({ member: result.member });
});

router.put("/me", async (req, res) => {
  const result = await getVerifiedMember(req);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  const editableFields = [
    "fullName",
    "age",
    "height",
    "gender",
    "religion",
    "motherTongue",
    "city",
    "education",
    "occupation",
    "income",
    "maritalStatus",
    "familyType",
    "phone",
    "whatsappNumber",
    "contactPreference",
    "requirements",
  ];

  editableFields.forEach((field) => {
    if (typeof req.body[field] === "string" && req.body[field].trim()) {
      result.member[field] = req.body[field].trim();
    }
  });

  await result.member.save();

  res.json({ message: "Profile updated successfully" });
});

router.post("/shortlists/:profileId", async (req, res) => {
  const result = await getVerifiedMember(req);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  const { profileId } = req.params;

  if (String(result.member._id) === profileId) {
    return res.status(400).json({ error: "You cannot shortlist your own profile" });
  }

  const alreadySaved = result.member.shortlistedProfiles.some(
    (id) => String(id) === profileId
  );

  if (alreadySaved) {
    result.member.shortlistedProfiles = result.member.shortlistedProfiles.filter(
      (id) => String(id) !== profileId
    );
    await result.member.save();
    return res.json({ message: "Removed from shortlist", saved: false });
  }

  result.member.shortlistedProfiles.push(profileId);
  await result.member.save();

  res.json({ message: "Added to shortlist", saved: true });
});

router.post("/interests/:profileId", async (req, res) => {
  const result = await getVerifiedMember(req);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  const target = await Submission.findById(req.params.profileId);

  if (!target || target.status !== "Approved") {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (String(target._id) === String(result.member._id)) {
    return res.status(400).json({ error: "You cannot express interest in your own profile" });
  }

  const alreadyRequested = target.interestRequests.some(
    (entry) => String(entry.memberId) === String(result.member._id)
  );

  if (!alreadyRequested) {
    target.interestRequests.push({ memberId: result.member._id });
    await target.save();
  }

  res.json({ message: alreadyRequested ? "Interest already sent" : "Interest sent successfully" });
});

router.post("/contact-reveals/:profileId", async (req, res) => {
  const result = await getVerifiedMember(req);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  const target = await Submission.findById(req.params.profileId);

  if (!target || target.status !== "Approved") {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (String(target._id) === String(result.member._id)) {
    return res.status(400).json({ error: "You already own this profile" });
  }

  const alreadyRequested = target.contactRevealRequests.some(
    (entry) => String(entry.memberId) === String(result.member._id)
  );

  if (!alreadyRequested) {
    target.contactRevealRequests.push({ memberId: result.member._id });
    await target.save();
  }

  res.json({
    message: alreadyRequested
      ? "Contact reveal already requested"
      : "Contact reveal request sent to admin",
  });
});

module.exports = router;
