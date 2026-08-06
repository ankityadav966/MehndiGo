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

function detectVideoFile(filePath, file, req) {
  if (file && file.mimetype && file.mimetype.startsWith("video/")) return true;
  if (file && file.originalname && /\.(mp4|mov|3gp|mkv|webm|avi|flv)$/i.test(file.originalname)) return true;
  if (req && (req.body?.type === "video" || req.body?.is_video === "true" || req.query?.is_video === "true")) return true;

  try {
    if (filePath && fs.existsSync(filePath)) {
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      const magic = buffer.toString("ascii", 4, 8);
      if (magic === "ftyp" || magic === "moov" || magic === "mdat") return true;
      const headerHex = buffer.toString("hex");
      if (headerHex.startsWith("1a45dfa3")) return true; // MKV / WebM
      if (buffer.toString("ascii", 0, 4) === "RIFF") return true; // AVI
    }
  } catch (e) {
    console.warn("[detectVideoFile] Magic byte inspection error:", e.message);
  }
  return false;
}

/**
 * Uploads a local file to Cloudinary using standard upload or chunked upload_large
 */
async function uploadLocalFileToCloudinary(filePath, file, req) {
  const isVideo = detectVideoFile(filePath, file, req);
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
    folder: "mehndigo/portfolio",
    resource_type,
  };

  if (resource_type === "image") {
    uploadOptions.allowed_formats = ["jpg", "jpeg", "png", "webp"];
  }

  return new Promise((resolve, reject) => {
    if (resource_type === "video" || resource_type === "raw") {
      console.log("[uploadLocalFileToCloudinary] Starting upload_large for VIDEO:", filePath);
      cloudinary.uploader.upload_large(filePath, {
        ...uploadOptions,
        chunk_size: 6000000, // 6MB chunks
      }, (error, result) => {
        if (error) {
          console.error("[uploadLocalFileToCloudinary] upload_large Error:", error);
          reject(error);
        } else {
          console.log("[CLOUDINARY UPLOAD RESPONSE]", {
            resource_type: result?.resource_type,
            format: result?.format,
            secure_url: result?.secure_url,
            public_id: result?.public_id,
            bytes: result?.bytes
          });
          resolve(result?.secure_url);
        }
      });
    } else {
      console.log("[uploadLocalFileToCloudinary] Starting standard upload for IMAGE:", filePath);
      cloudinary.uploader.upload(filePath, uploadOptions, (error, result) => {
        if (error) {
          console.error("[uploadLocalFileToCloudinary] upload Error:", error);
          reject(error);
        } else {
          console.log("[CLOUDINARY UPLOAD RESPONSE]", {
            resource_type: result?.resource_type,
            format: result?.format,
            secure_url: result?.secure_url,
            public_id: result?.public_id,
            bytes: result?.bytes
          });
          resolve(result?.secure_url);
        }
      });
    }
  });
}

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Safe wrapper to upload a file object and clean up its local disk file in finally block.
 * Falls back to local disk storage in /uploads if Cloudinary is unavailable or disabled.
 */
async function safeUploadAndCleanup(file, req) {
  if (!file || !file.path) return;
  const localPath = file.path;
  try {
    const secureUrl = await uploadLocalFileToCloudinary(localPath, file, req);
    file.path = secureUrl;
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch (err) {
    console.warn("[Multer Cloudinary Wrapper] Cloudinary upload failed (fallback to local server storage):", err.message);
    const fileName = path.basename(localPath);
    const destPath = path.join(uploadsDir, fileName);
    try {
      if (fs.existsSync(localPath)) {
        fs.renameSync(localPath, destPath);
      }
      file.path = `/uploads/${fileName}`;
    } catch (moveErr) {
      console.error("[Multer Cloudinary Wrapper] Fallback move error:", moveErr);
      file.path = `/uploads/${fileName}`;
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
          await safeUploadAndCleanup(req.file, req);
        }

        // 2. Process array of files (req.files as array)
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            await safeUploadAndCleanup(file, req);
          }
        }

        // 3. Process fields of files (req.files as object)
        if (req.files && !Array.isArray(req.files)) {
          for (const fieldName of Object.keys(req.files)) {
            const files = req.files[fieldName];
            if (Array.isArray(files)) {
              for (const file of files) {
                await safeUploadAndCleanup(file, req);
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
