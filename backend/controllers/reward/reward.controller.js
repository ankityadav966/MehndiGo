const rewardService = require("../../services/reward.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

async function listRewards(req, res) {
  try {
    const list = await rewardService.listRewards();
    return res.status(200).json(SuccessResponse("Rewards list retrieved successfully", list));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

async function claimReward(req, res) {
  try {
    const userId = req.user.id;
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json(ErrorResponse("Reward ID is required"));
    }

    const claimResult = await rewardService.claimReward(userId, rewardId);
    return res.status(200).json(SuccessResponse("Reward claimed successfully", claimResult));
  } catch (error) {
    return res.status(error.statusCode || 500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  listRewards,
  claimReward
};
