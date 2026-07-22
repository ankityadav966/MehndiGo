
const jwt = require("jsonwebtoken");



async function authenticate(
  req,
  res,
  next
) {

  try {
    const authHeader =
      req.headers.authorization;

    let token;
    if (authHeader) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {

      return res.status(401).json({

        success: false,

        message:
          "Token missing",
      });
    }

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
