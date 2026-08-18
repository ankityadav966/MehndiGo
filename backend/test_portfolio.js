const { Portfolio, ArtistProfile } = require('./models');

async function test() {
  const p = await Portfolio.findAll({
    limit: 10,
    order: [['createdAt', 'DESC']]
  });
  console.log("Portfolios:");
  p.forEach(x => console.log("ID:", x.id, "| video_url:", x.video_url, "| image:", x.image, "| media_url:", x.media_url, "| url:", x.url));
}
test().catch(console.error).finally(() => process.exit(0));
