const express = require("express");
const router = express.Router();
const SecurityController = require("../controllers/security/security.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { apiRateLimiter } = require("../middleware/security.middleware");

router.post("/report", apiRateLimiter(10, 60000), SecurityController.reportIncident);
router.get("/logs", authenticate, authorize("ADMIN"), SecurityController.getSecurityLogs);
router.get("/audit", authenticate, authorize("ADMIN"), SecurityController.getAuditLogs);
router.post("/block-user", authenticate, authorize("ADMIN"), SecurityController.blockUser);
router.post("/unblock-user", authenticate, authorize("ADMIN"), SecurityController.unblockUser);
router.get("/health", authenticate, authorize("ADMIN"), SecurityController.getHealth);

module.exports = router;
