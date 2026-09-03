const db = require("../models");
const CrudRepository = require("./crud.repository");
const { Op } = require("sequelize");

class ArtistProfileRepository extends CrudRepository {
  constructor() {
    super(db.ArtistProfile);
  }

  async createProfile(data) {
    const profile = await db.ArtistProfile.create(data);

    return await db.ArtistProfile.findByPk(
      profile.id,

      {
        include: [
          {
            model: db.User,

            as: "user",

            attributes: [
              "id",

              "name",

              "phone",

              "email",

              "role",

              "profile_image",
            ],
          },
        ],
      },
    );
  }

  async getArtistByUserId(userId) {
    return await db.ArtistProfile.findOne({
      where: {
        user_id: userId,
      },

      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"],
        },
      ],
    });
  }
  async getArtistDetails(userId) {

  return await db.ArtistProfile.findOne({

    where: {
      user_id: userId,
    },

    include: [

      {
        model: db.User,
        as: "user",
        attributes: [
          "id",
          "name",
          "phone",
          "profile_image",
          "email"
        ],
      },

      {
        model: db.Service,
        as: "services",
      },

      {
        model: db.Portfolio,
        as: "portfolio",
        required: false,
      },

      {
        model: db.AvailabilitySlot,
        as: "slots",
        required: false,
      },

      {
        model: db.Review,
        as: "reviews",
        required: false,

        include: [
          {
            model: db.User,
            as: "user",
            attributes: [
              "id",
              "name",
              "profile_image"
            ],
          },
        ],
      },
    ],
  });
}

  async getPendingArtists() {
    return await db.ArtistProfile.findAll({
      where: { verification_status: "PENDING" },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }
  async getArtistById(id) {
    let profile = await db.ArtistProfile.findByPk(id, {
      include: [{ model: db.User, as: "user" }],
    });
    if (!profile) {
      profile = await db.ArtistProfile.findOne({
        where: { user_id: id },
        include: [{ model: db.User, as: "user" }],
      });
    }
    return profile;
  }
  async getArtists({ latitude, longitude, radius, search, sort, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    let attributes = {
      include: []
    };
    let order = [
      ["avg_rating", "DESC"],
      ["total_bookings", "DESC"]
    ];
    let where = {
      verification_status: "APPROVED",
    };

    if (search) {
      const isPostgres = db.sequelize.getDialect() === "postgres";
      const likeOp = isPostgres ? Op.iLike : Op.like;
      const likeKw = isPostgres ? "ILIKE" : "LIKE";
      const searchPattern = `%${search}%`;
      const safePattern = `%${String(search).replace(/'/g, "''")}%`;
      where[Op.or] = [
        { bio: { [likeOp]: searchPattern } },
        { city: { [likeOp]: searchPattern } },
        { state: { [likeOp]: searchPattern } },
        { pincode: { [likeOp]: searchPattern } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM ${isPostgres ? '"Users"' : 'Users'} AS u 
          WHERE u.id = ${isPostgres ? '"ArtistProfile"' : 'ArtistProfile'}.user_id 
          AND u.name ${likeKw} '${safePattern}'
        )`),
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM ${isPostgres ? '"Services"' : 'Services'} AS s 
          WHERE s.artist_id = ${isPostgres ? '"ArtistProfile"' : 'ArtistProfile'}.id 
          AND (s.specialization_name ${likeKw} '${safePattern}' OR s.category ${likeKw} '${safePattern}')
        )`)
      ];
    }

    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      const distanceSql = `(6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(${lat})) * cos(radians(COALESCE(latitude::double precision, ${lat}))) * cos(radians(COALESCE(longitude::double precision, ${lng})) - radians(${lng})) + sin(radians(${lat})) * sin(radians(COALESCE(latitude::double precision, ${lat})))))))`;
      
      attributes.include.push([db.sequelize.literal(distanceSql), "distance"]);
      
      if (radius) {
        where[Op.and] = [
          db.sequelize.where(db.sequelize.literal(distanceSql), "<=", db.sequelize.literal(`LEAST(${Number(radius)}, COALESCE("ArtistProfile"."service_radius", 9999))`))
        ];
      } else {
        where[Op.and] = [
          db.sequelize.where(db.sequelize.literal(distanceSql), "<=", db.sequelize.literal(`COALESCE("ArtistProfile"."service_radius", 9999)`))
        ];
      }

      if (sort === "distance" || sort === "nearest") {
        order = [
          [db.sequelize.literal(distanceSql), "ASC"],
          ["avg_rating", "DESC"]
        ];
      } else if (sort === "rating" || sort === "highest_rated") {
        order = [
          ["avg_rating", "DESC"],
          ["total_reviews", "DESC"]
        ];
      } else if (sort === "latest") {
        order = [["createdAt", "DESC"]];
      } else {
        order = [
          ["avg_rating", "DESC"],
          [db.sequelize.literal(distanceSql), "ASC"],
          ["total_bookings", "DESC"]
        ];
      }
    } else {
      if (sort === "rating" || sort === "highest_rated") {
        order = [["avg_rating", "DESC"], ["total_reviews", "DESC"]];
      } else if (sort === "latest") {
        order = [["createdAt", "DESC"]];
      } else if (sort === "trending") {
        order = [["total_bookings", "DESC"], ["avg_rating", "DESC"]];
      }
    }

    return await db.ArtistProfile.findAndCountAll({
      where,
      attributes,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"],
        },
        {
          model: db.Service,
          as: "services",
          required: false,
        },
        {
          model: db.Portfolio,
          as: "portfolio",
          required: false,
        },
      ],
      order,
      limit: Number(limit),
      offset: Number(offset),
    });
  }
}

module.exports = ArtistProfileRepository;
