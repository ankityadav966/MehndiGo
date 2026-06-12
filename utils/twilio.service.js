
const twilio =
  require("twilio");

const client =
  twilio(

    process.env
      .TWILIO_ACCOUNT_SID,

    process.env
      .TWILIO_AUTH_TOKEN
  );



async function sendOtp(
  phone,
  otp
) {

  // development mode

  console.log(
    "OTP IS =>",
    otp
  );



  // comment for testing

  return true;



  // production code

  // return await client
  //   .messages
  //   .create({

  //     body:
  //       `Your MehndiGo OTP is ${otp}`,

  //     from:
  //       process.env
  //       .TWILIO_PHONE_NUMBER,

  //     to: phone,
  //   });
}

module.exports = {
  sendOtp,
};
