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
      sort,
    } = query;

    const offset = (page - 1) * limit;

    const where = {
      verification_status: "APPROVED",
    };

    if (search) {
      where.bio = {
        [Op.iLike || Op.like]: `%${search}%`,
      };
    }

    let order = [["createdAt", "DESC"]];

    if (sort === "rating") {
      order = [["avg_rating", "DESC"]];
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
  
async getUsers({
  page = 1,
  limit = 10,
}) {

  const offset =
    (page - 1) * limit;

  const data =  await db.User
    .findAndCountAll({

      where: {
        role: "USER",
      },

      attributes: [
        "id",
        "name",
        "phone",
        "profile_image",
        "role",
      ],

      limit:
        Number(limit),

      offset:
        Number(offset),

      order: [
        ["id", "DESC"],
      ],
    });
    console.log(data)
    return data;
}

}

module.exports = UserRepository;
