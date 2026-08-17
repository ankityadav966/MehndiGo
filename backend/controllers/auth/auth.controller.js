const AuthService = require("../../services/auth.services");
const UserService = require("../../services/user.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function checkEmail(req, res) {
  try {
    const response = await UserService.checkEmail(req.body);
    return res.status(200).json(SuccessResponse("Email checked successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function sendOtp(req, res) {
  try {
    const response = await UserService.sendOtp(req.body);
    return res.status(200).json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyOtp(req, res) {
  try {
    const response = await UserService.verifyOtp(req.body);
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
    const response = await UserService.getProfile(req.user.id);
    return res.status(200).json(SuccessResponse("Profile Fetched Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function updateProfile(req, res) {
  try {
    const response = await UserService.updateProfile(req.user.id, req.body);
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

module.exports = {
  checkEmail,
  sendOtp,
  sendEmailDispatch,
  verifyOtp,
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
};
