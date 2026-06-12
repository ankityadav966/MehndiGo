function SuccessResponse(message, data = {}) {
  return {
    success: true,
    message,
    data,
    error: {},
  };
}

module.exports = SuccessResponse;