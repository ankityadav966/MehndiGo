"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// Configure test environment with SQLite in-memory DB
process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.DB_STORAGE = ":memory:";
process.env.JWT_SECRET = "test-secret-key-12345";

const db = require("../models");
const ArtistService = require("../services/artist.services");
const CustomerService = require("../services/customer.services");

describe("ARTIST MODULE 3: PORTFOLIO MANAGEMENT INTEGRATION SUITE", () => {
  let approvedUser, approvedArtist;
  let rivalUser, rivalArtist;
  let pendingUser, pendingArtist;
  let item1Id, item2Id, item3Id;

  before(async () => {
    await db.sequelize.sync({ force: true });

    // Seed standard categories
    await db.Category.bulkCreate([
      { name: "Bridal Mehndi", slug: "bridal-mehndi", status: "ACTIVE", is_active: true },
      { name: "Arabic Mehndi", slug: "arabic-mehndi", status: "ACTIVE", is_active: true },
      { name: "Royal Mehndi", slug: "royal-mehndi", status: "ACTIVE", is_active: true }
    ]);
  });

  it("1. Setup Test Artists (Approved, Rival, Pending)", async () => {
    // 1. Approved Artist A
    approvedUser = await db.User.create({
      name: "Pooja Mehndi Artist",
      email: "pooja@portfolio.com",
      phone: "9876543210",
      phone_number: "9876543210",
      role: "ARTIST",
      is_verified: true
    });
    approvedArtist = await db.ArtistProfile.create({
      user_id: approvedUser.id,
      bio: "Master henna designer with 8 years of bridal experience",
      experience_years: 8,
      verification_status: "APPROVED",
      is_available: true,
      city: "Jaipur"
    });

    // 2. Rival Artist B
    rivalUser = await db.User.create({
      name: "Rival Henna Artist",
      email: "rival@portfolio.com",
      phone: "9876543211",
      phone_number: "9876543211",
      role: "ARTIST",
      is_verified: true
    });
    rivalArtist = await db.ArtistProfile.create({
      user_id: rivalUser.id,
      bio: "Rival artist profile",
      experience_years: 3,
      verification_status: "APPROVED",
      is_available: true,
      city: "Udaipur"
    });

    // 3. Pending/Unapproved Artist C
    pendingUser = await db.User.create({
      name: "Pending Henna Artist",
      email: "pending@portfolio.com",
      phone: "9876543212",
      phone_number: "9876543212",
      role: "ARTIST",
      is_verified: false
    });
    pendingArtist = await db.ArtistProfile.create({
      user_id: pendingUser.id,
      bio: "Pending artist onboarding",
      experience_years: 1,
      verification_status: "PENDING",
      is_available: false,
      city: "Jaipur"
    });

    assert.ok(approvedArtist.id);
    assert.ok(rivalArtist.id);
    assert.ok(pendingArtist.id);
  });

  it("2. Approved artist creates an image portfolio item successfully", async () => {
    const item = await ArtistService.createPortfolio(approvedUser.id, {
      title: "Royal Marwari Bridal Design",
      description: "Intricate peacock and elephant motifs on full arms",
      category: "Bridal Mehndi",
      occasion: "Wedding",
      tags: "bridal, marwari, intricate, wedding",
      location: "Jaipur",
      art_tier: "BRIDAL_EXCLUSIVE",
      price: 5500,
      duration_minutes: 180,
      complexity_level: "MASTERPIECE",
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/marwari_bridal.jpg",
      visibility: true
    });

    assert.ok(item);
    assert.ok(item.id);
    assert.equal(item.title, "Royal Marwari Bridal Design");
    assert.equal(item.artist_id, approvedArtist.id);
    assert.equal(item.art_tier, "BRIDAL_EXCLUSIVE");
    assert.equal(item.price, 5500);
    assert.equal(item.duration_minutes, 180);
    assert.equal(item.visibility, true);
    item1Id = item.id;
  });

  it("3. Approved artist creates a video reel portfolio item with video_url and thumbnail", async () => {
    const item = await ArtistService.createPortfolio(approvedUser.id, {
      title: "Arabic Floral Flow Reel",
      description: "Step by step time-lapse of arabic henna application",
      category: "Arabic Mehndi",
      occasion: "Engagement",
      tags: "arabic, reel, floral, timelapse",
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/arabic_thumb.jpg",
      video_url: "https://res.cloudinary.com/mehndigo/video/upload/v1/arabic_reel.mp4",
      art_tier: "PREMIUM",
      price: 2200,
      duration_minutes: 60,
      complexity_level: "MEDIUM",
      visibility: true
    });

    assert.ok(item);
    assert.ok(item.id);
    assert.equal(item.title, "Arabic Floral Flow Reel");
    assert.equal(item.video_url, "https://res.cloudinary.com/mehndigo/video/upload/v1/arabic_reel.mp4");
    item2Id = item.id;
  });

  it("4. Create third portfolio item marked as hidden/draft (visibility: false)", async () => {
    const item = await ArtistService.createPortfolio(approvedUser.id, {
      title: "Secret Work-In-Progress Practice",
      description: "Draft pattern testing new herbal dark stain cone",
      category: "Bridal Mehndi",
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/draft_pattern.jpg",
      visibility: false,
      display_order: 5
    });

    assert.ok(item);
    assert.equal(item.visibility, false);
    item3Id = item.id;
  });

  it("5. Reject portfolio creation when neither image_url nor video_url is provided (400)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createPortfolio(approvedUser.id, {
          title: "Missing Media Sample",
          category: "Bridal Mehndi"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("Portfolio media file is required")
    );
  });

  it("6. Reject portfolio creation with negative price (400)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createPortfolio(approvedUser.id, {
          title: "Negative Price Item",
          image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/test.jpg",
          price: -500
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("price must be a non-negative number")
    );
  });

  it("7. Reject portfolio creation with invalid duration (< 15 mins or > 720 mins) (400)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createPortfolio(approvedUser.id, {
          title: "Invalid Duration Item",
          image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/test.jpg",
          duration_minutes: 5
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("duration must be between 15 and 720 minutes")
    );
  });

  it("8. Reject portfolio creation with invalid art tier (400)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.createPortfolio(approvedUser.id, {
          title: "Invalid Art Tier Item",
          image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/test.jpg",
          art_tier: "ULTRA_LEGENDARY"
        });
      },
      (err) => err.statusCode === 400 && err.message.includes("Invalid art tier")
    );
  });

  it("9. Prevent duplicate portfolio item on retried upload with identical media URL (Idempotency)", async () => {
    const duplicate = await ArtistService.createPortfolio(approvedUser.id, {
      title: "Royal Marwari Bridal Design (Retry)",
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/marwari_bridal.jpg"
    });

    assert.equal(duplicate.id, item1Id, "Duplicate upload should return existing record ID");
  });

  it("10. Fetch artist's own portfolio includes all their published and draft items", async () => {
    const list = await ArtistService.getMyPortfolio(approvedUser.id);
    assert.equal(list.length, 3);
    const ids = list.map((i) => i.id);
    assert.ok(ids.includes(item1Id));
    assert.ok(ids.includes(item2Id));
    assert.ok(ids.includes(item3Id));
  });

  it("11. Fetch portfolio item by ID returns complete model details", async () => {
    const item = await ArtistService.getPortfolioById(item1Id);
    assert.equal(item.id, item1Id);
    assert.equal(item.title, "Royal Marwari Bridal Design");
    assert.equal(item.artist.id, approvedArtist.id);
  });

  it("12. Rival artist B cannot update Artist A's portfolio item (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.updatePortfolio(item1Id, rivalUser.id, {
          title: "Hacked by Rival Artist"
        });
      },
      (err) => err.statusCode === 403 && err.message.includes("Unauthorized access to portfolio")
    );

    // Verify item remains unmodified
    const unmod = await db.Portfolio.findByPk(item1Id);
    assert.equal(unmod.title, "Royal Marwari Bridal Design");
  });

  it("13. Author artist A updates portfolio item metadata successfully", async () => {
    const updated = await ArtistService.updatePortfolio(item1Id, approvedUser.id, {
      title: "Royal Marwari Heritage Bridal Henna",
      price: 6000,
      duration_minutes: 200,
      occasion: "Royal Wedding"
    });

    assert.equal(updated.title, "Royal Marwari Heritage Bridal Henna");
    assert.equal(updated.price, 6000);
    assert.equal(updated.duration_minutes, 200);
    assert.equal(updated.occasion, "Royal Wedding");
  });

  it("14. Rival artist B cannot delete Artist A's portfolio item (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.deletePortfolio(item1Id, rivalUser.id);
      },
      (err) => err.statusCode === 403 && err.message.includes("Unauthorized access to portfolio")
    );

    // Verify item still exists in DB
    const check = await db.Portfolio.findByPk(item1Id);
    assert.ok(check);
  });

  it("15. Author artist A sets a portfolio item as their profile cover image", async () => {
    await ArtistService.setCoverImage(approvedUser.id, { portfolio_id: item1Id });
    const refreshedArtist = await db.ArtistProfile.findByPk(approvedArtist.id);
    assert.equal(refreshedArtist.cover_image, "https://res.cloudinary.com/mehndigo/image/upload/v1/marwari_bridal.jpg");
  });

  it("16. Rival artist B cannot select Artist A's portfolio item as cover image (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.setCoverImage(rivalUser.id, { portfolio_id: item1Id });
      },
      (err) => err.statusCode === 403 && err.message.includes("cannot select another artist's portfolio item as cover")
    );
  });

  it("17. Author artist A reorders multiple portfolio items and display_order updates in DB", async () => {
    await ArtistService.reorderPortfolio(approvedUser.id, [
      { id: item2Id, display_order: 0 },
      { id: item1Id, display_order: 1 },
      { id: item3Id, display_order: 2 }
    ]);

    const reorderedList = await ArtistService.getMyPortfolio(approvedUser.id);
    assert.equal(reorderedList[0].id, item2Id, "item2 should be first");
    assert.equal(reorderedList[1].id, item1Id, "item1 should be second");
    assert.equal(reorderedList[2].id, item3Id, "item3 should be third");
  });

  it("18. Rival artist B cannot reorder Artist A's portfolio items (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await ArtistService.reorderPortfolio(rivalUser.id, [
          { id: item1Id, display_order: 0 }
        ]);
      },
      (err) => err.statusCode === 403 && err.message.includes("cannot reorder another artist's portfolio items")
    );
  });

  it("19. Customer gets approved artist's public portfolio returning only visible items", async () => {
    const customerView = await CustomerService.getArtistPortfolio(approvedArtist.id);
    assert.equal(customerView.length, 2, "Should return only 2 visible items, excluding hidden item3");
    assert.equal(customerView[0].id, item2Id, "Should follow display_order");
    assert.equal(customerView[1].id, item1Id);
    assert.ok(!customerView.some(i => i.id === item3Id), "Hidden draft item3 must NOT be visible to customer");
  });

  it("20. Customer fetching unapproved/pending artist portfolio receives empty array []", async () => {
    // Pending artist uploads an item
    await ArtistService.createPortfolio(pendingUser.id, {
      title: "Pending Artist Sample",
      image_url: "https://res.cloudinary.com/mehndigo/image/upload/v1/pending.jpg",
      visibility: true
    });

    const customerView = await CustomerService.getArtistPortfolio(pendingArtist.id);
    assert.deepEqual(customerView, [], "Unapproved artist's portfolio must return [] to customer");
  });

  it("21. Customer global portfolio feed returns only items from APPROVED artists with visibility: true", async () => {
    const feed = await CustomerService.getPortfolios("", {}, 1, 10);
    assert.equal(feed.count, 2, "Global feed should contain only 2 items from approved artist");
    const ids = feed.rows.map(r => r.id);
    assert.ok(ids.includes(item1Id));
    assert.ok(ids.includes(item2Id));
    assert.ok(!ids.includes(item3Id), "Draft item must not appear in global feed");
  });

  it("22. Customer global portfolio feed supports filtering by category and search pattern", async () => {
    const bridalOnly = await CustomerService.getPortfolios("", { category: "Bridal Mehndi" }, 1, 10);
    assert.equal(bridalOnly.count, 1);
    assert.equal(bridalOnly.rows[0].id, item1Id);

    const searchResult = await CustomerService.getPortfolios("Heritage", {}, 1, 10);
    assert.equal(searchResult.count, 1);
    assert.equal(searchResult.rows[0].id, item1Id);
  });

  it("23. Customer reels feed returns only approved video items without leaking sensitive phone/email", async () => {
    const reelsRes = await CustomerService.getReels(null, 1, 10);
    assert.equal(reelsRes.pagination.total, 1, "Only 1 video reel item exists");
    const reel = reelsRes.data[0];
    assert.equal(reel.id, item2Id);
    assert.ok(reel.artist.user.name);
    assert.equal(reel.artist.user.email, undefined, "Email must not be leaked in public reels");
    assert.equal(reel.artist.user.phone, undefined, "Phone must not be leaked in public reels");
  });

  it("24. Customer likes and saves portfolio item", async () => {
    const customerUser = await db.User.create({
      name: "Sneha Customer",
      email: "sneha@customer.com",
      phone: "9111222333",
      phone_number: "9111222333",
      role: "CUSTOMER"
    });

    const likeRes = await CustomerService.likePortfolio(customerUser.id, item1Id);
    assert.ok(likeRes);
    const itemAfterLike = await db.Portfolio.findByPk(item1Id);
    assert.equal(itemAfterLike.likes_count, 1);

    const saveRes = await CustomerService.savePortfolio(customerUser.id, item1Id);
    assert.ok(saveRes);
    const savedList = await CustomerService.getSavedPortfolios(customerUser.id);
    assert.equal(savedList.length, 1);
    assert.equal(savedList[0].id, item1Id);
  });

  it("25. Author artist deletes a portfolio item that was active cover image", async () => {
    // Current cover is item1
    const artistBefore = await db.ArtistProfile.findByPk(approvedArtist.id);
    assert.equal(artistBefore.cover_image, "https://res.cloudinary.com/mehndigo/image/upload/v1/marwari_bridal.jpg");

    await ArtistService.deletePortfolio(item1Id, approvedUser.id);

    // Verify item1 is destroyed
    const checkItem = await db.Portfolio.findByPk(item1Id);
    assert.equal(checkItem, null);

    // Verify cover is safely promoted to item2 or next available
    const artistAfter = await db.ArtistProfile.findByPk(approvedArtist.id);
    assert.equal(artistAfter.cover_image, "https://res.cloudinary.com/mehndigo/image/upload/v1/arabic_thumb.jpg");
  });

  it("26. Deleted portfolio item immediately disappears from customer gallery and profile", async () => {
    const customerView = await CustomerService.getArtistPortfolio(approvedArtist.id);
    assert.equal(customerView.length, 1);
    assert.equal(customerView[0].id, item2Id);
    assert.ok(!customerView.some(i => i.id === item1Id));
  });

  it("27. Artist with zero portfolio items returns clean [] (zero dummy items)", async () => {
    const emptyArtistUser = await db.User.create({
      name: "Empty Henna Artist",
      email: "empty@portfolio.com",
      phone: "9998887776",
      phone_number: "9998887776",
      role: "ARTIST",
      is_verified: true
    });
    const emptyArtist = await db.ArtistProfile.create({
      user_id: emptyArtistUser.id,
      bio: "Fresh artist with zero portfolio items yet",
      experience_years: 0,
      verification_status: "APPROVED",
      city: "Jaipur"
    });

    const artistList = await ArtistService.getMyPortfolio(emptyArtistUser.id);
    assert.deepEqual(artistList, []);

    const customerList = await CustomerService.getArtistPortfolio(emptyArtist.id);
    assert.deepEqual(customerList, []);
  });
});
