const AuthService = require("../../services/auth.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function sendOtp(req, res) {
  try {
    const response = await AuthService.sendOtp(req.body);
    return res.status(200).json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyOtp(req, res) {
  try {
    const response = await AuthService.verifyOtp(req.body);
    return res.status(200).json(SuccessResponse("OTP Verified Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function register(req, res) {
  try {
    const response = await AuthService.register(req.body);
    return res.status(201).json(SuccessResponse("User Registered Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function login(req, res) {
  try {
    const response = await AuthService.login(req.body);
    return res.status(200).json(SuccessResponse("User Logged In Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function refreshToken(req, res) {
  try {
    const response = await AuthService.refresh(req.body);
    return res.status(200).json(SuccessResponse("Tokens Refreshed Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function logout(req, res) {
  try {
    // req.user comes from authentication middleware
    await AuthService.logout(req.user.id);
    return res.status(200).json(SuccessResponse("User Logged Out Successfully"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function getProfile(req, res) {
  try {
    const response = await AuthService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Profile Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await AuthService.updateProfile(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Profile Updated Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function sendEmailDispatch(req, res) {
  try {
    const response = await AuthService.sendEmailDispatch(req.body);
    return res.status(200).json(SuccessResponse("Email Dispatched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function changePassword(req, res) {
  try {
    const response = await AuthService.changePassword(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Password changed successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function deleteAccount(req, res) {
  try {
    const response = await AuthService.deleteAccount(req.user.id, req.body);
    return res.status(200).json(SuccessResponse("Account deleted successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  sendOtp,
  sendEmailDispatch,
  verifyOtp,
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
