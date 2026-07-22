function ErrorResponse(message, error = {}) {
  let finalMessage = message;
  if (error && (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError")) {
    if (error.errors && error.errors.length > 0) {
      finalMessage = error.errors.map((e) => {
        if (e.type === "unique violation") {
          return `${e.path || 'Field'} is already registered with another account.`;
        }
        return e.message;
      }).join(", ");
    }
  } else if (message === "Validation error" && error && error.errors && error.errors.length > 0) {
    finalMessage = error.errors.map(e => e.message).join(", ");
  }

  return {
    success: false,
    message: finalMessage,
    data: {},
    error,
  };
}

module.exports = ErrorResponse;