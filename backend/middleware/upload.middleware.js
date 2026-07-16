const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "mehndigo",
    resource_type: "auto", // Auto-detects image vs video on Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov", "pdf", "mp3", "wav", "m4a", "aac", "3gp", "amr", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip"],
  }),
});

const upload = multer({
  storage,
});

module.exports = upload;
