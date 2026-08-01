require("./env");

const getDbConfig = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    const isSslRequired = process.env.DB_SSL === "true" || process.env.DATABASE_URL.includes("sslmode=require");
    return {
      use_env_variable: "DATABASE_URL",
      dialect: "postgres",
      dialectOptions: {
        ssl: isSslRequired ? { require: true, rejectUnauthorized: false } : false,
        connectTimeout: 5000
      },
      pool: { max: 10, min: 0, acquire: 5000, idle: 10000 },
      logging: false,
    };
  }

  const host = (process.env.DB_HOST || "127.0.0.1").trim();
  const port = parseInt((process.env.DB_PORT || "5432").trim(), 10);
  const username = (process.env.DB_USER || "postgres").trim();
  const password = (process.env.DB_PASSWORD || process.env.DB_PASS || "12345678").trim();
  const database = (process.env.DB_NAME || "mehndigo_db").trim();

  return {
    username,
    password,
    database,
    host,
    port,
    dialect: "postgres",
    dialectOptions: {
      connectTimeout: 5000
    },
    pool: { max: 10, min: 0, acquire: 5000, idle: 10000 },
    logging: false,
  };
};

const dbConfig = getDbConfig();

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
};