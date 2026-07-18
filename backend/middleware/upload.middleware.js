const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// Ensure temp_uploads directory exists inside the backend directory
const tempDir = path.join(__dirname, "../temp_uploads");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure Multer local disk storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const localUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
});

/**
 * Uploads a local file to Cloudinary using standard upload or chunked upload_large
 */
async function uploadLocalFileToCloudinary(filePath, file) {
  const isVideo = file.mimetype.startsWith("video/") || 
                  /\.(mp4|mov|3gp|mkv)$/i.test(file.originalname);
  const isAudio = file.mimetype.startsWith("audio/") || 
                  /\.(mp3|wav|m4a|aac|amr)$/i.test(file.originalname);
  const isRaw = file.mimetype === "application/pdf" || 
                /\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(file.originalname);

  let resource_type = "image";
  if (isVideo || isAudio) {
    resource_type = "video";
  } else if (isRaw) {
    resource_type = "raw";
  }

  const uploadOptions = {
    folder: "mehndigo",
    resource_type,
  };

  if (resource_type === "image") {
    uploadOptions.allowed_formats = ["jpg", "jpeg", "png", "webp"];
  }

  return new Promise((resolve, reject) => {
    if (resource_type === "video" || resource_type === "raw") {
      console.log("[uploadLocalFileToCloudinary] Starting upload_large for:", filePath);
      cloudinary.uploader.upload_large(filePath, {
        ...uploadOptions,
        chunk_size: 6000000, // 6MB chunks
      }, (error, result) => {
        if (error) {
          console.error("[uploadLocalFileToCloudinary] upload_large Error:", error);
          reject(error);
        } else {
          console.log("[uploadLocalFileToCloudinary] upload_large secure_url:", result?.secure_url);
          resolve(result?.secure_url);
        }
      });
    } else {
      console.log("[uploadLocalFileToCloudinary] Starting standard upload for:", filePath);
      cloudinary.uploader.upload(filePath, uploadOptions, (error, result) => {
        if (error) {
          console.error("[uploadLocalFileToCloudinary] upload Error:", error);
          reject(error);
        } else {
          console.log("[uploadLocalFileToCloudinary] upload secure_url:", result?.secure_url);
          resolve(result?.secure_url);
        }
      });
    }
  });
}

/**
 * Safe wrapper to upload a file object and clean up its local disk file in finally block
 */
async function safeUploadAndCleanup(file) {
  if (!file || !file.path) return;
  const localPath = file.path;
  try {
    const secureUrl = await uploadLocalFileToCloudinary(localPath, file);
    // Replace the local file path with the Cloudinary secure URL
    file.path = secureUrl;
  } finally {
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (e) {
      console.error("[Multer Cloudinary Wrapper] Cleanup Error:", e);
    }
  }
}

function checkFileSizeLimit(file) {
  if (!file) return null;
  const isVideo = file.mimetype.startsWith("video/") || 
                  /\.(mp4|mov|3gp|mkv)$/i.test(file.originalname);
  const maxLimit = isVideo ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxLimit) {
    const error = new Error(`File size too large. Got ${file.size}. Maximum is ${maxLimit}.`);
    error.statusCode = 400;
    return error;
  }
  return null;
}

/**
 * Higher-order middleware function to intercept Multer upload, upload files to Cloudinary, and clean up disk
 */
function cloudinaryUploadWrapper(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      console.log("[Multer Interceptor log]:", {
        hasFile: !!req.file,
        fileInfo: req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, size: req.file.size } : null,
        hasFiles: !!req.files,
        filesKeys: req.files ? Object.keys(req.files) : null,
        bodyKeys: Object.keys(req.body || {})
      });

      if (err) {
        return next(err);
      }

      try {
        if (req.file) {
          const limitErr = checkFileSizeLimit(req.file);
          if (limitErr) throw limitErr;
        }

        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            const limitErr = checkFileSizeLimit(file);
            if (limitErr) throw limitErr;
          }
        }

        if (req.files && !Array.isArray(req.files)) {
          for (const fieldName of Object.keys(req.files)) {
            const files = req.files[fieldName];
            if (Array.isArray(files)) {
              for (const file of files) {
                const limitErr = checkFileSizeLimit(file);
                if (limitErr) throw limitErr;
              }
            }
          }
        }

        // 1. Process single file (req.file)
        if (req.file) {
          await safeUploadAndCleanup(req.file);
        }

        // 2. Process array of files (req.files as array)
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            await safeUploadAndCleanup(file);
          }
        }

        // 3. Process fields of files (req.files as object)
        if (req.files && !Array.isArray(req.files)) {
          for (const fieldName of Object.keys(req.files)) {
            const files = req.files[fieldName];
            if (Array.isArray(files)) {
              for (const file of files) {
                await safeUploadAndCleanup(file);
              }
            }
          }
        }

        next();
      } catch (uploadError) {
        console.error("[Multer Cloudinary Wrapper] Upload Error:", uploadError);

        // Emergency cleanup of all uploaded files in case of upload failure
        try {
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          if (Array.isArray(req.files)) {
            for (const file of req.files) {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            }
          }
          if (req.files && !Array.isArray(req.files)) {
            for (const fieldName of Object.keys(req.files)) {
              const files = req.files[fieldName];
              if (Array.isArray(files)) {
                for (const file of files) {
                  if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                }
              }
            }
          }
        } catch (cleanupErr) {
          console.error("[Multer Cloudinary Wrapper] Emergency Cleanup Error:", cleanupErr);
        }

        next(uploadError);
      }
    });
  };
}

// Expose standard Multer-like methods but wrapped with Cloudinary upload & disk cleanup logic
const upload = {
  single: (fieldName) => cloudinaryUploadWrapper(localUpload.single(fieldName)),
  array: (fieldName, maxCount) => cloudinaryUploadWrapper(localUpload.array(fieldName, maxCount)),
  fields: (fieldsArray) => cloudinaryUploadWrapper(localUpload.fields(fieldsArray)),
};

module.exports = upload;
