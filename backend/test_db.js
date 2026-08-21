require('dotenv').config();
const db = require('./models');
async function run() {
  try {
    const res = await db.sequelize.query('SELECT * FROM "ArtistProfiles" LIMIT 1');
    console.log(res[0]);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
