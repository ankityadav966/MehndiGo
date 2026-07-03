const { Sequelize } = require("sequelize");

async function test(host, port) {
  const sequelize = new Sequelize("mehndigo_db", "ankit", "123456", {
    host: host,
    port: port,
    dialect: "postgres",
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log(`${host}:${port} success!`);
    await sequelize.close();
    return true;
  } catch (err) {
    console.log(`${host}:${port} failed:`, err);
    return false;
  }
}

async function main() {
  await test("localhost", 5432);
  await test("localhost", 5433);
  await test("localhost", 5434);
}

main();
