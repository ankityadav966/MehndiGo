const express = require("express");

const router = express.Router();

const AdminController = require("../../controller/admin.controller");
const { authorize } = require("../../middleware/role.middleware");
const { authenticate } = require("../../middleware/auth.middleware");

router.get("/users", authenticate, authorize("ADMIN"), AdminController.getAllUsers);
router.get("/artists", authenticate, authorize("ADMIN"), AdminController.getAllArtists);
router.get("/stats", authenticate, authorize("ADMIN"), AdminController.getStats);
router.get("/bookings", authenticate, authorize("ADMIN"), AdminController.getAllBookings);
router.get("/payments", authenticate, authorize("ADMIN"), AdminController.getAllPayments);
router.get("/notifications", authenticate, authorize("ADMIN"), AdminController.getAllNotifications);
router.post("/notifications", authenticate, authorize("ADMIN"), AdminController.sendSystemNotification);
router.get("/chats", authenticate, authorize("ADMIN"), AdminController.getAllMessages);

router.put("/artist/:id/verify", authenticate, authorize("ADMIN"), AdminController.verifyArtist);

// New routes for pending artists
router.get(
  "/pending-artists",
  authenticate,
  authorize("ADMIN"),
  AdminController.getPendingArtists,
);
router.patch(
  "/artist/:id/approve",
  authenticate,
  authorize("ADMIN"),
  AdminController.approveArtist,
);
router.patch(
  "/artist/:id/reject",
  authenticate,
  authorize("ADMIN"),
  AdminController.rejectArtist,
);
router.patch(
  "/artist/:id/suspend",
  authenticate,
  authorize("ADMIN"),
  AdminController.suspendArtist,
);
router.patch(
  "/artist/:id/reactivate",
  authenticate,
  authorize("ADMIN"),
  AdminController.reactivateArtist,
);

// Coupons Management
const CouponController = require("../../controllers/coupon/coupon.controller");
router.get("/coupons", authenticate, authorize("ADMIN"), CouponController.adminGetCoupons);
router.post("/coupon", authenticate, authorize("ADMIN"), CouponController.adminCreate);
router.put("/coupon/:id", authenticate, authorize("ADMIN"), CouponController.adminUpdate);
router.delete("/coupon/:id", authenticate, authorize("ADMIN"), CouponController.adminDelete);

// Referral Campaign & Analytics Management
const ReferralController = require("../../controllers/referral/referral.controller");
router.get("/referral/campaigns", authenticate, authorize("ADMIN"), ReferralController.adminGetCampaigns);
router.post("/referral/campaign", authenticate, authorize("ADMIN"), ReferralController.adminCreateCampaign);
router.get("/referral/analytics", authenticate, authorize("ADMIN"), ReferralController.adminGetAnalytics);
router.get("/referral/config", authenticate, authorize("ADMIN"), ReferralController.adminGetConfig);
router.post("/referral/config", authenticate, authorize("ADMIN"), ReferralController.adminUpdateConfig);

// Withdrawal Requests Management
router.get("/withdrawals", authenticate, authorize("ADMIN"), AdminController.getAllWithdrawals);
router.patch("/withdraw/:id/approve", authenticate, authorize("ADMIN"), AdminController.approveWithdrawal);
router.patch("/withdraw/:id/reject", authenticate, authorize("ADMIN"), AdminController.rejectWithdrawal);

// Commission Wallet analytics & logs
router.get("/wallet/summary", authenticate, authorize("ADMIN"), AdminController.getWalletSummary);
router.get("/wallet/commission-history", authenticate, authorize("ADMIN"), AdminController.getCommissionHistory);
router.get("/wallet/dashboard-summary", authenticate, authorize("ADMIN"), AdminController.getDashboardSummary);
router.get("/wallet/transaction/:id", authenticate, authorize("ADMIN"), AdminController.getWalletTransactionDetails);

// Review Moderation
router.get("/reviews", authenticate, authorize("ADMIN"), AdminController.getReviews);
router.patch("/review/:id/approve", authenticate, authorize("ADMIN"), AdminController.approveReview);
router.patch("/review/:id/reject", authenticate, authorize("ADMIN"), AdminController.rejectReview);

// Support Tickets & Disputes
router.get("/support/tickets", authenticate, authorize("ADMIN"), AdminController.getSupportTickets);
router.get("/support/tickets/:id", authenticate, authorize("ADMIN"), AdminController.getSupportTicketDetails);
router.put("/support/tickets/:id/status", authenticate, authorize("ADMIN"), AdminController.updateTicketStatus);
router.post("/support/tickets/:id/reply", authenticate, authorize("ADMIN"), AdminController.replySupportTicket);

module.exports = router;
