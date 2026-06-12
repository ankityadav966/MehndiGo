function ErrorResponse(message, error = {}) {
  return {
    success: false,
    message,
    data: {},
    error,
  };
}

module.exports = ErrorResponse;