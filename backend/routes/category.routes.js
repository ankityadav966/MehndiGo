const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/category.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// Public category endpoints
router.get("/", CategoryController.getCategories);

// Protected admin category CRUD endpoints
router.get("/admin/list", authenticate, authorize("ADMIN"), CategoryController.adminGetCategories);
router.post("/admin", authenticate, authorize("ADMIN"), upload.single("image"), CategoryController.adminCreateCategory);
router.put("/admin/:id", authenticate, authorize("ADMIN"), upload.single("image"), CategoryController.adminUpdateCategory);
router.delete("/admin/:id", authenticate, authorize("ADMIN"), CategoryController.adminDeleteCategory);
router.patch("/admin/:id/status", authenticate, authorize("ADMIN"), CategoryController.adminToggleStatus);

module.exports = router;
