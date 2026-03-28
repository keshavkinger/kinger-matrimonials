const sgMail = require("@sendgrid/mail");

// ✅ Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function logSendGridError(prefix, error) {
  console.error(prefix, error.message);

  const apiErrors = error.response?.body?.errors;
  if (apiErrors?.length) {
    apiErrors.forEach((entry, index) => {
      console.error(`❌ SendGrid detail ${index + 1}:`, entry.message);
    });
  }
}

// 📧 Email when new submission arrives
const sendNewSubmissionEmail = async (submission) => {
  try {
    console.log(`📨 Sending new submission email to ${process.env.EMAIL_USER}`);

    await sgMail.send({
      to: process.env.EMAIL_USER, // admin email
      from: process.env.EMAIL_USER, // must be verified sender
      subject: "New Matrimonial Submission",
      text: `New profile submitted by ${submission.fullName}. Age: ${submission.age}. City: ${submission.city}. Status: Pending Approval.`,
      html: `
        <h2>New Profile Submitted</h2>
        <p><b>Name:</b> ${submission.fullName}</p>
        <p><b>Age:</b> ${submission.age}</p>
        <p><b>Height:</b> ${submission.height || "Not added"}</p>
        <p><b>City:</b> ${submission.city}</p>
        <p><b>Education:</b> ${submission.education || "Not added"}</p>
        <p><b>Occupation:</b> ${submission.occupation || "Not added"}</p>
        <p><b>Income:</b> ${submission.income || "Not added"}</p>
        <p><b>Phone:</b> ${submission.phone || "Not added"}</p>
        <p><b>WhatsApp:</b> ${submission.whatsappNumber || "Not added"}</p>
        <p><b>Contact Preference:</b> ${submission.contactPreference || "Not added"}</p>
        <p>Status: Pending Approval</p>
      `,
    });

    console.log("📧 SendGrid: New submission email sent");
  } catch (error) {
    logSendGridError("❌ SendGrid error:", error);
  }
};

// 📧 Email when profile approved
const sendApprovalEmail = async (submission, setupLink) => {
  try {
    console.log(`📨 Sending approval email to ${submission.email}`);

    await sgMail.send({
      to: submission.email,
      from: process.env.EMAIL_USER,
      subject: "Your Matrimonial Profile Approved 🎉",
      text: `Your profile is approved. Set your password here: ${setupLink} After creating your password, log in at https://www.kingermatrimonials.in/member/login using your email and new password.`,
      html: `
        <div style="margin:0;padding:32px 16px;background:#f8f1e9;font-family:Arial,sans-serif;color:#2a1611;">
          <div style="max-width:640px;margin:0 auto;background:#fffaf4;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(66,29,17,0.12);border:1px solid rgba(200,155,60,0.18);">
            <div style="padding:32px;background:linear-gradient(135deg,#64131d,#8f1d2c);color:#fff7f1;text-align:center;">
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Kinger Matrimonials</div>
              <h1 style="margin:14px 0 8px;font-size:34px;line-height:1.1;">Your profile is approved</h1>
              <p style="margin:0;font-size:16px;line-height:1.6;color:rgba(255,247,241,0.88);">
                Congratulations ${submission.fullName}, your matrimonial profile has successfully passed review.
              </p>
            </div>

            <div style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#5f4a41;">
                You can now activate your member access and sign in to privately view approved profiles.
                Set your password using the secure button below.
              </p>

              <div style="margin:24px 0;padding:20px;border-radius:18px;background:#fcf6ef;border:1px solid rgba(200,155,60,0.18);">
                <p style="margin:0 0 12px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#8f1d2c;">
                  Activate member access
                </p>
                <a href="${setupLink}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:linear-gradient(135deg,#8f1d2c,#64131d);color:#fffaf6;text-decoration:none;font-weight:bold;">
                  Set Password
                </a>
              </div>

              <div style="margin:0 0 24px;padding:18px;border-radius:16px;background:#fff;border:1px solid rgba(143,29,44,0.14);">
                <p style="margin:0 0 8px;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#8f1d2c;">
                  After you set your password
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#5f4a41;">
                  Go to
                  <a href="https://www.kingermatrimonials.in/member/login" style="color:#8f1d2c;font-weight:bold;text-decoration:none;">
                    www.kingermatrimonials.in/member/login
                  </a>
                  and sign in using your email and new password.
                </p>
              </div>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#5f4a41;">
                What happens next:
              </p>
              <ul style="margin:0 0 20px 18px;padding:0;color:#5f4a41;line-height:1.8;">
                <li>Your profile is already approved in our system.</li>
                <li>Use the button above to create your password.</li>
                <li>After setting your password, sign in at www.kingermatrimonials.in/member/login.</li>
              </ul>

              <p style="margin:0;font-size:15px;line-height:1.7;color:#5f4a41;">
                Thank you for trusting Kinger Matrimonials.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("📧 SendGrid: Approval email sent");
  } catch (error) {
    logSendGridError("❌ SendGrid approval error:", error);
  }
};

module.exports = {
  sendNewSubmissionEmail,
  sendApprovalEmail,
};
