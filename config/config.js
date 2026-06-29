require("dotenv").config();

module.exports = {
  development: {
    username: "admin",
    password: "password@Secret#2190",
    database: "mehandigoapp",
    host: "98.70.11.123",
    port: 5432,
    dialect: "postgres",
  },

  test: {
    username: "admin",
    password: "password@Secret#2190",
    database: "mehandigoapp",
    host: "98.70.11.123",
    port: 5432,
    dialect: "postgres",
  },

  production: {
    username: "admin",
    password: "password@Secret#2190",
    database: "mehandigoapp",
    host: "98.70.11.123",
    port: 5432,
    dialect: "postgres",
  },
};