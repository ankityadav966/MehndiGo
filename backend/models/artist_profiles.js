
"use strict";

const { Model } = require("sequelize");

module.exports = (
  sequelize,
  DataTypes
) => {
  class ArtistProfile extends Model {
    static associate(models) {

      ArtistProfile.belongsTo(
        models.User,
        {
          foreignKey: "user_id",
          as: "user",
        }
      );

      ArtistProfile.belongsTo(
        models.User,
        {
          foreignKey: "reviewed_by",
          as: "reviewer",
        }
      );

      ArtistProfile.hasMany(
        models.Service,
        {
          foreignKey: "artist_id",
          as: "services",
        }
      );

      ArtistProfile.hasMany(
        models.Portfolio,
        {
          foreignKey: "artist_id",
          as: "portfolio",
        }
      );

      ArtistProfile.hasMany(
        models.AvailabilitySlot,
        {
          foreignKey: "artist_id",
          as: "slots",
        }
      );

      ArtistProfile.hasMany(
        models.Review,
        {
          foreignKey: "artist_id",
          as: "reviews",
        }
      );
    }
  }

  ArtistProfile.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },

      bio: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      experience_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      home_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      salon_service: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      starting_price: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1500,
      },

      avg_rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      total_reviews: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      total_bookings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      aadhaar_front: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      aadhaar_back: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      selfie_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      verification_status: {
        type: DataTypes.ENUM(
          "PENDING",
          "APPROVED",
          "REJECTED"
        ),
        defaultValue: "PENDING",
      },

      rejection_reason: {
        type: DataTypes.TEXT,
      },
      dob: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      aadhaar_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      cover_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      languages: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
      },

      city: {
        type: DataTypes.STRING,
      },

      state: {
        type: DataTypes.STRING,
      },

      pincode: {
        type: DataTypes.STRING,
      },

      latitude: {
        type: DataTypes.DECIMAL(10, 8),
      },

      longitude: {
        type: DataTypes.DECIMAL(11, 8),
      },

      last_location_update: {
        type: DataTypes.DATE,
      },

      intro_video: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      portfolio_video: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      intro_video_thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      portfolio_video_thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      is_featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      featured_priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      working_days: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      },
      working_start_time: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "09:00",
      },
      working_end_time: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "20:00",
      },
      break_start_time: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "14:00",
      },
      break_end_time: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "15:00",
      },
      leave_dates: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      same_day_booking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      min_advance_hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
      },
      max_advance_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      max_bookings_per_day: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4,
      },
      pan_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      bank_account_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bank_ifsc: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bank_account_holder: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cancellation_count_30d: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      on_time_arrival_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 100.0,
      },
    },
    {
      sequelize,
      modelName: "ArtistProfile",
      tableName: "artist_profiles",
      timestamps: true,
      underscored: true,
    }
  );

  return ArtistProfile;
};