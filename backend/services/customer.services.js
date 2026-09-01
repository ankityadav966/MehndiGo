const db = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/errors/app.error");
const ArtistProfileRepository = require("../repositories/artistProfile.repository");

const repo = new ArtistProfileRepository();

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
      const { client: redisClient } = require("../../config/redis");
      if (redisClient.isReady) {
        const cached = await redisClient.get("home:categories");
        if (cached) return JSON.parse(cached);
      }
    } catch (e) { /* ignore redis error */ }

    try {
      const list = await db.Category.findAll({
        where: { status: "ACTIVE" },
        order: [["sort_order", "ASC"]]
      });
      if (list && list.length > 0) {
        try {
          const { client: redisClient } = require("../../config/redis");
          if (redisClient.isReady) await redisClient.setEx("home:categories", 3600, JSON.stringify(list));
        } catch (e) { /* ignore */ }
        return list;
      }
      return [];
    } catch (err) {
      console.log("Error fetching dynamic categories from DB:", err.message);
      return [];
    }
  }

  async getOffers() {
    try {
      const { client: redisClient } = require("../../config/redis");
      if (redisClient.isReady) {
        const cached = await redisClient.get("home:offers");
        if (cached) return JSON.parse(cached);
      }
    } catch (e) { /* ignore redis error */ }

    try {
      const db = require("../models");
      if (db.Banner) {
        const banners = await db.Banner.findAll({
          where: { is_active: true },
          order: [["createdAt", "DESC"]]
        });
        if (banners && banners.length > 0) {
          const mapped = banners.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || b.description,
            description: b.description || b.subtitle,
            code: b.promo_code || b.code || "",
            discount: b.discount_value ? `${b.discount_value}% OFF` : (b.discount || "Special Offer"),
            discount_text: b.discount_text || (b.discount_value ? `${b.discount_value}% OFF` : "Special Offer"),
            image: b.image_url || b.banner_image || b.image,
            banner: b.image_url || b.banner_image || b.image,
            banner_image: b.image_url || b.banner_image || b.image,
            image_url: b.image_url || b.banner_image || b.image,
            target_type: b.target_type || "category",
            target_id: b.target_id || null,
            cta_link: b.cta_link || "Coupons"
          }));

          try {
            const { client: redisClient } = require("../../config/redis");
            if (redisClient.isReady) await redisClient.setEx("home:offers", 3600, JSON.stringify(mapped));
          } catch (e) { /* ignore */ }

          return mapped;
        }
      }
    } catch (e) {
      console.log("Failed to load banners from DB:", e.message);
    }
    return offersList;
  }

  async getFeaturedArtists(lat, lng) {
    const response = await repo.getArtists({
      latitude: lat,
      longitude: lng,
      sort: "highest_rated",
      limit: 10
    });
    return response.rows;
  }

  async getNearbyArtists(lat, lng, radius, page, limit, filter) {
    if (!filter || filter === "All" || filter === "Nearest") {
      const response = await repo.getArtists({
        latitude: lat,
        longitude: lng,
        radius: radius || null,
        sort: "distance",
        page: page || 1,
        limit: limit || 15
      });
      return response;
    }

    let searchFilters = {};
    let sort = "nearest";

    if (filter === "Top Rated") {
      sort = "highest_rated";
    } else if (filter === "Price Low-High") {
      sort = "lowest_price";
    } else if (filter === "5+ Exp Years") {
      searchFilters.experience = 5;
    } else if (filter === "Bridal") {
      searchFilters.category = "Bridal";
    } else if (filter === "Home Service") {
      searchFilters.homeService = true;
    } else if (filter === "Verified") {
      searchFilters.verified = true;
    }

    return await this.searchArtists("", searchFilters, sort, lat, lng, page, limit);
  }

  async getPopularArtists(lat, lng) {
    const cacheKey = `home:popularArtists:${lat || "none"}:${lng || "none"}`;
    try {
      const { client: redisClient } = require("../../config/redis");
      if (redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) { /* ignore */ }

    const response = await repo.getArtists({
      latitude: lat,
      longitude: lng,
      sort: "trending",
      limit: 10
    });

    try {
      const { client: redisClient } = require("../../config/redis");
      if (redisClient.isReady) await redisClient.setEx(cacheKey, 3600, JSON.stringify(response.rows));
    } catch (e) { /* ignore */ }

    return response.rows;
  }

  async searchArtists(query, filters = {}, sort = "nearest", lat = null, lng = null, page = 1, limit = 15) {
    const offset = (Number(page) - 1) * Number(limit);
    let where = {
      verification_status: "APPROVED"
    };

    let categoryFilter = filters.category;
    if (!categoryFilter && (filters.categoryId || filters.category_id)) {
      try {
        const catRecord = await db.Category.findByPk(filters.categoryId || filters.category_id);
        if (catRecord) {
          categoryFilter = catRecord.name;
        }
      } catch (_) {}
    }

    if (categoryFilter) {
      const rawCategory = categoryFilter.trim();
      const cleanCategory = rawCategory
        .toLowerCase()
        .replace(/\s+mehendi/gi, "")
        .replace(/\s+mehndi/gi, "")
        .replace(/\s+design/gi, "")
        .trim();

      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (
            s.category ILIKE '%${cleanCategory}%' OR 
            s.specialization_name ILIKE '%${cleanCategory}%' OR
            s.category ILIKE '%${rawCategory}%' OR 
            s.specialization_name ILIKE '%${rawCategory}%'
          )
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
      const isPostgres = db.sequelize.getDialect() === "postgres";
      const likeOp = isPostgres ? Op.iLike : Op.like;
      const likeKw = isPostgres ? "ILIKE" : "LIKE";
      const trimmedQuery = query.trim();
      const searchPattern = `%${trimmedQuery}%`;
      const safePattern = `%${trimmedQuery.replace(/'/g, "''")}%`;
      where[Op.or] = [
        { bio: { [likeOp]: searchPattern } },
        { city: { [likeOp]: searchPattern } },
        { state: { [likeOp]: searchPattern } },
        { pincode: { [likeOp]: searchPattern } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM ${isPostgres ? '"Users"' : 'Users'} AS u 
          WHERE u.id = ${isPostgres ? '"ArtistProfile"' : 'ArtistProfile'}.user_id 
          AND u.name ${likeKw} '${safePattern}'
        )`),
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM ${isPostgres ? '"Services"' : 'Services'} AS s 
          WHERE s.artist_id = ${isPostgres ? '"ArtistProfile"' : 'ArtistProfile'}.id 
          AND (s.specialization_name ${likeKw} '${safePattern}' OR s.category ${likeKw} '${safePattern}')
        )`)
      ];
    }

    let attributes = {
      include: []
    };
    let order = [];

    let distanceSql = null;
    const isPostgres = db.sequelize.getDialect() === "postgres";
    const userAlias = isPostgres ? '"user"' : '`user`';
    const nowFunc = isPostgres ? 'NOW()' : 'DATETIME("now")';
    const boostCheck = `CASE WHEN ${userAlias}.boost_expires_at > ${nowFunc} THEN 1 ELSE 0 END`;

    if (lat && lng) {
      distanceSql = `(6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(${Number(lat)})) * cos(radians(COALESCE(latitude::double precision, ${Number(lat)}))) * cos(radians(COALESCE(longitude::double precision, ${Number(lng)})) - radians(${Number(lng)})) + sin(radians(${Number(lat)})) * sin(radians(COALESCE(latitude::double precision, ${Number(lat)})))))))`;
      attributes.include.push([db.sequelize.literal(distanceSql), "distance"]);
      
      if (filters.radius) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          db.sequelize.where(db.sequelize.literal(distanceSql), "<=", Number(filters.radius))
        );
      }
    }

    if (sort === "nearest" && distanceSql) {
      // Boosted artists appear 5km closer for ranking purposes
      order.push([db.sequelize.literal(`(${distanceSql}) - (${boostCheck} * 5)`), "ASC"]);
      order.push(["avg_rating", "DESC"]);
    } else if (sort === "highest_rated" || sort === "rating") {
      // Boosted artists get an artificial +0.5 rating bump for ranking purposes
      order.push([db.sequelize.literal(`avg_rating + (${boostCheck} * 0.5)`), "DESC"]);
      order.push(["total_reviews", "DESC"]);
    } else if (sort === "lowest_price") {
      order.push([
        db.sequelize.literal(`(
          SELECT COALESCE(MIN(minimum_price), 0) FROM ${isPostgres ? '"Services"' : 'Services'} AS s 
          WHERE s.artist_id = ${isPostgres ? '"ArtistProfile"' : 'ArtistProfile'}.id
        )`), "ASC"
      ]);
    } else if (sort === "highest_experience") {
      // Boosted artists get +2 years experience for ranking
      order.push([db.sequelize.literal(`experience_years + (${boostCheck} * 2)`), "DESC"]);
    } else if (sort === "trending" || sort === "most_booked") {
      // Boosted artists get +10 virtual bookings for ranking
      order.push([db.sequelize.literal(`total_bookings + (${boostCheck} * 10)`), "DESC"]);
      order.push(["avg_rating", "DESC"]);
    } else {
      order.push([db.sequelize.literal(boostCheck), "DESC"]);
      order.push(["createdAt", "DESC"]);
    }

    const artists = await db.ArtistProfile.findAndCountAll({
      where,
      attributes,
      distinct: true,
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
        },
        {
          model: db.Portfolio,
          as: "portfolio",
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
      data.languages = item.languages || "Hindi, English, Rajasthani";
      return data;
    });

    return {
      count: artists.count,
      rows: mappedRows
    };
  }

  async getArtistById(artistId) {
    if (!artistId || isNaN(Number(artistId))) {
      return null;
    }
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { id: Number(artistId) },
          { user_id: Number(artistId) }
        ]
      },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "phone", "email", "profile_image", "gender", "createdAt"]
        },
        {
          model: db.Service,
          as: "services",
          required: false,
          include: [
            {
              model: db.ServicePackage,
              as: "packages",
              required: false
            },
            {
              model: db.ServiceAddon,
              as: "addons",
              required: false
            }
          ]
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
    delete data.aadhaar_number;
    delete data.aadhaar_front;
    delete data.aadhaar_back;
    delete data.pan_number;
    delete data.bank_account_number;
    delete data.selfie_image;

    data.response_time = artist.id % 2 === 0 ? "15 mins" : "within 2 hours";
    data.languages = data.languages || "Hindi, English, Rajasthani";

    // Dynamic trust badge metrics
    const avgRating = Number(data.avg_rating || 0);
    const expYears = Number(data.experience_years || 0);
    const totReviews = Number(data.total_reviews || 0);
    const totBookings = Number(data.total_bookings || 0);

    data.is_verified = data.verification_status === "APPROVED";
    data.is_premium = Boolean(data.is_featured || (avgRating >= 4.7 && expYears >= 3));
    data.is_top_rated = Boolean(avgRating >= 4.8 && (totReviews >= 2 || totBookings >= 3));

    // Dynamic availability state
    if (data.is_available === false || data.is_available === 0) {
      data.availability_status = "UNAVAILABLE";
      data.availability_label = "Unavailable / Offline";
    } else {
      data.availability_status = "AVAILABLE";
      data.availability_label = "Available for Booking";
    }

    // Dynamic Trust Factors
    data.trust_factors = [
      { id: "verified", icon: "shield-checkmark", label: "Identity & KYC Verified" },
      (expYears > 0) ? { id: "experience", icon: "ribbon", label: `${expYears}+ Years Experience` } : null,
      { id: "organic", icon: "leaf", label: "100% Organic Henna Guarantee" },
      { id: "hygiene", icon: "sparkles", label: "Sanitized & Fresh Cones" },
      data.home_service ? { id: "home_service", icon: "home", label: "Home Service Available" } : null,
      data.salon_service ? { id: "studio_service", icon: "business", label: "Studio Appointments Available" } : null,
      data.custom_design_enabled ? { id: "custom", icon: "color-palette", label: "Custom Designs Welcome" } : null,
      { id: "ontime", icon: "timer", label: "On-Time Arrival Guarantee" }
    ].filter(Boolean);

    // Starting price computation
    if (!data.starting_price && Array.isArray(data.services) && data.services.length > 0) {
      const prices = data.services.map(s => Number(s.minimum_price || 0)).filter(p => p > 0);
      if (prices.length > 0) {
        data.starting_price = Math.min(...prices);
      }
    }
    if (!data.starting_price) data.starting_price = 0;

    return data;
  }

  async getArtistServices(artistId) {
    if (!artistId || isNaN(Number(artistId))) {
      return [];
    }
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { id: Number(artistId) },
          { user_id: Number(artistId) }
        ]
      }
    });
    if (!artist) {
      return [];
    }

    const services = await db.Service.findAll({
      where: {
        artist_id: { [db.Sequelize.Op.in]: [artist.id, artist.user_id] },
        is_active: true
      },
      include: [
        {
          model: db.ServicePackage,
          as: "packages",
          required: false
        },
        {
          model: db.ServiceAddon,
          as: "addons",
          required: false
        }
      ],
      order: [["id", "ASC"]]
    });
    return services;
  }

  async getArtistPortfolio(artistId, filters = {}) {
    const artist = await db.ArtistProfile.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { id: Number(artistId) },
          { user_id: Number(artistId) }
        ]
      }
    });

    if (!artist || artist.verification_status !== "APPROVED") {
      return [];
    }

    let whereClause = {
      artist_id: { [db.Sequelize.Op.in]: [artist.id, artist.user_id] },
      visibility: true
    };

    if (filters.category && filters.category !== "All") {
      whereClause.category = { [db.Sequelize.Op.iLike]: `%${filters.category}%` };
    }
    if (filters.art_tier) {
      whereClause.art_tier = filters.art_tier;
    }
    if (filters.complexity_level) {
      whereClause.complexity_level = filters.complexity_level;
    }

    let order = [
      ["display_order", "ASC"],
      ["createdAt", "DESC"]
    ];

    if (filters.sort === "popular") {
      order = [["likes_count", "DESC"], ["views_count", "DESC"]];
    } else if (filters.sort === "price_asc") {
      order = [["price", "ASC"]];
    } else if (filters.sort === "price_desc") {
      order = [["price", "DESC"]];
    }

    const portfolio = await db.Portfolio.findAll({
      where: whereClause,
      order
    });
    return portfolio;
  }

  async getArtistServiceCatalog(artistId, serviceId, filters = {}, sort = "popular") {
    if (!artistId || isNaN(Number(artistId))) {
      throw new AppError("Valid artist ID is required", 400);
    }
    if (!serviceId || isNaN(Number(serviceId))) {
      throw new AppError("Valid service ID is required", 400);
    }

    const artist = await this.getArtistById(artistId);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    const service = await db.Service.findOne({
      where: {
        id: Number(serviceId),
        is_active: true
      },
      include: [
        {
          model: db.ServicePackage,
          as: "packages",
          required: false
        },
        {
          model: db.ServiceAddon,
          as: "addons",
          required: false
        }
      ]
    });

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    // Fetch portfolio designs that match this service's category/specialization or artist designs
    const targetCategory = service.category || service.specialization_name || "";
    let portfolioWhere = {
      artist_id: { [db.Sequelize.Op.in]: [artist.id, artist.user_id] },
      visibility: true
    };

    if (filters.complexity && filters.complexity !== "ALL") {
      portfolioWhere.complexity_level = filters.complexity.toUpperCase();
    }
    if (filters.art_tier && filters.art_tier !== "ALL") {
      portfolioWhere.art_tier = filters.art_tier.toUpperCase();
    }

    let portfolioOrder = [["display_order", "ASC"], ["createdAt", "DESC"]];
    if (sort === "popular") {
      portfolioOrder = [["likes_count", "DESC"], ["views_count", "DESC"]];
    } else if (sort === "newest") {
      portfolioOrder = [["createdAt", "DESC"]];
    } else if (sort === "price_asc") {
      portfolioOrder = [["price", "ASC"]];
    } else if (sort === "price_desc") {
      portfolioOrder = [["price", "DESC"]];
    }

    let designs = await db.Portfolio.findAll({
      where: portfolioWhere,
      order: portfolioOrder
    });

    // If designs matching category exist, prioritize them, else return all artist designs
    if (targetCategory) {
      const catClean = targetCategory.toLowerCase().trim();
      const matched = designs.filter(d => (d.category || "").toLowerCase().includes(catClean) || (d.occasion || "").toLowerCase().includes(catClean) || (d.title || "").toLowerCase().includes(catClean));
      if (matched.length > 0 && (!filters.complexity && !filters.art_tier)) {
        designs = matched;
      }
    }

    return {
      artist: {
        id: artist.id,
        user_id: artist.user_id,
        name: artist.user?.name || "Mehndi Artist",
        profile_image: artist.user?.profile_image,
        avg_rating: artist.avg_rating,
        total_reviews: artist.total_reviews,
        experience_years: artist.experience_years,
        is_verified: artist.is_verified,
        is_premium: artist.is_premium,
        city: artist.city
      },
      service,
      designs,
      packages: service.packages || [],
      addons: service.addons || []
    };
  }

  async createCustomDesignRequest(userId, requestData) {
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }
    const {
      artist_id,
      artistId,
      service_id,
      serviceId,
      occasion,
      preferred_style,
      description,
      reference_images,
      group_size = 1,
      service_coverage = "BOTH_HANDS",
      budget_preference,
      preferred_date,
      preferred_time,
      address,
      landmark,
      latitude,
      longitude
    } = requestData;

    const targetArtistId = Number(artist_id || artistId);
    if (!targetArtistId || isNaN(targetArtistId)) {
      throw new AppError("Valid artist ID is required", 400);
    }

    const artist = await db.ArtistProfile.findByPk(targetArtistId);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    let customRequest;
    if (db.CustomDesignRequest) {
      customRequest = await db.CustomDesignRequest.create({
        user_id: userId,
        artist_id: targetArtistId,
        service_id: service_id || serviceId || null,
        occasion: occasion || "Special Occasion",
        preferred_style: preferred_style || "Custom Style",
        description: description || "Custom design requested by client.",
        reference_images: Array.isArray(reference_images) ? reference_images : [],
        group_size: Number(group_size || 1),
        service_coverage: service_coverage || "BOTH_HANDS",
        budget_preference: budget_preference ? Number(budget_preference) : null,
        preferred_date: preferred_date || null,
        preferred_time: preferred_time || null,
        address: address || null,
        landmark: landmark || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        status: "PENDING"
      });
    }

    // Also trigger in-app notification to artist
    try {
      const pushService = require("./push.services");
      if (pushService && typeof pushService.sendNotification === "function") {
        await pushService.sendNotification(
          artist.user_id,
          "New Custom Design Request 🎨",
          `A client has requested a custom ${occasion || "mehndi"} design with reference photos. Tap to review.`,
          { type: "CUSTOM_DESIGN_REQUEST", requestId: customRequest?.id }
        );
      }
    } catch (e) {
      console.log("Notification send notice:", e.message);
    }

    return customRequest || { success: true, message: "Custom design request submitted successfully" };
  }

  async getArtistFaqs(artistId) {
    let faqs = [];
    if (db.FAQ) {
      try {
        faqs = await db.FAQ.findAll({
          where: { is_active: true },
          order: [["id", "ASC"]]
        });
      } catch (e) {
        console.log("FAQ fetch notice:", e.message);
      }
    }

    // Default artist FAQs
    const defaultFaqs = [
      {
        id: 1,
        question: "Do you provide home service?",
        answer: "Yes! We provide convenient doorstep mehndi services at your home, hotel, or venue across the city. Free travel within our local radius."
      },
      {
        id: 2,
        question: "How much advance payment is required?",
        answer: "Only a nominal 10% advance is required to secure your appointment on MehndiGo. The remaining balance is payable directly after service completion."
      },
      {
        id: 3,
        question: "Can I choose or provide my own custom design?",
        answer: "Absolutely! You can upload your own reference photos or pick from our catalog. Our artists specialize in bespoke tailoring to your preferences."
      },
      {
        id: 4,
        question: "How long does bridal mehndi application take?",
        answer: "Full bridal mehndi typically takes 3 to 4 hours depending on intricacy, while party designs take 20 to 45 minutes per person."
      },
      {
        id: 5,
        question: "What is your cancellation and reschedule policy?",
        answer: "You can reschedule or cancel for a full advance refund up to 24 hours before the scheduled time slot via the MehndiGo app."
      }
    ];

    return faqs.length > 0 ? faqs : defaultFaqs;
  }

  async getArtistOffers(artistId) {
    let coupons = [];
    if (db.Coupon) {
      try {
        coupons = await db.Coupon.findAll({
          where: {
            is_active: true,
            expires_at: { [db.Sequelize.Op.gt]: new Date() }
          },
          order: [["id", "ASC"]]
        });
      } catch (e) {
        console.log("Coupons fetch notice:", e.message);
      }
    }

    return coupons;
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

  async getReviews(userId) {
    const reviews = await db.Review.findAll({
      where: { user_id: userId },
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
        },
        {
          model: db.Booking,
          as: "booking",
          attributes: ["id", "booking_code", "booking_date", "booking_status", "total_amount"]
        },
        {
          model: db.ReviewReply,
          as: "replies"
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    return reviews;
  }

  async getArtistAvailability(artistId, query = {}) {
    if (!artistId || isNaN(Number(artistId))) {
      throw new AppError("Valid artist ID is required", 400);
    }

    const artist = await db.ArtistProfile.findByPk(Number(artistId));
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    const slots = await db.AvailabilitySlot.findAll({
      where: { artist_id: Number(artistId) },
      order: [["start_time", "ASC"]]
    });

    const { date, selected_art_id, group_size = 1, latitude, longitude } = query;
    const bookingService = require("./booking.services");

    const targetDate = date ? String(date).substring(0, 10) : new Date().toISOString().substring(0, 10);
    const dayOfWeek = new Date(targetDate + "T12:00:00.000Z").toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

    const workingDays = Array.isArray(artist.working_days) ? artist.working_days : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const leaveDates = Array.isArray(artist.leave_dates) ? artist.leave_dates : [];

    const isWorkingDay = workingDays.includes(dayOfWeek);
    const isLeave = leaveDates.includes(targetDate);

    // Selected Art Duration
    let artDuration = 60;
    if (selected_art_id) {
      const art = await db.Portfolio.findByPk(selected_art_id);
      if (art && art.duration_minutes) {
        artDuration = Number(art.duration_minutes);
      }
    }
    const totalDesignDuration = artDuration * Math.max(1, Number(group_size || 1));

    // Travel calculation from previous booking on that day
    let travelInfo = { distanceKm: 0, durationMins: 0, originType: "HOME_BASE", originAddress: "" };
    try {
      travelInfo = await bookingService.calculateTravelAndSequence(
        artistId,
        targetDate,
        null,
        latitude,
        longitude
      );
    } catch (tErr) {
      // Fallback travel info
    }

    // Build standard time slots with feasibility
    const timeTemplates = [
      { label: "10:00 AM", startTimeStr: `${targetDate}T10:00:00.000Z`, endTimeStr: `${targetDate}T13:00:00.000Z` },
      { label: "02:00 PM", startTimeStr: `${targetDate}T14:00:00.000Z`, endTimeStr: `${targetDate}T17:00:00.000Z` },
      { label: "06:00 PM", startTimeStr: `${targetDate}T18:00:00.000Z`, endTimeStr: `${targetDate}T21:00:00.000Z` }
    ];

    const existingBookings = await db.Booking.findAll({
      where: {
        artist_id: Number(artistId),
        booking_status: { [Op.notIn]: ["CANCELLED", "REFUNDED"] }
      },
      include: [{ model: db.AvailabilitySlot, as: "slot", required: false }]
    });

    const bookingsOnDate = existingBookings.filter((b) => {
      if (b.slot?.start_time) {
        const slotDate = new Date(b.slot.start_time).toISOString().substring(0, 10);
        if (slotDate === targetDate) return true;
      }
      if (b.reschedule_date) {
        const resDate = new Date(b.reschedule_date).toISOString().substring(0, 10);
        if (resDate === targetDate) return true;
      }
      if (b.notes && b.notes.includes(targetDate)) return true;
      return false;
    });

    const isApproved = artist.verification_status === "APPROVED";
    const isMasterAvailable = artist.is_available !== false;
    const workStart = artist.working_start_time || "09:00";
    const workEnd = artist.working_end_time || "20:00";
    const breakStart = artist.break_start_time;
    const breakEnd = artist.break_end_time;

    const smartSlots = timeTemplates.map((t) => {
      const slotStartTime = new Date(t.startTimeStr);
      const isBooked = bookingsOnDate.some((b) => {
        if (b.slot?.start_time && new Date(b.slot.start_time).getTime() === slotStartTime.getTime()) return true;
        if (b.notes && b.notes.includes(t.label)) return true;
        return false;
      });

      // Extract HH:mm for the template slot
      const timeStr = t.label.includes("10:00") ? "10:00" : t.label.includes("02:00") ? "14:00" : "18:00";
      const slotEndStr = t.label.includes("10:00") ? "13:00" : t.label.includes("02:00") ? "17:00" : "21:00";

      const withinWorkingHours = timeStr >= workStart && slotEndStr <= workEnd;
      let overlapsBreak = false;
      if (breakStart && breakEnd) {
        if (timeStr < breakEnd && slotEndStr > breakStart) {
          overlapsBreak = true;
        }
      }

      const isFeasible = isApproved && isMasterAvailable && isWorkingDay && !isLeave && !isBooked && withinWorkingHours && !overlapsBreak;

      return {
        label: t.label,
        start_time: t.startTimeStr,
        end_time: t.endTimeStr,
        is_available: isFeasible,
        is_booked: isBooked,
        travel_distance_km: travelInfo.distanceKm || 0,
        travel_duration_mins: travelInfo.durationMins || 0,
        travel_origin_type: travelInfo.originType || "HOME_BASE",
        travel_origin_address: travelInfo.originAddress || "",
        design_duration_mins: totalDesignDuration,
        prep_buffer_mins: 15,
        cooldown_buffer_mins: 20,
        total_block_mins: (travelInfo.durationMins || 0) + totalDesignDuration + 15 + 20
      };
    });

    return {
      artist_id: Number(artistId),
      date: targetDate,
      is_working_day: isWorkingDay,
      is_on_leave: isLeave,
      working_hours: `${artist.working_start_time || '09:00'} - ${artist.working_end_time || '20:00'}`,
      break_hours: `${artist.break_start_time || '14:00'} - ${artist.break_end_time || '15:00'}`,
      travel_info: travelInfo,
      smart_slots: smartSlots,
      raw_slots: slots
    };
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
      attributes: ["id", "name"],
      include: [
        {
          model: db.ArtistProfile,
          as: "artistProfile",
          attributes: ["id"]
        }
      ],
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
    matchingArtists.forEach((a) => {
      suggestions.push({
        type: "artist",
        text: a.name,
        artistId: a.artistProfile?.id || a.id
      });
    });
    matchingServices.forEach((s) => suggestions.push({ type: "service", text: s.specialization_name }));
    matchingCities.forEach((c) => suggestions.push({ type: "city", text: c.city }));

    try {
      const activeCats = await this.getCategories();
      (activeCats || []).forEach((cat) => {
        if (cat.name && cat.name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({ type: "category", text: cat.name, id: cat.id });
        }
      });
    } catch (_) {}

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
    const [minMaxPrice, categories] = await Promise.all([
      db.Service.findOne({
        attributes: [
          [db.sequelize.fn("MIN", db.sequelize.col("minimum_price")), "minPrice"],
          [db.sequelize.fn("MAX", db.sequelize.col("minimum_price")), "maxPrice"]
        ]
      }),
      this.getCategories()
    ]);

    return {
      categories: categories || [],
      priceRange: {
        min: minMaxPrice?.dataValues?.minPrice || 500,
        max: minMaxPrice?.dataValues?.maxPrice || 10000
      },
      ratings: [4.5, 4.0, 3.5, 3.0],
      experiences: [2, 5, 8, 10]
    };
  }

  async addFavorite(userId, artistId) {
    if (!artistId) {
      throw new AppError("Artist ID is required", 400);
    }

    let targetArtistId = Number(artistId);
    let artist = await db.ArtistProfile.findByPk(targetArtistId);
    if (!artist) {
      const byUser = await db.ArtistProfile.findOne({ where: { user_id: targetArtistId } });
      if (!byUser) {
        throw new AppError("Artist profile not found", 404);
      }
      targetArtistId = byUser.id;
    }

    const [favorite] = await db.Favorite.findOrCreate({
      where: {
        user_id: userId,
        artist_id: targetArtistId
      }
    });
    return favorite;
  }

  async removeFavorite(userId, artistId) {
    if (!artistId) {
      throw new AppError("Artist ID is required", 400);
    }

    const targetArtistIds = [Number(artistId)];
    const byUser = await db.ArtistProfile.findOne({ where: { user_id: Number(artistId) } });
    if (byUser) {
      targetArtistIds.push(byUser.id);
    }

    await db.Favorite.destroy({
      where: {
        user_id: userId,
        artist_id: { [db.Sequelize.Op.in]: targetArtistIds }
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

    return favorites
      .map((f) => {
        if (!f.artist) return null;
        const a = f.artist.toJSON ? f.artist.toJSON() : { ...f.artist };
        a.is_favorite = true;
        a.favorite_id = f.id;
        return a;
      })
      .filter(Boolean);
  }

  async getHomeDashboard(lat, lng, userId) {
    const [categories, offers, featured, popular, recommendations] = await Promise.all([
      this.getCategories(),
      this.getOffers(),
      this.getFeaturedArtists(lat, lng),
      this.getPopularArtists(lat, lng),
      this.getPersonalizedRecommendations(lat, lng, userId),
    ]);

    const activeFestival = this.getActiveFestivalCampaign();

    let recentlyBooked = [];
    let pendingPaymentBooking = null;
    let pendingReviewBooking = null;

    if (userId) {
      try {
        const bookingService = require("./booking.services");
        
        const [recent, pendingPay, pendingReview] = await Promise.all([
          this.getRecentlyBookedArtists(userId),
          bookingService.getPendingPayment(userId),
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
          }).then(b => b ? b.toJSON() : null).catch(() => null)
        ]);
        
        recentlyBooked = recent || [];
        pendingPaymentBooking = pendingPay;
        pendingReviewBooking = pendingReview;
      } catch (err) {
        console.error("Error fetching personalized dashboard extensions:", err.message);
      }
    }

    return {
      categories,
      offers,
      featuredArtists: featured,
      popularArtists: popular,
      recommendations,
      activeFestival,
      recentlyBooked,
      pendingPaymentBooking,
      pendingReviewBooking
    };
  }

  getActiveFestivalCampaign() {
    const month = new Date().getMonth() + 1; // 1-12
    const day = new Date().getDate();

    if (month === 10 || month === 11) {
      return {
        id: "karwa_chauth",
        name: "Karwa Chauth Special 🌸",
        bannerText: "Book Your Karwa Chauth Mehndi Slots Now! High Demand ⚡",
        promoCode: "KARWA500",
        discount: "Flat ₹500 OFF",
        bgGradient: ["#9C1344", "#E11D48"],
      };
    } else if (month === 7 || month === 8) {
      return {
        id: "teej_rakhi",
        name: "Teej & Rakhi Festive Dhamaka ✨",
        bannerText: "Celebrate Teej & Raksha Bandhan with Premium Mehndi Designs!",
        promoCode: "FESTIVE200",
        discount: "Flat 20% OFF",
        bgGradient: ["#059669", "#10B981"],
      };
    } else if (month === 4 || month === 5) {
      return {
        id: "eid_mubarak",
        name: "Eid Mubarak Specials 🌙",
        bannerText: "Exclusive Indo-Arabic & Chand Mehndi Designs for Eid!",
        promoCode: "EIDSPECIAL",
        discount: "Flat ₹300 OFF",
        bgGradient: ["#1E3A8A", "#2563EB"],
      };
    }
    return {
      id: "wedding_season",
      name: "Grand Wedding Season 💍",
      bannerText: "Book Top Royal Bridal Mehndi Artists with Escrow Protection!",
      promoCode: "BRIDALROYAL",
      discount: "Up to ₹1,000 OFF",
      bgGradient: ["#9C1344", "#BE123C"],
    };
  }


  async getPersonalizedRecommendations(lat, lng, userId) {
    try {
      const allArtists = await db.ArtistProfile.findAll({
        where: { verification_status: "APPROVED" },
        limit: 20,
        include: [
          { model: db.User, as: "user", attributes: ["name", "profile_image", "city"] },
          { model: db.Service, as: "services" }
        ]
      });

      // Genuine recommendation scoring based on verified artist performance
      const scored = allArtists.map((artist) => {
        const rating = Number(artist.avg_rating || 0);
        let score = rating * 2.0;
        if (artist.experience_years >= 5) score += 1.5;
        if (artist.total_bookings >= 20) score += 2.0;
        return { artist, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 8).map((s) => s.artist);
    } catch (e) {
      console.log("Error generating recommendations:", e.message);
      return [];
    }
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
          name: b.artist.user?.name || "Mehndi Specialist",
          profile_image: b.artist.user?.profile_image || null,
          specialization_name: b.service?.specialization_name || "Mehndi Specialist",
          booking_date: b.createdAt,
          avg_rating: b.artist.avg_rating ? Number(b.artist.avg_rating) : null,
          city: b.artist.user?.city || b.artist.city || null
        });
      }
    });

    return Array.from(uniqueArtistsMap.values());
  }

  // Portfolio & Gallery Management
  async getPortfolios(query = "", filters = {}, page = 1, limit = 10) {
    const offset = (Number(page) - 1) * Number(limit);
    const likeOp = db.sequelize?.options?.dialect === "postgres" ? Op.iLike : Op.like;
    const where = {
      visibility: true
    };

    if (filters.category) {
      where.category = { [likeOp]: `%${filters.category}%` };
    }

    if (filters.occasion) {
      where.occasion = { [likeOp]: `%${filters.occasion}%` };
    }

    if (query) {
      const searchPattern = `%${query}%`;
      where[Op.or] = [
        { title: { [likeOp]: searchPattern } },
        { caption: { [likeOp]: searchPattern } },
        { description: { [likeOp]: searchPattern } },
        { tags: { [likeOp]: searchPattern } },
        { category: { [likeOp]: searchPattern } },
        { occasion: { [likeOp]: searchPattern } }
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
          where: { verification_status: "APPROVED" },
          required: true,
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
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    const like = await db.PortfolioLike.findOrCreate({
      where: { user_id: userId, portfolio_id: portfolioId }
    });
    
    // Increment likes counter in portfolios table only if the like is new
    if (like[1]) {
      await db.Portfolio.increment("likes_count", {
        by: 1,
        where: { id: portfolioId }
      });
    }

    return like[0];
  }

  async unlikePortfolio(userId, portfolioId) {
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

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

    if (pendingReviewBooking) {
      const review = await db.Review.findOne({ where: { booking_id: pendingReviewBooking.id } });
      if (review) {
        pendingReviewBooking = null;
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
      pendingReviewBooking,
      pendingSettlementBooking: typeof pendingSettlementBooking !== 'undefined' ? pendingSettlementBooking : null
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
      attributes: [
        "id",
        "name",
        "phone",
        "email",
        "profile_image",
        "gender",
        "city",
        "state",
        "pincode",
        "current_level",
        "current_xp",
        "lifetime_xp",
        "ambassador_tier",
        "ambassador_score",
        "is_verified",
        "createdAt",
        "updatedAt"
      ]
    });
    if (!user) {
      const AppError = require("../utils/errors/app.error");
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateProfile(userId, data) {
    const AppError = require("../utils/errors/app.error");
    const user = await db.User.findByPk(userId);
    if (!user) throw new AppError("User not found", 404);

    const updates = {};
    if (data.name && String(data.name).trim()) updates.name = String(data.name).trim();

    const newAvatar = data.profile_image || data.profileImage || data.avatar;
    if (newAvatar) updates.profile_image = newAvatar;

    if (data.gender && ["MALE", "FEMALE", "OTHER"].includes(String(data.gender).toUpperCase())) {
      updates.gender = String(data.gender).toUpperCase();
    }

    if (data.city !== undefined && data.city !== null) updates.city = String(data.city).trim();
    if (data.state !== undefined && data.state !== null) updates.state = String(data.state).trim();
    if (data.pincode !== undefined && data.pincode !== null) updates.pincode = String(data.pincode).trim();

    if (data.email && String(data.email).trim() && String(data.email).trim().toLowerCase() !== user.email) {
      const cleanEmail = String(data.email).trim().toLowerCase();
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

    return await this.getProfile(userId);
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
    try {
      return await db.Address.findAll({
        where: { user_id: userId },
        order: [["is_default", "DESC"], ["createdAt", "DESC"]]
      });
    } catch (e) {
      if (e.message && e.message.includes("does not exist")) {
        return await db.Address.findAll({
          attributes: ["id", "user_id", "name", "address_line_1", "address_line_2", "city", "state", "pincode", "is_default", "createdAt", "updatedAt"],
          where: { user_id: userId },
          order: [["is_default", "DESC"], ["createdAt", "DESC"]]
        });
      }
      throw e;
    }
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
    const {
      name,
      label,
      address,
      addressLine1,
      address_line_1,
      fullAddress,
      addressLine2,
      address_line_2,
      landmark,
      houseFlat,
      house_flat,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
      is_default,
    } = data;

    const existingCount = await db.Address.count({ where: { user_id: userId } });
    const markDefault = isDefault || is_default || existingCount === 0;

    if (markDefault) {
      await db.Address.update({ is_default: false }, { where: { user_id: userId } });
    }

    const addrName = label || name || "Home";
    const line1 = address || fullAddress || addressLine1 || address_line_1 || "Address";
    const line2 = landmark || houseFlat || house_flat || addressLine2 || address_line_2 || "";
    const addrCity = city || "Jaipur";
    const addrState = state || "Rajasthan";
    const addrPincode = pincode || "302001";

    return await db.Address.create({
      user_id: userId,
      name: addrName,
      address_line_1: line1,
      address_line_2: line2 || null,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      is_default: markDefault,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
    });
  }

  async updateAddress(userId, addressId, data) {
    const AppError = require("../utils/errors/app.error");
    const address = await db.Address.findOne({ where: { id: addressId, user_id: userId } });
    if (!address) throw new AppError("Address not found", 404);

    const {
      name,
      label,
      address: addrInput,
      addressLine1,
      address_line_1,
      fullAddress,
      addressLine2,
      address_line_2,
      landmark,
      houseFlat,
      house_flat,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
      is_default,
    } = data;

    const markDefault = isDefault !== undefined ? isDefault : is_default;

    if (markDefault) {
      await db.Address.update({ is_default: false }, { where: { user_id: userId } });
    }

    const updates = {};
    if (label || name) {
      updates.name = label || name;
    }
    const resolvedLine1 = addrInput || fullAddress || addressLine1 || address_line_1;
    if (resolvedLine1) updates.address_line_1 = resolvedLine1;

    const resolvedLine2 = landmark || houseFlat || house_flat || addressLine2 || address_line_2;
    if (resolvedLine2 !== undefined) {
      updates.address_line_2 = resolvedLine2 || null;
    }
    if (city) updates.city = city;
    if (state) updates.state = state;
    if (pincode) updates.pincode = pincode;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (markDefault !== undefined) updates.is_default = !!markDefault;

    await address.update(updates);
    return address;
  }

  async setDefaultAddress(userId, addressId) {
    const AppError = require("../utils/errors/app.error");
    const address = await db.Address.findOne({ where: { id: addressId, user_id: userId } });
    if (!address) throw new AppError("Address not found", 404);

    await db.Address.update({ is_default: false }, { where: { user_id: userId } });
    await address.update({ is_default: true });
    return address;
  }

  async deleteAddress(userId, addressId) {
    const deleted = await db.Address.destroy({ where: { id: addressId, user_id: userId } });
    // If deleted address was default, promote next available address to default
    const remaining = await db.Address.findAll({ where: { user_id: userId }, order: [["createdAt", "DESC"]] });
    if (remaining.length > 0 && !remaining.some((a) => a.is_default)) {
      await remaining[0].update({ is_default: true });
    }
    return deleted;
  }

  async getReels(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { rows: reels, count } = await db.Portfolio.findAndCountAll({
      where: {
        video_url: { 
          [Op.and]: [
            { [Op.not]: null },
            { [Op.ne]: "" },
            { [Op.ne]: "null" }
          ]
        },
        [Op.or]: [
          { visibility: true },
          { visibility: null }
        ]
      },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          where: { verification_status: "APPROVED" },
          required: true,
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

    let reelsData = reels.map((r) => r.toJSON());

    // If userId provided, check like/save status
    if (userId) {
      const reelIds = reelsData.map((r) => r.id);
      if (reelIds.length > 0) {
        const userLikes = await db.PortfolioLike.findAll({
          where: { user_id: userId, portfolio_id: { [Op.in]: reelIds } }
        });
        const likedIds = new Set(userLikes.map((l) => l.portfolio_id));

        const userSaves = await db.PortfolioSave.findAll({
          where: { user_id: userId, portfolio_id: { [Op.in]: reelIds } }
        });
        const savedIds = new Set(userSaves.map((s) => s.portfolio_id));

        reelsData = reelsData.map((r) => ({
          ...r,
          isLiked: likedIds.has(r.id),
          isSaved: savedIds.has(r.id)
        }));
      }
    }

    return {
      data: reelsData,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        hasMore: offset + reels.length < count
      }
    };
  }
  async commentPortfolio(userId, portfolioId, text) {
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    const comment = await db.PortfolioComment.create({
      user_id: userId,
      portfolio_id: portfolioId,
      text: text
    });
    
    // Attempt notification creation (failsafe)
    try {
      if (portfolio && portfolio.artist_id) {
        const artist = await db.ArtistProfile.findByPk(portfolio.artist_id);
        if (artist && artist.user_id !== userId) {
          const user = await db.User.findByPk(userId);
          await db.Notification.create({
            user_id: artist.user_id,
            title: "New Comment",
            message: `${user?.name || "Someone"} commented on your reel.`,
            type: "COMMENT",
            related_id: portfolioId
          });
        }
      }
    } catch(e) {
      console.warn("Notification failed", e);
    }
    return comment;
  }

  async getPortfolioComments(portfolioId, page = 1, limit = 20) {
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    const offset = (page - 1) * limit;
    const { rows, count } = await db.PortfolioComment.findAndCountAll({
      where: { portfolio_id: portfolioId },
      include: [{ model: db.User, as: "user", attributes: ["id", "name", "profile_image"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
    return { data: rows, total: count, hasMore: offset + rows.length < count };
  }

  async deletePortfolioComment(userId, commentId) {
    const comment = await db.PortfolioComment.findByPk(commentId, { include: [{ model: db.Portfolio, as: "portfolio" }] });
    if (!comment) throw new AppError("Comment not found", 404);
    
    // Allow deletion if it's the author OR the artist of the portfolio
    let isArtist = false;
    if (comment.portfolio) {
      const artistProfile = await db.ArtistProfile.findOne({ where: { user_id: userId } });
      if (artistProfile && artistProfile.id === comment.portfolio.artist_id) isArtist = true;
    }
    
    if (comment.user_id !== userId && !isArtist) {
      throw new AppError("Unauthorized to delete this comment", 403);
    }
    await comment.destroy();
    return true;
  }
  
  async addViewToPortfolio(portfolioId) {
    const portfolio = await db.Portfolio.findByPk(portfolioId);
    if (!portfolio) {
      throw new AppError("Portfolio not found", 404);
    }

    await db.Portfolio.increment("views_count", {
      by: 1,
      where: { id: portfolioId }
    });
    return true;
  }
}


module.exports = new CustomerService();
