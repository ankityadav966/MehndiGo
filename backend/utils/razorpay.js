const Razorpay = require("razorpay");

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_Sz3Oa0GdrWOAhW";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "HP1il2MXkp7DShPdjh19Gp1S";

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

module.exports = razorpay;
