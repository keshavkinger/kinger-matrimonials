const nodemailer = require("nodemailer");

// ✅ Transporter (Render safe - TLS 587)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔍 Verify connection on startup (optional but useful)
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Mailer connection failed:", error.message);
  } else {
    console.log("✅ Mailer ready");
  }
});


// 📧 Email when NEW submission arrives (to admin)
const sendNewSubmissionEmail = async (submission) => {
  try {
    await transporter.sendMail({
      from: `"Kinger Matrimonials" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // admin receives
      subject: "📩 New Matrimonial Submission",
      html: `
        <h2>New Profile Submitted</h2>
        <p><b>Name:</b> ${submission.fullName}</p>
        <p><b>Age:</b> ${submission.age}</p>
        <p><b>City:</b> ${submission.city}</p>
        <p><b>Email:</b> ${submission.email}</p>
        <p>Status: Pending Approval</p>
        <hr/>
        <small>Kinger Matrimonials System</small>
      `,
    });

    console.log("📧 New submission email sent");
  } catch (error) {
    console.error("❌ New submission email error:", error.message);
  }
};


// 📧 Email when profile approved (to user)
const sendApprovalEmail = async (submission) => {
  try {
    await transporter.sendMail({
      from: `"Kinger Matrimonials" <${process.env.EMAIL_USER}>`,
      to: submission.email,
      subject: "🎉 Your Matrimonial Profile Approved",
      html: `
        <h2>Congratulations ${submission.fullName}!</h2>
        <p>Your matrimonial profile has been <b>approved</b>.</p>
        <p>Our team will contact you soon.</p>
        <br/>
        <p>Thank you,<br/>Kinger Matrimonials</p>
      `,
    });

    console.log("📧 Approval email sent");
  } catch (error) {
    console.error("❌ Approval email error:", error.message);
  }
};

module.exports = {
  sendNewSubmissionEmail,
  sendApprovalEmail,
};
