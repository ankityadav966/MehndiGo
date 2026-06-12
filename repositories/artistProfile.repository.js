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

  async getArtists({ page = 1, limit = 10, search = "" }) {
    const offset = (page - 1) * limit;
    const where = { verification_status: "APPROVED" };
    if (search) {
      where.bio = { [Op.iLike]: `%${search}%` };
    }
    const artists = await db.ArtistProfile.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return artists;
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
}

module.exports = ArtistProfileRepository;
