const db = require("../models");
const { Op } = require("sequelize");
const ArtistProfileRepository = require("../repositories/artistProfile.repository");

const repo = new ArtistProfileRepository();

const categoriesList = [
  { id: "1", name: "Bridal Mehndi", slug: "bridal", icon: "flower-outline", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80" },
  { id: "2", name: "Arabic Mehndi", slug: "arabic", icon: "brush-outline", image: "https://images.unsplash.com/photo-1601054790522-d08317b75567?auto=format&fit=crop&w=300&q=80" },
  { id: "3", name: "Royal Bridal Mehndi", slug: "royal-bridal", icon: "ribbon-outline", image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?auto=format&fit=crop&w=300&q=80" },
  { id: "4", name: "Traditional Mehndi", slug: "traditional", icon: "cut-outline", image: "https://images.unsplash.com/photo-1601054790740-975949514f7b?auto=format&fit=crop&w=300&q=80" },
  { id: "5", name: "Floral Mehndi", slug: "floral", icon: "rose-outline", image: "https://images.unsplash.com/photo-1601054791559-0a67ab92b6a2?auto=format&fit=crop&w=300&q=80" },
  { id: "6", name: "Minimal Mehndi", slug: "minimal", icon: "remove-outline", image: "https://images.unsplash.com/photo-1601054791572-c510255b77ea?auto=format&fit=crop&w=300&q=80" },
  { id: "7", name: "Modern Mehndi", slug: "modern", icon: "sparkles-outline", image: "https://images.unsplash.com/photo-1601054791585-fb4050d24bf5?auto=format&fit=crop&w=300&q=80" },
  { id: "8", name: "Finger Mehndi", slug: "finger", icon: "hand-left-outline", image: "https://images.unsplash.com/photo-1601054791599-23efbf1c65d6?auto=format&fit=crop&w=300&q=80" },
  { id: "9", name: "Full Hand Mehndi", slug: "full-hand", icon: "body-outline", image: "https://images.unsplash.com/photo-1601054791612-4029237c1d76?auto=format&fit=crop&w=300&q=80" },
  { id: "10", name: "Back Hand Mehndi", slug: "back-hand", icon: "hand-right-outline", image: "https://images.unsplash.com/photo-1601054791637-27b233a73c91?auto=format&fit=crop&w=300&q=80" },
  { id: "11", name: "Leg Mehndi", slug: "leg", icon: "foot-outline", image: "https://images.unsplash.com/photo-1601054791646-9d324b172a1e?auto=format&fit=crop&w=300&q=80" },
  { id: "12", name: "Engagement Mehndi", slug: "engagement", icon: "heart-outline", image: "https://images.unsplash.com/photo-1601054791653-52467fd89886?auto=format&fit=crop&w=300&q=80" },
  { name: "Wedding Mehndi", slug: "wedding", icon: "gift-outline", image: "https://images.unsplash.com/photo-1601054791657-3a13917d0961?auto=format&fit=crop&w=300&q=80" },
  { name: "Karwa Chauth Mehndi", slug: "karwa-chauth", icon: "moon-outline", image: "https://images.unsplash.com/photo-1601054791672-0051e8e50b1d?auto=format&fit=crop&w=300&q=80" },
  { name: "Eid Mehndi", slug: "eid", icon: "star-half-outline", image: "https://images.unsplash.com/photo-1601054791689-53e970a2fe89?auto=format&fit=crop&w=300&q=80" },
  { name: "Festival Mehndi", slug: "festival", icon: "sunny-outline", image: "https://images.unsplash.com/photo-1601054791696-6e54ee0d55e9?auto=format&fit=crop&w=300&q=80" },
  { name: "Kids Mehndi", slug: "kids", icon: "happy-outline", image: "https://images.unsplash.com/photo-1601054791702-8d76db7bd84b?auto=format&fit=crop&w=300&q=80" },
  { name: "Groom Mehndi", slug: "groom", icon: "person-outline", image: "https://images.unsplash.com/photo-1601054791712-4091a135546d?auto=format&fit=crop&w=300&q=80" }
];

const offersList = [
  { id: "1", title: "Bridal Mehndi Ceremony", description: "Get flat 20% off on all bridal bookings this season. Code: BRIDAL20", code: "BRIDAL20", discount: "20%", banner: "https://images.unsplash.com/photo-1582192732961-2364f55b1a3d?auto=format&fit=crop&w=800&q=80" },
  { id: "2", title: "Royal Wedding Mehndi", description: "Experience royal luxury patterns on your wedding day. Code: ROYAL500", code: "ROYAL500", discount: "₹500", banner: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80" },
  { id: "3", title: "Arabic Mehndi Design", description: "Graceful and elegant Arabic trails by top experts. Code: ARABIC15", code: "ARABIC15", discount: "15%", banner: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=800&q=80" },
  { id: "4", title: "Professional Mehndi Artist", description: "Hire top certified artists for clean handcrafting. Code: EXPERT10", code: "EXPERT10", discount: "10%", banner: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=800&q=80" },
  { id: "5", title: "Festival Mehndi Celebration", description: "Add colors to your festivals with custom layouts. Code: FEST20", code: "FEST20", discount: "20%", banner: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80" },
  { id: "6", title: "Luxury Mehndi Event", description: "Book premium lounges for your special celebrations. Code: LUXURY25", code: "LUXURY25", discount: "25%", banner: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80" }
];

const trendingSearchesList = [
  "Bridal Mehndi",
  "Arabic Mehndi",
  "Priya Mehndi Artist",
  "Engagement Mehndi",
  "Jaipur",
  "Delhi",
];

class CustomerService {
  async getCategories() {
    try {
      const { getCache, setCache } = require("../utils/cache.utils");
      const cached = await getCache("mehndigo:categories");
      if (cached) return cached;

      const db = require("../models");
      const list = await db.Category.findAll({
        where: { status: "ACTIVE" },
        order: [["sort_order", "ASC"]]
      });
      if (list && list.length > 0) {
        await setCache("mehndigo:categories", list, 600);
        return list;
      }
    } catch (err) {
      console.log("Error fetching dynamic categories from DB:", err.message);
    }
    return categoriesList;
  }

  async getOffers() {
    try {
      const { getCache, setCache } = require("../utils/cache.utils");
      const cached = await getCache("mehndigo:offers");
      if (cached) return cached;

      await setCache("mehndigo:offers", offersList, 600);
    } catch (err) {}
    return offersList;
  }

  async getFeaturedArtists(lat, lng) {
    const response = await repo.getArtists({
      latitude: lat,
      longitude: lng,
      sort: "rating",
      limit: 6
    });
    return response.rows;
  }

  async getNearbyArtists(lat, lng, radius, page, limit) {
    const response = await repo.getArtists({
      latitude: lat,
      longitude: lng,
      radius: radius || 50,
      sort: "distance",
      page: page || 1,
      limit: limit || 10
    });
    return response;
  }

  async getPopularArtists(lat, lng) {
    const response = await repo.getArtists({
      latitude: lat,
      longitude: lng,
      sort: "rating",
      limit: 6
    });
    return response.rows;
  }

  async searchArtists(query, filters = {}, sort = "nearest", lat = null, lng = null, page = 1, limit = 10) {
    const offset = (Number(page) - 1) * Number(limit);
    let where = {
      verification_status: "APPROVED"
    };

    const isPostgres = db.sequelize.getDialect() === "postgres";
    const ilikeStr = isPostgres ? "ILIKE" : "LIKE";
    const likeOp = isPostgres ? Op.iLike : Op.like;

    if (filters.category) {
      const normalizedCategory = filters.category.toLowerCase().replace(/\s+mehndi/g, "").replace(/\s+design/g, "").trim();
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (s.category ${ilikeStr} '%${normalizedCategory}%' OR s.specialization_name ${ilikeStr} '%${normalizedCategory}%')
        )`)
      );
    }

    if (filters.minPrice || filters.maxPrice) {
      const min = Number(filters.minPrice || 0);
      const max = Number(filters.maxPrice || 999999);
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND s.minimum_price >= ${min} AND s.minimum_price <= ${max}
        )`)
      );
    }

    if (filters.rating) {
      where.avg_rating = { [Op.gte]: Number(filters.rating) };
    }

    if (filters.experience) {
      where.experience_years = { [Op.gte]: Number(filters.experience) };
    }

    if (filters.verified === "true" || filters.verified === true) {
      where.verification_status = "APPROVED";
    }

    if (filters.homeService === "true" || filters.homeService === true) {
      where.home_service = true;
    }

    if (filters.studioService === "true" || filters.studioService === true) {
      where.salon_service = true;
    }

    if (filters.gender) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Users" AS u 
          WHERE u.id = "ArtistProfile".user_id 
          AND u.gender = '${filters.gender.toUpperCase()}'
        )`)
      );
    }

    if (query) {
      const searchPattern = `%${query}%`;
      where[Op.or] = [
        { bio: { [likeOp]: searchPattern } },
        { city: { [likeOp]: searchPattern } },
        { state: { [likeOp]: searchPattern } },
        { pincode: { [likeOp]: searchPattern } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Users" AS u 
          WHERE u.id = "ArtistProfile".user_id 
          AND u.name ${ilikeStr} '${searchPattern}'
        )`),
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (s.specialization_name ${ilikeStr} '${searchPattern}' OR s.category ${ilikeStr} '${searchPattern}')
        )`)
      ];
    }

    let attributes = {
      include: []
    };
    let order = [];

    let distanceSql = null;
    if (lat && lng) {
      distanceSql = isPostgres
        ? `(6371 * acos(cos(radians(${Number(lat)})) * cos(radians(latitude::double precision)) * cos(radians(longitude::double precision) - radians(${Number(lng)})) + sin(radians(${Number(lat)})) * sin(radians(latitude::double precision))))`
        : `(((latitude - (${Number(lat)})) * (latitude - (${Number(lat)}))) + ((longitude - (${Number(lng)})) * (longitude - (${Number(lng)})))) * 111`;
      attributes.include.push([db.sequelize.literal(distanceSql), "distance"]);
      
      if (filters.radius) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          db.sequelize.where(db.sequelize.literal(distanceSql), "<=", Number(filters.radius))
        );
      }
    }

    if (sort === "nearest" && distanceSql) {
      order.push([db.sequelize.literal(distanceSql), "ASC"]);
    } else if (sort === "highest_rated" || sort === "rating") {
      order.push(["avg_rating", "DESC"]);
    } else if (sort === "lowest_price") {
      order.push([
        db.sequelize.literal(`(
          SELECT COALESCE(MIN(minimum_price), 0) FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id
        )`), "ASC"
      ]);
    } else if (sort === "highest_experience") {
      order.push(["experience_years", "DESC"]);
    } else if (sort === "trending" || sort === "most_booked") {
      order.push(["total_bookings", "DESC"]);
    } else {
      order.push(["createdAt", "DESC"]);
    }

    const artists = await db.ArtistProfile.findAndCountAll({
      where,
      attributes,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "profile_image", "gender"],
        },
        {
          model: db.Service,
          as: "services",
          required: false,
        }
      ],
      order,
      limit: Number(limit),
      offset: Number(offset),
    });

    const mappedRows = artists.rows.map((item) => {
      const data = item.toJSON();
      data.response_time = item.id % 2 === 0 ? "15 mins" : "within 2 hours";
      data.languages = "Hindi, English, Rajasthani";
      return data;
    });

    return {
      count: artists.count,
      rows: mappedRows
    };
  }

  async getArtistById(artistId) {
    const artist = await db.ArtistProfile.findByPk(artistId, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email", "profile_image", "gender", "createdAt"]
        },
        {
          model: db.Service,
          as: "services",
          required: false
        },
        {
          model: db.Portfolio,
          as: "portfolio",
          required: false
        },
        {
          model: db.Review,
          as: "reviews",
          required: false,
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image"]
            }
          ]
        }
      ]
    });

    if (!artist) return null;

    const data = artist.toJSON();
    data.response_time = artist.id % 2 === 0 ? "15 mins" : "within 2 hours";
    data.languages = "Hindi, English, Rajasthani";
    return data;
  }

  async getArtistServices(artistId) {
    const services = await db.Service.findAll({
      where: { artist_id: artistId, is_active: true }
    });
    return services;
  }

  async getArtistPortfolio(artistId) {
    const portfolio = await db.Portfolio.findAll({
      where: { artist_id: artistId }
    });
    return portfolio;
  }

  async getArtistReviews(artistId) {
    const reviews = await db.Review.findAll({
      where: { artist_id: artistId },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "profile_image"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating)));
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });

    return {
      reviews,
      distribution
    };
  }

  async getArtistAvailability(artistId) {
    const slots = await db.AvailabilitySlot.findAll({
      where: { artist_id: artistId },
      order: [["start_time", "ASC"]]
    });
    return slots;
  }

  async getSimilarArtists(artistId) {
    const target = await db.ArtistProfile.findByPk(artistId);
    if (!target) return [];

    const list = await db.ArtistProfile.findAll({
      where: {
        city: target.city || "Jaipur",
        id: { [Op.ne]: artistId },
        verification_status: "APPROVED"
      },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "profile_image", "gender"]
        },
        {
          model: db.Service,
          as: "services",
          required: false
        }
      ],
      limit: 5
    });

    return list.map((item) => {
      const data = item.toJSON();
      data.response_time = item.id % 2 === 0 ? "15 mins" : "within 2 hours";
      data.languages = "Hindi, English, Rajasthani";
      return data;
    });
  }

  async getTrendingArtists(lat, lng) {
    const response = await this.searchArtists("", {}, "trending", lat, lng, 1, 10);
    return response.rows;
  }

  async getRecommendedArtists(lat, lng) {
    const response = await this.searchArtists("", {}, "highest_rated", lat, lng, 1, 10);
    return response.rows;
  }

  async getSuggestions(query) {
    if (!query) return [];
    const searchPattern = `%${query}%`;
    const likeOp = db.sequelize.getDialect() === "postgres" ? Op.iLike : Op.like;

    const matchingArtists = await db.User.findAll({
      where: {
        role: "ARTIST",
        name: { [likeOp]: searchPattern }
      },
      attributes: ["name"],
      limit: 3
    });

    const matchingServices = await db.Service.findAll({
      where: {
        specialization_name: { [likeOp]: searchPattern }
      },
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("specialization_name")), "specialization_name"]
      ],
      limit: 3
    });

    const matchingCities = await db.ArtistProfile.findAll({
      where: {
        city: { [likeOp]: searchPattern }
      },
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("city")), "city"]
      ],
      limit: 3
    });

    const suggestions = [];
    matchingArtists.forEach((a) => suggestions.push({ type: "artist", text: a.name }));
    matchingServices.forEach((s) => suggestions.push({ type: "service", text: s.specialization_name }));
    matchingCities.forEach((c) => suggestions.push({ type: "city", text: c.city }));

    categoriesList.forEach((cat) => {
      if (cat.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({ type: "category", text: cat.name });
      }
    });

    return suggestions.slice(0, 10);
  }

  async getTrendingSearches() {
    return trendingSearchesList;
  }

  async getRecentSearches(userId) {
    const list = await db.RecentSearch.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      limit: 10
    });
    return list;
  }

  async saveRecentSearch(userId, queryText) {
    if (!queryText || !queryText.trim()) return null;

    await db.RecentSearch.destroy({
      where: {
        user_id: userId,
        search_query: queryText.trim()
      }
    });

    const recent = await db.RecentSearch.create({
      user_id: userId,
      search_query: queryText.trim()
    });

    const list = await db.RecentSearch.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]]
    });

    if (list.length > 10) {
      const idsToDelete = list.slice(10).map((r) => r.id);
      await db.RecentSearch.destroy({
        where: { id: idsToDelete }
      });
    }

    return recent;
  }

  async deleteRecentSearch(userId, queryId) {
    if (queryId === "all") {
      await db.RecentSearch.destroy({
        where: { user_id: userId }
      });
    } else {
      await db.RecentSearch.destroy({
        where: {
          id: queryId,
          user_id: userId
        }
      });
    }
    return true;
  }

  async getFilterMetadata() {
    const minMaxPrice = await db.Service.findOne({
      attributes: [
        [db.sequelize.fn("MIN", db.sequelize.col("minimum_price")), "minPrice"],
        [db.sequelize.fn("MAX", db.sequelize.col("minimum_price")), "maxPrice"]
      ]
    });

    return {
      categories: categoriesList,
      priceRange: {
        min: minMaxPrice?.dataValues?.minPrice || 500,
        max: minMaxPrice?.dataValues?.maxPrice || 10000
      },
      ratings: [4.5, 4.0, 3.5, 3.0],
      experiences: [2, 5, 8, 10]
    };
  }

  async addFavorite(userId, artistId) {
    const favorite = await db.Favorite.findOrCreate({
      where: {
        user_id: userId,
        artist_id: artistId
      }
    });
    return favorite[0];
  }

  async removeFavorite(userId, artistId) {
    await db.Favorite.destroy({
      where: {
        user_id: userId,
        artist_id: artistId
      }
    });
    return true;
  }

  async getFavorites(userId) {
    const favorites = await db.Favorite.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "phone", "profile_image", "gender"]
            },
            {
              model: db.Service,
              as: "services",
              required: false
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return favorites.map((f) => f.artist).filter(Boolean);
  }

  async getHomeDashboard(lat, lng, userId) {
    const [categories, offers, featured, popular] = await Promise.all([
      this.getCategories(),
      this.getOffers(),
      this.getFeaturedArtists(lat, lng),
      this.getPopularArtists(lat, lng),
    ]);

    let recentlyBooked = [];
    if (userId) {
      try {
        recentlyBooked = await this.getRecentlyBookedArtists(userId);
      } catch (err) {
        console.error("Error fetching recently booked artists:", err.message);
      }
    }

    return {
      categories,
      offers,
      featuredArtists: featured,
      popularArtists: popular,
      recentlyBooked
    };
  }

  async getRecentlyBookedArtists(userId) {
    const bookings = await db.Booking.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["name", "profile_image", "city"] }]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["specialization_name"]
        }
      ]
    });

    const uniqueArtistsMap = new Map();
    bookings.forEach((b) => {
      if (b.artist && !uniqueArtistsMap.has(b.artist.id)) {
        uniqueArtistsMap.set(b.artist.id, {
          id: b.artist.id,
          name: b.artist.user?.name,
          profile_image: b.artist.user?.profile_image,
          specialization_name: b.service?.specialization_name || "Specialist",
          booking_date: b.createdAt,
          avg_rating: b.artist.avg_rating || "4.8",
          city: b.artist.user?.city || "Jaipur"
        });
      }
    });

    return Array.from(uniqueArtistsMap.values());
  }

  // Portfolio & Gallery Management
  async getPortfolios(query = "", filters = {}, page = 1, limit = 10) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = {
      visibility: true
    };

    if (filters.category) {
      where.category = { [Op.iLike || Op.like]: `%${filters.category}%` };
    }

    if (filters.occasion) {
      where.occasion = { [Op.iLike || Op.like]: `%${filters.occasion}%` };
    }

    if (query) {
      const searchPattern = `%${query}%`;
      where[Op.or] = [
        { title: { [Op.iLike || Op.like]: searchPattern } },
        { caption: { [Op.iLike || Op.like]: searchPattern } },
        { description: { [Op.iLike || Op.like]: searchPattern } },
        { tags: { [Op.iLike || Op.like]: searchPattern } },
        { category: { [Op.iLike || Op.like]: searchPattern } },
        { occasion: { [Op.iLike || Op.like]: searchPattern } }
      ];
    }

    let order = [];
    if (filters.sort === "newest") {
      order.push(["createdAt", "DESC"]);
    } else if (filters.sort === "oldest") {
      order.push(["createdAt", "ASC"]);
    } else if (filters.sort === "most_liked") {
      order.push(["likes_count", "DESC"]);
    } else {
      order.push(["display_order", "ASC"], ["createdAt", "DESC"]);
    }

    const list = await db.Portfolio.findAndCountAll({
      where,
      order,
      limit: Number(limit),
      offset: Number(offset),
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image"]
            }
          ]
        }
      ]
    });

    return list;
  }

  async likePortfolio(userId, portfolioId) {
    const like = await db.PortfolioLike.findOrCreate({
      where: { user_id: userId, portfolio_id: portfolioId }
    });
    
    // Increment likes counter in portfolios table
    await db.Portfolio.increment("likes_count", {
      by: 1,
      where: { id: portfolioId }
    });

    return like[0];
  }

  async unlikePortfolio(userId, portfolioId) {
    const deleted = await db.PortfolioLike.destroy({
      where: { user_id: userId, portfolio_id: portfolioId }
    });

    if (deleted > 0) {
      await db.Portfolio.decrement("likes_count", {
        by: 1,
        where: { id: portfolioId }
      });
    }

    return true;
  }

  async savePortfolio(userId, portfolioId) {
    const save = await db.PortfolioSave.findOrCreate({
      where: { user_id: userId, portfolio_id: portfolioId }
    });
    return save[0];
  }

  async unsavePortfolio(userId, portfolioId) {
    await db.PortfolioSave.destroy({
      where: { user_id: userId, portfolio_id: portfolioId }
    });
    return true;
  }

  async getSavedPortfolios(userId) {
    const list = await db.PortfolioSave.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Portfolio,
          as: "portfolio",
          include: [
            {
              model: db.ArtistProfile,
              as: "artist",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["id", "name", "profile_image"]
                }
              ]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return list.map((item) => item.portfolio).filter(Boolean);
  }

  async getLikedPortfolioIds(userId) {
    const likes = await db.PortfolioLike.findAll({
      where: { user_id: userId },
      attributes: ["portfolio_id"]
    });
    return likes.map((l) => l.portfolio_id);
  }

  async getSavedPortfolioIds(userId) {
    const saves = await db.PortfolioSave.findAll({
      where: { user_id: userId },
      attributes: ["portfolio_id"]
    });
    return saves.map((s) => s.portfolio_id);
  }

  async getDashboard(userId) {
    const [user, wallet, totalBookings, recentBookings, pendingReviewBooking, pendingSettlementBooking] = await Promise.all([
      db.User.findByPk(userId, {
        attributes: ["id", "name", "phone", "email", "profile_image", "createdAt"]
      }),
      db.Wallet.findOne({ where: { user_id: userId } }),
      db.Booking.count({ where: { user_id: userId } }),
      db.Booking.findAll({
        where: { user_id: userId },
        limit: 3,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: db.ArtistProfile,
            as: "artist",
            include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
          },
          {
            model: db.Service,
            as: "service",
            attributes: ["specialization_name", "minimum_price"]
          }
        ]
      }),
      db.Booking.findOne({
        where: {
          user_id: userId,
          booking_status: "COMPLETED",
          payment_status: "PAID",
          review_skipped: false
        },
        include: [
          {
            model: db.ArtistProfile,
            as: "artist",
            include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
          },
          {
            model: db.Service,
            as: "service",
            attributes: ["specialization_name", "minimum_price"]
          }
        ],
        order: [["updatedAt", "DESC"]]
      }),
      db.Booking.findOne({
        where: {
          user_id: userId,
          booking_status: "COMPLETED",
          payment_status: "PENDING",
          detailed_status: { [db.Sequelize.Op.notIn]: ["COMPLETED_CLOSED", "CASH_DISPUTED"] }
        },
        include: [
          {
            model: db.ArtistProfile,
            as: "artist",
            include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
          },
          {
            model: db.Service,
            as: "service",
            attributes: ["specialization_name", "minimum_price"]
          }
        ],
        order: [["updatedAt", "DESC"]]
      })
    ]);

    if (!user) throw new Error("User not found");

    let filledFields = 0;
    const totalFields = 4;
    if (user.name) filledFields++;
    if (user.phone) filledFields++;
    if (user.email) filledFields++;
    if (user.profile_image) filledFields++;
    const profileCompletion = Math.round((filledFields / totalFields) * 100);

    let finalPendingReviewBooking = null;
    if (pendingReviewBooking) {
      const isReviewed = await db.Review.findOne({ where: { booking_id: pendingReviewBooking.id } });
      if (!isReviewed) {
        finalPendingReviewBooking = pendingReviewBooking;

      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profile_image: user.profile_image,
        createdAt: user.createdAt,
        profileCompletion,
        memberBadge: totalBookings >= 5 ? "Platinum Member" : totalBookings >= 2 ? "Gold Member" : "Silver Member"
      },
      walletBalance: wallet ? wallet.balance : 0,
      totalBookings,
      recentBookings,
      pendingReviewBooking: finalPendingReviewBooking,
      pendingSettlementBooking: pendingSettlementBooking

    };
  }

  async getBookings(userId) {
    return await db.Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
        },
        {
          model: db.Service,
          as: "service",
          attributes: ["specialization_name", "minimum_price"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async getProfile(userId) {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "name", "phone", "email", "profile_image", "createdAt"]
    });
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateProfile(userId, data) {
    const AppError = require("../utils/errors/app.error");
    const user = await db.User.findByPk(userId);
    if (!user) throw new AppError("User not found", 404);

    const updates = {};
    if (data.name && data.name.trim()) updates.name = data.name.trim();

    const newAvatar = data.profile_image || data.profileImage;
    if (newAvatar) updates.profile_image = newAvatar;

    if (data.email && data.email.trim() && data.email.trim().toLowerCase() !== user.email) {
      const cleanEmail = data.email.trim().toLowerCase();
      const existingEmail = await db.User.findOne({ where: { email: cleanEmail } });
      if (existingEmail && Number(existingEmail.id) !== Number(userId)) {
        throw new AppError("This email address is already registered with another account.", 400);
      }
      updates.email = cleanEmail;
    }

    if (data.phone) {
      const cleanPhone = String(data.phone).trim().replace(/[^0-9]/g, "");
      if (cleanPhone && cleanPhone !== user.phone) {
        const existingPhone = await db.User.findOne({ where: { phone: cleanPhone } });
        if (existingPhone && Number(existingPhone.id) !== Number(userId)) {
          throw new AppError("This phone number is already registered with another account.", 400);
        }
        updates.phone = cleanPhone;
      }
    }

    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }

    return user;
  }

  async getWishlist(userId) {
    return await this.getFavorites(userId);
  }

  async getCoupons() {
    return await db.Coupon.findAll({
      order: [["expiresAt", "ASC"]]
    });
  }

  async getNotifications(userId) {
    return await db.Notification.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]]
    });
  }

  async getAddresses(userId) {
    return await db.Address.findAll({
      where: { user_id: userId },
      order: [["is_default", "DESC"], ["createdAt", "DESC"]]
    });
  }

  async getReviews(userId) {
    return await db.Review.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Booking,
          as: "booking",
          attributes: ["booking_code"]
        },
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["name"] }]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }

  async addAddress(userId, data) {
    const { name, addressLine1, addressLine2, city, state, pincode, isDefault } = data;
    if (isDefault) {
      await db.Address.update({ is_default: false }, { where: { user_id: userId } });
    }
    return await db.Address.create({
      user_id: userId,
      name,
      address_line_1: addressLine1,
      address_line_2: addressLine2 || null,
      city,
      state,
      pincode,
      is_default: !!isDefault
    });
  }

  async deleteAddress(userId, addressId) {
    return await db.Address.destroy({ where: { id: addressId, user_id: userId } });
  }
}

module.exports = new CustomerService();
