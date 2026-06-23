
const db =
  require("../models");

const CrudRepository =
  require("./crud.repository");



class ReviewRepository
  extends CrudRepository {

  constructor() {

    super(
      db.Review
    );
  }



  // create review

  async createReview(
    data
  ) {

    const review =
      await db.Review
        .create(data);

    return await db
      .Review
      .findByPk(

        review.id,

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
          ],
        }
      );
  }



  // artist reviews

  async getArtistReviews(
  artist_id
) {

  return await db.Review.findAll({

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
    ],

    order: [
      ["created_at", "DESC"],
    ],
  });
}



  // booking review

  async findBookingReview(
    booking_id
  ) {

    return await db
      .Review
      .findOne({

        where: {
          booking_id,
        },
      });
  }
}

module.exports =
  ReviewRepository;
