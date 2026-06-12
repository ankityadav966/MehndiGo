const db = require("../models");

const CrudRepository = require("./crud.repository");

const { Op } = require("sequelize");

class UserRepository extends CrudRepository {
  constructor() {
    super(db.User);
  }

  async getArtists(query) {
    const {
      page = 1,

      limit = 10,

      search = "",

      category,

      min_price,

      max_price,

      sort,
    } = query;

    const offset = (page - 1) * limit;

    const where = {
      verification_status: "APPROVED",
    };

    // search

    if (search) {
      where.bio = {
        [Op.iLike]: `%${search}%`,
      };
    }

    // price filter

    if (min_price && max_price) {
      where.price_start = {
        [Op.between]: [min_price, max_price],
      };
    }

    // sorting

    let order = [["created_at", "DESC"]];

    if (sort === "rating") {
      order = [["avg_rating", "DESC"]];
    }

    if (sort === "price_low") {
      order = [["price_start", "ASC"]];
    }

    return await db.ArtistProfile.findAndCountAll({
      where,

      limit: Number(limit),

      offset: Number(offset),

      order,

      include: [
        {
          model: db.User,

          as: "user",

          attributes: ["id", "name", "phone", "profile_image"],
        },

        {
          model: db.Service,

          as: "services",

          where: category
            ? {
                category,
              }
            : undefined,

          required: false,
        },
      ],
    });
  }

  async getArtistDetails(id) {
    return await db.ArtistProfile.findOne({
      where: {
        id,
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

        {
          model: db.Review,

          as: "reviews",

          include: [
            {
              model: db.User,

              as: "user",

              attributes: ["id", "name"],
            },
          ],
        },

        {
          model: db.AvailabilitySlot,

          as: "slots",

          where: {
            is_booked: false,
          },

          required: false,
        },
      ],
    });
  }
}

module.exports = UserRepository;
