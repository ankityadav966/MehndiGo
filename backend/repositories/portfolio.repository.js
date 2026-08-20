
const db =
  require("../models");

const CrudRepository =
  require("./crud.repository");



class PortfolioRepository
  extends CrudRepository {

  constructor() {

    super(
      db.Portfolio
    );
  }



  async createPortfolio(
    data
  ) {

    const portfolio =
      await db.Portfolio
        .create(data);

    return await db
      .Portfolio
      .findByPk(
        portfolio.id,

        {
          include: [

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

                    "role",
                  ],
                },
              ],
            },
          ],
        }
      );
  }



  async getArtistPortfolio(artist_id) {
    const artistIds = Array.isArray(artist_id) ? artist_id : [artist_id];
    return await db.Portfolio.findAll({
      where: {
        artist_id: { [db.Sequelize.Op.in]: artistIds }
      },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "phone", "role"]
            }
          ]
        }
      ],
      order: [
        ["display_order", "ASC"],
        ["createdAt", "DESC"]
      ]
    });
  }
}

module.exports =
  PortfolioRepository;
