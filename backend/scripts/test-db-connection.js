const { Sequelize } = require("sequelize");
require("../config/env");
const config = require("../config/config.js")[process.env.NODE_ENV || "development"];

async function runTest() {
  console.log("==========================================");
  console.log("MehndiGo Database Connection Diagnostic");
  console.log("==========================================");
  console.log(`Target Host:     ${config.host || "N/A"}`);
  console.log(`Target Port:     ${config.port || "N/A"}`);
  console.log(`Target Database: ${config.database || "N/A"}`);
  console.log(`Target User:     ${config.username || "N/A"}`);
  console.log(`SSL Enabled:     ${Boolean(config.dialectOptions?.ssl)}`);
  console.log(`Pool Acquire:    ${config.pool?.acquire || 5000} ms`);
  console.log("------------------------------------------");

  let sequelize;
  if (config.use_env_variable && process.env[config.use_env_variable]) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }

  const startTime = Date.now();
  try {
    console.log("Attempting database authentication...");
    await sequelize.authenticate();
    const elapsed = Date.now() - startTime;
    console.log(`✅ DATABASE CONNECTION SUCCESSFUL! (${elapsed} ms)`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ DATABASE CONNECTION FAILED! (${elapsed} ms)`);
    console.error(`Error Code:    ${error.parent?.code || error.original?.code || error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.log("------------------------------------------");
    console.log("Troubleshooting checklist:");
    console.log("1. Check if PostgreSQL server is running on the target host.");
    console.log("2. Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in backend/.env.");
    console.log("3. If using remote PostgreSQL, check if port 5432 is open in firewall/security groups.");
    console.log("4. If remote DB requires SSL, set DB_SSL=true in backend/.env.");
    process.exit(1);
  }
}

runTest();
