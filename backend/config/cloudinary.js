const cloudinary =
  require("cloudinary")
    .v2;
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dair21jov",
  api_key: process.env.CLOUDINARY_API_KEY || "344422783583887",
  api_secret: process.env.CLOUDINARY_API_SECRET || "KxOubI4_DlRLsEtkP360SLlwJNg",
});
console.log("Cloudinary Config:", cloudinary.config());
module.exports =
  cloudinary;