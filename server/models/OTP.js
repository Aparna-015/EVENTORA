const mnongoose = require("mongoose");
const OTPSchema = new mnongoose.Schema({
  email: {
    type: String,
  },
  otp: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ["account_verification", "event_booking"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300,
  },
});
module.exports = mnongoose.model("OTP", OTPSchema);
