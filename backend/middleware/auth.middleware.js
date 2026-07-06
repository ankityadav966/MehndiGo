
const jwt = require("jsonwebtoken");



async function authenticate(
  req,
  res,
  next
) {

  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({

        success: false,

        message:
          "Token missing",
      });
    }

    // Bearer TOKEN

    const token =
      authHeader.split(" ")[1];

    const decoded =
      jwt.verify(

        token,

        process.env.JWT_SECRET || "Live credentials"
      );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({

      success: false,

      message:
        "Invalid token",
    });
  }
}

module.exports = {
  authenticate,
};
