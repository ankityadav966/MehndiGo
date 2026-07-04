const db = require('../models');

async function run() {
  try {
    console.log('Running ALTER query for email...');
    await db.sequelize.query('ALTER TABLE "Otps" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);');
    
    console.log('Running ALTER query for registration_payload...');
    await db.sequelize.query('ALTER TABLE "Otps" ADD COLUMN IF NOT EXISTS "registration_payload" TEXT;');
    
    console.log('Done!');
  } catch (err) {
    console.error('Database migration error:', err.message);
  }
}

run();
