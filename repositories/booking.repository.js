
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

  return await db.Booking.findAll({

    where: {
      artist_id,
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



  // user bookings

  async getUserBookings(
    user_id
  ) {

    return await db
      .Booking
      .findAll({

        where: {
          user_id,
        },

        include: [

          {
            model:
              db.ArtistProfile,

            as: "artist",
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

        order: [
          ["createdAt", "DESC"],
        ],
      });
  }



  // artist bookings

  async getArtistBookings(
    artist_id
  ) {

    return await db
      .Booking
      .findAll({

        where: {
          artist_id,
        },

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
              db.Service,

            as: "service",
          },

          {
            model:
              db.AvailabilitySlot,

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
