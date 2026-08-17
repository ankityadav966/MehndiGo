
const db =
  require("../models");

const CrudRepository =
  require("./crud.repository");



class BookingRepository
  extends CrudRepository {

  constructor() {

    super(
      db.Booking
    );
  }



  // create booking

  async createBooking(
    data
  ) {

    const booking =
      await db.Booking
        .create(data);

    return await db
      .Booking
      .findByPk(

        booking.id,

        {

          include: [

            {
              model:
                db.User,

              as: "user",

              attributes: [

                "id",

                "name",

                "phone",
              ],
            },



            {
              model:
                db.ArtistProfile,

              as: "artist",

              include: [

                {
                  model:
                    db.User,

                  as: "user",

                  attributes: [

                    "id",

                    "name",

                    "phone",
                  ],
                },
              ],
            },



            {
              model:
                db.Service,

              as: "service",
            },



            {
              model:
                db.AvailabilitySlot,

              as: "slot",
            },
          ],
        }
      );
  }



  
async getUserBookings(user_id) {

  return await db.Booking.findAll({

    where: {
      user_id,
    },

    include: [

      {
        model: db.ArtistProfile,
        as: "artist",

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
      },

      {
        model: db.Service,
        as: "service",
      },

      {
        model: db.AvailabilitySlot,
        as: "slot",
      },
    ],

    order: [
      ["createdAt", "DESC"],
    ],
  });
}

  async getArtistBookings(artist_id) {
    const { Op } = require("sequelize");
    return await db.Booking.findAll({
      where: {
        artist_id,
        [Op.or]: [
          { payment_status: { [Op.in]: ["PAID", "ADVANCE_PAID", "PARTIAL", "COMPLETED", "paid", "advance_paid", "completed"] } },
          { advance_paid: { [Op.gt]: 0 } },
          { booking_status: { [Op.in]: ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED", "COMPLETED"] } }
        ],
        booking_status: { [Op.notIn]: ["PENDING_PAYMENT", "pending_payment", "DRAFT", "draft"] }
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
        {
          model: db.Service,
          as: "service",
        },
        {
          model: db.AvailabilitySlot,
          as: "slot",
        },
      ],
      order: [
        ["createdAt", "DESC"],
      ],
    });
  }





  
}

module.exports =
  BookingRepository;
