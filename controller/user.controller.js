const UserService = require("../services/user.services");
const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function register(req, res) {
  try {
    const response = await UserService.register(req.body);
    return res.status(200).json(SuccessResponse("Registration OTP Sent Successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyEmailOtp(req, res) {
  try {
    const response = await UserService.verifyEmailOtp(req.body);
    return res.status(200).json(SuccessResponse("Account Created Successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function login(req, res) {
  try {
    const response = await UserService.login(req.body);
    return res.status(200).json(SuccessResponse("Login Successful", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function forgotPassword(req, res) {
  try {
    const response = await UserService.forgotPassword(req.body);
    return res.status(200).json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function verifyForgotPasswordOtp(req, res) {
  try {
    const response = await UserService.verifyForgotPasswordOtp(req.body);
    return res.status(200).json(SuccessResponse("OTP Verified", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function resetPassword(req, res) {
  try {
    const response = await UserService.resetPassword(req.body);
    return res.status(200).json(SuccessResponse("Password Reset Successful", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function resendOtp(req, res) {
  try {
    const response = await UserService.resendOtp(req.body);
    return res.status(200).json(SuccessResponse("OTP Resent Successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminSendOtp(req, res) {
  try {
    const response = await UserService.adminSendOtp(req.body);
    return res.status(200).json(SuccessResponse("Admin OTP Sent Successfully", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function adminVerifyOtp(req, res) {
  try {
    const response = await UserService.adminVerifyOtp(req.body);
    return res.status(200).json(SuccessResponse("Admin OTP Verified", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
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
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function getProfile(req, res) {
  try {
    const response = await UserService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Profile fetched", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await UserService.updateProfile(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Profile updated", response));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  register,
  verifyEmailOtp,
  login,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  resendOtp,
  adminSendOtp,
  adminVerifyOtp,
  getArtists,
  getArtistsBY,
  getProfile,
  updateProfile,
};
