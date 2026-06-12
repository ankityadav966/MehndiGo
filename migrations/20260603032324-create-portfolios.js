
"use strict";



module.exports = {

  async up(
    queryInterface,
    Sequelize
  ) {

    await queryInterface
      .createTable(

        "Portfolios",

        {

          id: {

            allowNull: false,

            autoIncrement: true,

            primaryKey: true,

            type:
              Sequelize.INTEGER,
          },



          artist_id: {

            type:
              Sequelize.INTEGER,

            allowNull:
              false,
          },



          image_url: {

            type:
              Sequelize.STRING,

            allowNull:
              false,
          },



          caption: {

            type:
              Sequelize.STRING,

            allowNull:
              true,
          },



          created_at: {

            allowNull:
              false,

            type:
              Sequelize.DATE,
          },



          updated_at: {

            allowNull:
              false,

            type:
              Sequelize.DATE,
          },
        }
      );
  },



  async down(
    queryInterface
  ) {

    await queryInterface
      .dropTable(
        "Portfolios"
      );
  },
};
