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
      const { client: redisClient } = require("../../config/redis");
      if (redisClient.isReady) {
        const cached = await redisClient.get("home:categories");
        if (cached) return JSON.parse(cached);
      }
    } catch (e) { /* ignore redis error */ }

    try {
      const db = require("../models");
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
    } catch (err) {
      console.log("Error fetching dynamic categories from DB:", err.message);
    }
    return categoriesList;
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
      verification_status: { [Op.ne]: "REJECTED" }
    };

    if (filters.category) {
      const rawCategory = filters.category.trim();
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
      const searchPattern = `%${query}%`;
      where[Op.or] = [
        { bio: { [Op.iLike || Op.like]: searchPattern } },
        { city: { [Op.iLike || Op.like]: searchPattern } },
        { state: { [Op.iLike || Op.like]: searchPattern } },
        { pincode: { [Op.iLike || Op.like]: searchPattern } },
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Users" AS u 
          WHERE u.id = "ArtistProfile".user_id 
          AND u.name ILIKE '${searchPattern}'
        )`),
        db.sequelize.literal(`EXISTS (
          SELECT 1 FROM "Services" AS s 
          WHERE s.artist_id = "ArtistProfile".id 
          AND (s.specialization_name ILIKE '${searchPattern}' OR s.category ILIKE '${searchPattern}')
        )`)
      ];
    }

    let attributes = {
      include: []
    };
    let order = [];

    let distanceSql = null;
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
      order.push([db.sequelize.literal(distanceSql), "ASC"]);
      order.push(["avg_rating", "DESC"]);
    } else if (sort === "highest_rated" || sort === "rating") {
      order.push(["avg_rating", "DESC"]);
      order.push(["total_reviews", "DESC"]);
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
      order.push(["avg_rating", "DESC"]);
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

  async getArtistAvailability(artistId, query = {}) {
    const slots = await db.AvailabilitySlot.findAll({
      where: { artist_id: artistId },
      order: [["start_time", "ASC"]]
    });

    const artist = await db.ArtistProfile.findByPk(artistId);
    if (!artist) {
      return slots;
    }

    const { date, selected_art_id, group_size = 1, latitude, longitude } = query;
    const bookingService = require("./booking.services");

    const targetDate = date ? String(date).substring(0, 10) : new Date().toISOString().substring(0, 10);
    const dayOfWeek = new Date(targetDate).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

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
    const travelInfo = await bookingService.calculateTravelAndSequence(
      artistId,
      targetDate,
      null,
      latitude,
      longitude
    );

    // Build standard time slots with feasibility
    const timeTemplates = [
      { label: "10:00 AM", startTimeStr: `${targetDate}T10:00:00.000Z`, endTimeStr: `${targetDate}T13:00:00.000Z` },
      { label: "02:00 PM", startTimeStr: `${targetDate}T14:00:00.000Z`, endTimeStr: `${targetDate}T17:00:00.000Z` },
      { label: "06:00 PM", startTimeStr: `${targetDate}T18:00:00.000Z`, endTimeStr: `${targetDate}T21:00:00.000Z` }
    ];

    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    const existingBookings = await db.Booking.findAll({
      where: {
        artist_id: artistId,
        booking_status: { [Op.ne]: "CANCELLED" },
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [{ model: db.AvailabilitySlot, as: "slot", required: false }]
    });

    const smartSlots = timeTemplates.map((t) => {
      const slotStartTime = new Date(t.startTimeStr);
      const isBooked = existingBookings.some((b) => {
        if (b.slot?.start_time && new Date(b.slot.start_time).getTime() === slotStartTime.getTime()) return true;
        if (b.notes && b.notes.includes(t.label)) return true;
        return false;
      });

      const isFeasible = isWorkingDay && !isLeave && !isBooked;

      return {
        label: t.label,
        start_time: t.startTimeStr,
        end_time: t.endTimeStr,
        is_available: isFeasible,
        is_booked: isBooked,
        travel_distance_km: travelInfo.distanceKm,
        travel_duration_mins: travelInfo.durationMins,
        travel_origin_type: travelInfo.originType,
        travel_origin_address: travelInfo.originAddress,
        design_duration_mins: totalDesignDuration,
        prep_buffer_mins: 15,
        cooldown_buffer_mins: 20,
        total_block_mins: travelInfo.durationMins + totalDesignDuration + 15 + 20
      };
    });

    return {
      artist_id: artistId,
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

      // AI Recommendation scoring heuristic
      const scored = allArtists.map((artist) => {
        let score = (artist.avg_rating || 4.5) * 2.0;
        if (artist.experience_years >= 5) score += 1.5;
        if (artist.total_bookings >= 20) score += 2.0;
        return { artist, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 8).map((s) => s.artist);
    } catch (e) {
      console.log("Error generating AI recommendations:", e.message);
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
    const line1 = fullAddress || addressLine1 || address_line_1 || "Address";
    const line2 = landmark || houseFlat || house_flat || addressLine2 || address_line_2 || "";
    const addrCity = city || "Jaipur";
    const addrState = state || "Rajasthan";
    const addrPincode = pincode || "302001";

    return await db.Address.create({
      user_id: userId,
      name: addrName,
      label: addrName,
      address_line_1: line1,
      address_line_2: line2 || null,
      house_flat: houseFlat || house_flat || line2 || null,
      landmark: landmark || null,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      is_default: markDefault,
    });
  }

  async updateAddress(userId, addressId, data) {
    const address = await db.Address.findOne({ where: { id: addressId, user_id: userId } });
    if (!address) throw new Error("Address not found");

    const {
      name,
      label,
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
      updates.label = label || name;
    }
    if (fullAddress || addressLine1 || address_line_1) updates.address_line_1 = fullAddress || addressLine1 || address_line_1;
    if (landmark || houseFlat || house_flat || addressLine2 || address_line_2) {
      updates.address_line_2 = landmark || houseFlat || house_flat || addressLine2 || address_line_2;
      updates.house_flat = houseFlat || house_flat || null;
      updates.landmark = landmark || null;
    }
    if (city) updates.city = city;
    if (state) updates.state = state;
    if (pincode) updates.pincode = pincode;
    if (latitude) updates.latitude = parseFloat(latitude);
    if (longitude) updates.longitude = parseFloat(longitude);
    if (markDefault !== undefined) updates.is_default = !!markDefault;

    await address.update(updates);
    return address;
  }

  async setDefaultAddress(userId, addressId) {
    await db.Address.update({ is_default: false }, { where: { user_id: userId } });
    const address = await db.Address.findOne({ where: { id: addressId, user_id: userId } });
    if (address) {
      await address.update({ is_default: true });
    }
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
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "profile_image", "email", "phone"]
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
