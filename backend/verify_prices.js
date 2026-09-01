const { setupDatabase, sequelize } = require('./config/database');
const { CustomerService } = require('./services/customer.services');
const { ArtistProfileRepositor } = require('./repositories/artistProfile.repository');

async function run() {
  await setupDatabase();
  
  // Find two different artists
  const artists = await ArtistProfileRepositor.getAll({});
  if (artists.length < 2) {
    console.log("Need at least 2 artists to test");
    process.exit(0);
  }

  // Set distinct prices
  await ArtistProfileRepositor.update(artists[0].id, { starting_price: 3500 });
  await ArtistProfileRepositor.update(artists[1].id, { starting_price: 8000 });
  
  const artist1 = await CustomerService.getArtistById(artists[0].user_id);
  const artist2 = await CustomerService.getArtistById(artists[1].user_id);
  
  console.log("=========================================");
  console.log(`Artist 1: ${artist1.user.name}`);
  console.log(`Starting Price: ${artist1.starting_price}`);
  console.log(`Trust Factors: ${JSON.stringify(artist1.trust_factors)}`);
  
  console.log("=========================================");
  console.log(`Artist 2: ${artist2.user.name}`);
  console.log(`Starting Price: ${artist2.starting_price}`);
  console.log(`Trust Factors: ${JSON.stringify(artist2.trust_factors)}`);
  console.log("=========================================");
  
  process.exit(0);
}

run().catch(console.error);
