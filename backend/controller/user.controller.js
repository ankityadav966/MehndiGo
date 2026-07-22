const UserService = require("../services/user.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function registerSendOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: registerSendOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.registerSendOtp(req.body);
    console.log("[AUTH] Final API Response: Registration OTP Sent Successfully");
    return res
      .status(200)
      .json(SuccessResponse("Registration OTP Sent Successfully", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function registerVerifyOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: registerVerifyOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.registerVerifyOtp(req.body);
    console.log("[AUTH] Final API Response: Account Created Successfully");
    return res.status(200).json(SuccessResponse("Account Created Successfully", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function sendOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: sendOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.sendOtp(req.body);
    console.log("[AUTH] Final API Response: OTP Sent Successfully");
    return res
      .status(200)
      .json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: verifyOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.verifyOtp(req.body);
    console.log("[AUTH] Final API Response: OTP Verified");
    return res.status(200).json(SuccessResponse("OTP Verified", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function login(req, res) {
  console.log("\n[AUTH] Incoming Request: login");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.login(req.body);
    console.log("[AUTH] Final API Response: OTP Sent Successfully");
    return res
      .status(200)
      .json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getArtists(req, res) {
  try {
    const response = await UserService.getArtists(req.query);
    return res.status(200).json(SuccessResponse("Artists fetched", response));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function getArtistsBY(req, res) {
  try {
    const response = await UserService.getListing(req.user.id, req.query);

    return res.status(200).json(SuccessResponse("Data fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getProfile(req, res) {
  try {
    const response = await UserService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Profile fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await UserService.updateProfile(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Profile updated", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function adminSendOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: adminSendOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.adminSendOtp(req.body);
    console.log("[AUTH] Final API Response: Admin OTP Sent Successfully");
    return res
      .status(200)
      .json(SuccessResponse("Admin OTP Sent Successfully", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function adminVerifyOtp(req, res) {
  console.log("\n[AUTH] Incoming Request: adminVerifyOtp");
  console.log("[AUTH] Request Body:", req.body);
  try {
    const response = await UserService.adminVerifyOtp(req.body);
    console.log("[AUTH] Final API Response: Admin OTP Verified");
    return res.status(200).json(SuccessResponse("Admin OTP Verified", response));
  } catch (error) {
    console.error("[AUTH] Final API Error:", error.message);
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  registerSendOtp,
  registerVerifyOtp,
  sendOtp,
  verifyOtp,
  getArtists,
  login,
  getArtistsBY,
  getProfile,
  updateProfile,
  adminSendOtp,
  adminVerifyOtp,
};
