
const db =
  require("../models");

const CrudRepository =
  require("./crud.repository");



class ServiceRepository
  extends CrudRepository {

  constructor() {

    super(db.Service);
  }



  async createService(data) {

  const service =
    await db.Service.create(data);

  return await db.Service.findByPk(
    service.id,

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



  async getArtistServices(
    artist_id
  ) {

    return await db.Service
      .findAll({

        where: {
          artist_id,
        },

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
                ],
              },
            ],
          },
        ],
      });
  }
}

module.exports =
  ServiceRepository;
