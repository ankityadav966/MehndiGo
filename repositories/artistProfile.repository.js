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

  async getArtistByUserId(
  userId
) {

  return await db.ArtistProfile
    .findOne({

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
          ],
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
}

module.exports = ArtistProfileRepository;
