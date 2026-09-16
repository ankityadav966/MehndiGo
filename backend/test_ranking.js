async function testRanking() {
  try {
    const res = await fetch('http://127.0.0.1:8787/customer/dashboard?lat=28.7041&lng=77.1025');
    const data = (await res.json()).data;
    console.log("Featured Artists (IDs):", data.featuredArtists?.map(a => `${a.id} (Dist: ${a.distance_km})`));
    console.log("Popular Artists (IDs):", data.popularArtists?.map(a => `${a.id} (Dist: ${a.distance_km})`));
    console.log("Nearest Artists (IDs):", data.artists?.map(a => `${a.id} (Dist: ${a.distance_km})`));
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
  }

  try {
    const res = await fetch('http://127.0.0.1:8787/customer/search?lat=28.7041&lng=77.1025&sort=nearest');
    const data = (await res.json()).data;
    console.log("Search Nearest Artists (IDs):", data.artists?.map(a => `${a.id} (Dist: ${a.distance})`));
  } catch (err) {
    console.error("Search fetch failed:", err);
  }
}
testRanking();
