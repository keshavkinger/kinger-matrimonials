const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📧 Email when new submission arrives
const sendNewSubmissionEmail = async (submission) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Matrimonial Submission",
      html: `
        <h2>New Profile Submitted</h2>
        <p><b>Name:</b> ${submission.fullName}</p>
        <p><b>Age:</b> ${submission.age}</p>
        <p><b>City:</b> ${submission.city}</p>
        <p>Status: Pending Approval</p>
      `,
    });

    console.log("📧 New submission email sent");
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};

// 📧 Email when profile approved
const sendApprovalEmail = async (submission) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: submission.email,
      subject: "Your Matrimonial Profile Approved 🎉",
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
    console.error("❌ Approval email error:", error);
  }
};

// ✅ Export both functions
module.exports = {
  sendNewSubmissionEmail,
  sendApprovalEmail,
};
