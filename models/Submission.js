const mongoose = require("mongoose");

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
  gender: String,
  religion: String,
  city: String,

  photo: String,     // photo file path
  biodata: String,   // pdf file path

  // ✅ NEW FIELD
  status: {
    type: String,
    default: "Pending", // Pending | Approved | Rejected
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Submission", submissionSchema);
