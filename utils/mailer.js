const sgMail = require("@sendgrid/mail");

// ✅ Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 📧 Email when new submission arrives
const sendNewSubmissionEmail = async (submission) => {
  try {
    await sgMail.send({
      to: process.env.EMAIL_USER, // admin email
      from: process.env.EMAIL_USER, // must be verified sender
      subject: "New Matrimonial Submission",
      html: `
        <h2>New Profile Submitted</h2>
        <p><b>Name:</b> ${submission.fullName}</p>
        <p><b>Age:</b> ${submission.age}</p>
        <p><b>City:</b> ${submission.city}</p>
        <p>Status: Pending Approval</p>
      `,
    });

    console.log("📧 SendGrid: New submission email sent");
  } catch (error) {
    console.error("❌ SendGrid error:", error.message);
  }
};

// 📧 Email when profile approved
const sendApprovalEmail = async (submission) => {
  try {
    await sgMail.send({
      to: submission.email,
      from: process.env.EMAIL_USER,
      subject: "Your Matrimonial Profile Approved 🎉",
      html: `
        <h2>Congratulations ${submission.fullName}!</h2>
        <p>Your matrimonial profile has been <b>approved</b>.</p>
        <p>Our team will contact you soon.</p>
        <br/>
        <p>Thank you,<br/>Kinger Matrimonials</p>
      `,
    });

    console.log("📧 SendGrid: Approval email sent");
  } catch (error) {
    console.error("❌ SendGrid approval error:", error.message);
  }
};

module.exports = {
  sendNewSubmissionEmail,
  sendApprovalEmail,
};
