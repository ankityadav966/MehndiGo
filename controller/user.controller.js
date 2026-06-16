const UserService = require("../services/user.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function sendOtp(req, res) {
  try {
    const response = await UserService.sendOtp(req.body);

    return res
      .status(200)
      .json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyOtp(req, res) {
  try {
    const response = await UserService.verifyOtp(req.body);

    return res.status(200).json(SuccessResponse("OTP Verified", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function login(req, res) {
  try {
    const response = await UserService.login(req.body);

    return res
      .status(200)
      .json(SuccessResponse("OTP Sent Successfully", response));
  } catch (error) {
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

module.exports = {
  sendOtp,
  verifyOtp,
  getArtists,
  login,
};
