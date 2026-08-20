function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Missing required fields: ${missing.join(", ")}`,
      });
    }
    next();
  };
}

function validateAtLeastOne(fields) {
  return (req, res, next) => {
    const hasAtLeastOne = fields.some(
      (field) =>
        req.body[field] !== undefined &&
        req.body[field] !== null &&
        String(req.body[field]).trim() !== ""
    );
    if (!hasAtLeastOne) {
      return res.status(400).json({
        success: false,
        message: `Validation error: At least one of the following is required: ${fields.join(", ")}`,
      });
    }
    next();
  };
}

module.exports = {
  validateBody,
  validateAtLeastOne,
};
