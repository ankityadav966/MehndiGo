const db = require("../models");

const CrudRepository = require("./crud.repository");

const { Op } = require("sequelize");

class AvailabilitySlotRepository extends CrudRepository {
  constructor() {
    super(db.AvailabilitySlot);
  }

  async createSlot(data) {
    const slot = await db.AvailabilitySlot.create(data);

    return await db.AvailabilitySlot.findByPk(
      slot.id,

      {
        include: [
          {
            model: db.ArtistProfile,

            as: "artist",

            include: [
              {
                model: db.User,

                as: "user",

                attributes: ["id", "name", "phone"],
              },
            ],
          },
        ],
      },
    );
  }

  async findArtistSlots(artist_id) {
  return await db.AvailabilitySlot.findAll({
    where: {
      artist_id,
    },

    order: [
      ["start_time", "DESC"],
    ],
  });
}
  
  async checkOverlap(
    artist_id,
    start_time,
    end_time
  ) {
    return await db.AvailabilitySlot.findOne({
      where: {
        artist_id,
        start_time: {
          [Op.lt]: end_time,
        },
        end_time: {
          [Op.gt]: start_time,
        },
      },
    });
  }

}

module.exports = AvailabilitySlotRepository;
