const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../models");
const { JWT_SECRET } = require("../config/env");

async function secureUploadsHandler(req, res, next) {
  const filename = path.basename(req.path);
  const filePath = path.join(__dirname, "../uploads", filename);

  // If file doesn't exist, return 404
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  // Extract token from header or query param
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required to access uploaded identity and KYC documents"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET || "Live credentials");
    req.user = decoded;

    // Admins have full access to review all KYC documents
    if (decoded.role === "ADMIN" || decoded.role === "SUPER_ADMIN") {
      return res.sendFile(filePath);
    }

    // Artists can only access their own KYC and uploaded files
    if (decoded.role === "ARTIST") {
      const artist = await db.ArtistProfile.findOne({ where: { user_id: decoded.id } });
      if (!artist) {
        return res.status(403).json({ success: false, message: "Artist profile not found" });
      }

      // Check if this file belongs to this artist's profile documents
      const artistDocs = [
        artist.aadhaar_front,
        artist.aadhaar_back,
        artist.selfie_image,
        artist.cover_image,
        artist.intro_video,
        artist.portfolio_video
      ].filter(Boolean).map(d => path.basename(d));

      if (artistDocs.includes(filename)) {
        return res.sendFile(filePath);
      }

      // Check if it's a portfolio or service image belonging to this artist
      const isPortfolio = await db.Portfolio.findOne({
        where: { artist_id: artist.id, image_url: { [db.Sequelize.Op.like]: `%${filename}%` } }
      });
      if (isPortfolio) return res.sendFile(filePath);

      const isService = await db.Service.findOne({
        where: { artist_id: artist.id, service_image: { [db.Sequelize.Op.like]: `%${filename}%` } }
      });
      if (isService) return res.sendFile(filePath);

      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to access another artist's document"
      });
    }

    // Customers and unauthorized roles are forbidden
    return res.status(403).json({
      success: false,
      message: "Forbidden: Access denied to uploaded documents"
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authorization token"
    });
  }
}

module.exports = { secureUploadsHandler };
