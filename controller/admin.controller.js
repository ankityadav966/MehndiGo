const AdminService = require("../services/admin.services");

const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function getAllUsers(req, res) {
  try {
    const response = await AdminService.getAllUsers();

    return res.status(200).json(SuccessResponse("Users fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

async function verifyArtist(req, res) {
  try {
    const response = await AdminService.verifyArtist(req.params.id, req.body);

    return res.status(200).json(SuccessResponse("Artist verified", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

// New controller functions for pending artists
async function getPendingArtists(req, res) {
  try {
    const response = await AdminService.getPendingArtists();
    return res
      .status(200)
      .json(SuccessResponse("Pending artists fetched", response));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function approveArtist(req, res) {
  try {
    await AdminService.approveArtist(req.params.id);
    return res.status(200).json(SuccessResponse("Artist approved"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}
async function rejectArtist(req, res) {
  try {
    await AdminService.rejectArtist(req.params.id, req.body.reason);
    return res.status(200).json(SuccessResponse("Artist rejected"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getAllUsers,
  verifyArtist,
  // New exports for pending artists
  getPendingArtists,
  approveArtist,
  rejectArtist,
};
