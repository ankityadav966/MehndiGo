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
    return await db.ArtistProfile.findByPk(id, {
      include: [{ model: db.User, as: "user" }],
    });
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
      const searchPattern = `%${search}%`;
      where[Op.or] = [
        { bio: { [Op.iLike]: searchPattern } },
        { city: { [Op.iLike]: searchPattern } },
        { state: { [Op.iLike]: searchPattern } },
        { pincode: { [Op.iLike]: searchPattern } }
      ];
    }

    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      
      where.latitude = { [Op.ne]: null };
      where.longitude = { [Op.ne]: null };

      const distanceSql = `(6371 * acos(cos(radians(${lat})) * cos(radians(latitude::double precision)) * cos(radians(longitude::double precision) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude::double precision))))`;
      
      attributes.include.push([db.sequelize.literal(distanceSql), "distance"]);
      
      if (radius) {
        where[Op.and] = [
          db.sequelize.where(db.sequelize.literal(distanceSql), "<=", Number(radius))
        ];
      }

      if (sort === "distance") {
        order = [
          [db.sequelize.literal(distanceSql), "ASC"],
          ["avg_rating", "DESC"]
        ];
      } else {
        order = [
          ["avg_rating", "DESC"],
          [db.sequelize.literal(distanceSql), "ASC"],
          ["total_bookings", "DESC"]
        ];
      }
    } else {
      if (sort === "rating") {
        order = [["avg_rating", "DESC"]];
      } else if (sort === "latest") {
        order = [["createdAt", "DESC"]];
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
