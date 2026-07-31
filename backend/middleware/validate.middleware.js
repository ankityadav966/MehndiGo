function validateBody(requiredFields) {
  return (req, res, next) => {
    // If email is required but phone or identifier is provided, alias it to email
    if (requiredFields.includes("email") && (!req.body.email || String(req.body.email).trim() === "")) {
      if (req.body.phone) req.body.email = req.body.phone;
      else if (req.body.identifier) req.body.email = req.body.identifier;
      else if (req.body.loginValue) req.body.email = req.body.loginValue;
    }

    const missing = [];
    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        String(req.body[field]).trim() === ""
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

module.exports = {
  validateBody,
};
