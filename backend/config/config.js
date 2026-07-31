require("./env");

const useLocalSqlite = process.env.USE_LOCAL_SQLITE === "true" || process.env.NODE_ENV !== "production";

module.exports = {
  development: useLocalSqlite ? {
    dialect: "sqlite",
    storage: "./dev.sqlite",
    logging: false,
  } : {
    username: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "password@Secret#2190",
    database: process.env.DB_NAME || "mehandigoapp",
    host: process.env.DB_HOST || "98.70.11.123",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      connectTimeout: 3000,
    },
    logging: false,
  },

  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },

  production: {
    username: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "password@Secret#2190",
    database: process.env.DB_NAME || "mehandigoapp",
    host: process.env.DB_HOST || "98.70.11.123",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  },
};  