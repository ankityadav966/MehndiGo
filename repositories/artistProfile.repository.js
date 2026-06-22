const db = require("../models");

const CrudRepository = require("./crud.repository");

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
  async getArtistDetails(id) {
    return await db.ArtistProfile.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"],
        },
        { model: db.Service, as: "services" },
        { model: db.Portfolio, as: "portfolio" },
        {
          model: db.AvailabilitySlot,
          as: "slots",
          where: { is_booked: false },
          required: false,
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
  async getArtists({ location, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    return await db.ArtistProfile.findAndCountAll({
      where: {
        verification_status: "APPROVED",
      },

      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"],
        },

        {
          model: db.Service,
          as: "services",
        },

        {
          model: db.Portfolio,
          as: "portfolio",
        },
      ],

      order: [
        [
          db.sequelize.literal(`
            CASE
              WHEN location = '${location}'
              THEN 0
              ELSE 1
            END
          `),
          "ASC",
        ],

        ["avg_rating", "DESC"],

        ["total_bookings", "DESC"],
      ],

      limit: Number(limit),

      offset: Number(offset),
    });
  }
}

module.exports = ArtistProfileRepository;
