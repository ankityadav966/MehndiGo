"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      Booking.belongsTo(models.ArtistProfile, {
        foreignKey: "artist_id",
        as: "artist",
      });

      Booking.belongsTo(models.Service, {
        foreignKey: "service_id",
        as: "service",
      });

      Booking.belongsTo(models.AvailabilitySlot, {
        foreignKey: "slot_id",
        as: "slot",
      });

      Booking.hasMany(models.BookingStatusHistory, {
        foreignKey: "booking_id",
        as: "status_history"
      });

      Booking.hasOne(models.Invoice, {
        foreignKey: "booking_id",
        as: "invoice"
      });

      Booking.hasMany(models.Refund, {
        foreignKey: "booking_id",
        as: "refunds"
      });

      Booking.hasMany(models.Settlement, {
        foreignKey: "booking_id",
        as: "settlements"
      });
    }
  }

  Booking.init(
    {
      booking_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      artist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      slot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      advance_paid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      remaining_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      booking_status: {
        type: DataTypes.ENUM(
          "PENDING",
          "CONFIRMED",
          "COMPLETED",
          "CANCELLED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      payment_status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PARTIAL",
          "PAID",
          "FAILED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      detailed_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PENDING",
      },
      travel_charges: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      offer_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      coupon_discount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      platform_fee: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      gst: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      final_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      coupon_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reschedule_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reschedule_time: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      landmark: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "Bookings",
      timestamps: true,
      underscored: true,
      hooks: {
        afterUpdate: async (booking) => {
          try {
            const db = require("./index");

            // 1. Log coupon usage when paid
            if (
              booking.payment_status === "PAID" &&
              booking.coupon_code &&
              booking.changed("payment_status")
            ) {
              const coupon = await db.Coupon.findOne({
                where: { code: booking.coupon_code }
              });
              if (coupon) {
                const alreadyLogged = await db.CouponUsage.findOne({
                  where: { booking_id: booking.id }
                });
                if (!alreadyLogged) {
                  const couponService = require("../services/coupon.services");
                  await couponService.logCouponUsage(booking.user_id, coupon.id, booking.id);
                  console.log(`[CouponHook] Logged usage for coupon ${booking.coupon_code} on booking #${booking.booking_code}`);
                }
              }
            }

            // 2. Process referral milestone rewards when booking status is marked COMPLETED
            if (
              booking.booking_status === "COMPLETED" &&
              booking.changed("booking_status")
            ) {
              const referralService = require("../services/referral.services");
              await referralService.verifyAndRewardReferral(booking.user_id, booking.id);
              console.log(`[ReferralHook] Checked referral milestones for user ${booking.user_id} on completed booking #${booking.booking_code}`);
            }

          } catch (err) {
            console.error("Error in Booking afterUpdate hook:", err.message);
          }
        }
      }
    }
  );

  return Booking;
};