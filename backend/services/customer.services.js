const db = require("../models");
const { Op } = require("sequelize");
const ArtistProfileRepository = require("../repositories/artistProfile.repository");

const repo = new ArtistProfileRepository();

const categoriesList = [
  { id: "1", name: "Bridal Mehndi", slug: "bridal", icon: "flower-outline", image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=300" },
  { id: "2", name: "Arabic Mehndi", slug: "arabic", icon: "brush-outline", image: "https://images.unsplash.com/photo-1601054790522-d08317b75567?q=80&w=300" },
  { id: "3", name: "Royal Mehndi", slug: "royal", icon: "ribbon-outline", image: "https://images.unsplash.com/photo-1601054790740-975949514f7b?q=80&w=300" },
  { id: "4", name: "Portrait Mehndi", slug: "portrait", icon: "person-outline", image: "https://images.unsplash.com/photo-1601054791559-0a67ab92b6a2?q=80&w=300" },
  { id: "5", name: "Engagement Mehndi", slug: "engagement", icon: "heart-outline", image: "https://images.unsplash.com/photo-1601054791572-c510255b77ea?q=80&w=300" },
  { id: "6", name: "Festival Mehndi", slug: "festival", icon: "sparkles-outline", image: "https://images.unsplash.com/photo-1601054791585-fb4050d24bf5?q=80&w=300" },
  { id: "7", name: "Kids Mehndi", slug: "kids", icon: "happy-outline", image: "https://images.unsplash.com/photo-1601054791599-23efbf1c65d6?q=80&w=300" },
  { id: "8", name: "Custom Design", slug: "custom", icon: "color-palette-outline", image: "https://images.unsplash.com/photo-1601054791612-4029237c1d76?q=80&w=300" },
];

const offersList = [
  { id: "1", title: "Festival Special flat 20% off", description: "Get flat 20% off on all bookings this Teej. Code: TEEJ20", code: "TEEJ20", discount: "20%", banner: "https://images.unsplash.com/photo-1601054790522-d08317b75567?q=80&w=600" },
  { id: "2", title: "Flat ₹500 off on Bridal Mehndi", description: "Flat ₹500 discount for Bridal bookings above ₹4000. Code: BRIDAL500", code: "BRIDAL500", discount: "₹500", banner: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=600" },
  { id: "3", title: "10% Cashback on Wallet payment", description: "Pay via MehndiGo Wallet and get 10% cashback up to ₹200.", code: "WALLET10", discount: "10%", banner: "https://images.unsplash.com/photo-1601054790740-975949514f7b?q=80&w=600" },
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
      const db = require("../models");
      const list = await db.Category.findAll({
        where: { status: "ACTIVE" },
        order: [["sort_order", "ASC"]]
      });
      if (list && list.length > 0) {
        return list;
      }
    } catch (err) {
      console.log("Error fetching dynamic categories from DB:", err.message);
    }
    return categoriesList;
  }

  async getOffers() {
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

    if (filters.category) {
      const normalizedCategory = filters.category.toLowerCase().replace(/\s+mehndi/g, "").replace(/\s+design/g, "").trim();
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (s.category Ilike '%${normalizedCategory}%' OR s.specialization_name Ilike '%${normalizedCategory}%')
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
        { bio: { [Op.iLike || Op.like]: searchPattern } },
        { city: { [Op.iLike || Op.like]: searchPattern } },
        { state: { [Op.iLike || Op.like]: searchPattern } },
        { pincode: { [Op.iLike || Op.like]: searchPattern } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Users" AS u 
          WHERE u.id = "ArtistProfile".user_id 
          AND u.name Ilike '${searchPattern}'
        )`),
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (s.specialization_name Ilike '${searchPattern}' OR s.category Ilike '${searchPattern}')
        )`)
      ];
    }

    let attributes = {
      include: []
    };
    let order = [];

    let distanceSql = null;
    if (lat && lng) {
      distanceSql = `(6371 * acos(cos(radians(${Number(lat)})) * cos(radians(latitude::double precision)) * cos(radians(longitude::double precision) - radians(${Number(lng)})) + sin(radians(${Number(lat)})) * sin(radians(latitude::double precision))))`;
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

    const matchingArtists = await db.User.findAll({
      where: {
        role: "ARTIST",
        name: { [Op.iLike]: searchPattern }
      },
      attributes: ["name"],
      limit: 3
    });

    const matchingServices = await db.Service.findAll({
      where: {
        specialization_name: { [Op.iLike]: searchPattern }
      },
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("specialization_name")), "specialization_name"]
      ],
      limit: 3
    });

    const matchingCities = await db.ArtistProfile.findAll({
      where: {
        city: { [Op.iLike]: searchPattern }
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

  async getHomeDashboard(lat, lng) {
    const [categories, offers, featured, popular] = await Promise.all([
      this.getCategories(),
      this.getOffers(),
      this.getFeaturedArtists(lat, lng),
      this.getPopularArtists(lat, lng),
    ]);

    return {
      categories,
      offers,
      featuredArtists: featured,
      popularArtists: popular,
    };
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
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error("User not found");

    await user.update({
      name: data.name || user.name,
      email: data.email || user.email,
      phone: data.phone || user.phone,
      profile_image: data.profileImage || data.profile_image || user.profile_image
    });

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
