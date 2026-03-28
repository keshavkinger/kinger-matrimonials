const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const interactionSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
   email: {                 // ✅ ADD THIS
    type: String,
    required: true,
  },
  age: Number,
  height: String,
  gender: String,
  religion: String,
  motherTongue: String,
  city: String,
  education: String,
  occupation: String,
  income: String,
  maritalStatus: String,
  familyType: String,
  phone: String,
  whatsappNumber: String,
  contactPreference: String,
  requirements: String,

  photo: String,     // photo file path
  photos: [String],
  biodata: String,   // pdf file path

  // ✅ NEW FIELD
  status: {
    type: String,
    default: "Pending", // Pending | Approved | Rejected
  },

  memberPassword: String,
  memberActivatedAt: Date,
  shortlistedProfiles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
    },
  ],
  interestRequests: [interactionSchema],
  contactRevealRequests: [interactionSchema],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

submissionSchema.pre("save", async function () {
  if (!this.isModified("memberPassword") || !this.memberPassword) return;

  const salt = await bcrypt.genSalt(10);
  this.memberPassword = await bcrypt.hash(this.memberPassword, salt);
});

submissionSchema.methods.compareMemberPassword = function (enteredPassword) {
  if (!this.memberPassword) return false;
  return bcrypt.compare(enteredPassword, this.memberPassword);
};

module.exports = mongoose.model("Submission", submissionSchema);
