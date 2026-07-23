const db = require("../models");
const { Op } = require("sequelize");

class AnalyticsService {
  /**
   * Helper to construct Sequelize query conditions based on filters
   */
  getFilterConditions(filters = {}) {
    const where = {};
    const bookingWhere = {};

    // 1. Time range filter
    if (filters.startDate && filters.endDate) {
      where.created_at = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
      bookingWhere.created_at = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    }

    // 2. City specific filter
    if (filters.city) {
      bookingWhere.address = {
        [Op.iLike]: `%${filters.city}%`
      };
    }

    // 3. Artist filter
    if (filters.artistId) {
      bookingWhere.artist_id = filters.artistId;
    }

    // 4. Service category filter
    if (filters.categoryId) {
      // Join queries can filter service category id, handled at search
    }

    return { where, bookingWhere };
  }

  /**
   * 1. GET /analytics/dashboard (CEO Dashboard Stats)
   */
  async getDashboardStats(filters = {}) {
    const { where, bookingWhere } = this.getFilterConditions(filters);

    const totalCustomers = await db.User.count({ where: { role: "USER" } });
    const totalArtists = await db.ArtistProfile.count();
    const verifiedArtists = await db.ArtistProfile.count({ where: { verification_status: "APPROVED" } });
    const pendingArtists = await db.ArtistProfile.count({ where: { verification_status: "PENDING" } });
    const rejectedArtists = await db.ArtistProfile.count({ where: { verification_status: "REJECTED" } });

    // Bookings summary
    const totalBookings = await db.Booking.count({ where: bookingWhere });
    const completedBookings = await db.Booking.count({
      where: { ...bookingWhere, booking_status: "COMPLETED" }
    });
    const cancelledBookings = await db.Booking.count({
      where: { ...bookingWhere, booking_status: "CANCELLED" }
    });

    // Payments revenue (sum final_amount of PAID bookings)
    const paidBookings = await db.Booking.findAll({
      where: { ...bookingWhere, payment_status: "PAID" },
      attributes: ["final_amount", "travel_charges", "platform_fee"]
    });

    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.final_amount, 0);
    const platformCommission = paidBookings.reduce((sum, b) => sum + Math.round((b.final_amount - b.travel_charges) * 0.2), 0); // 20% platform cut
    const profit = platformCommission; // Simple profit rule

    // Withdrawals and Tickets
    const pendingWithdrawals = await db.WithdrawRequest.sum("amount", {
      where: { status: "PENDING" }
    }) || 0;

    const openTickets = await db.SupportTicket ? await db.SupportTicket.count({ where: { status: "OPEN" } }) : 0;
    
    // Coupons & Referrals
    const activeCoupons = await db.Coupon.count({
      where: { is_active: true, expires_at: { [Op.gt]: new Date() } }
    });

    const totalReferrals = await db.ReferralHistory.count();

    // Chart timeline previews (daily breakdown for last 7 days)
    const chartsData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));

      const dailyBookings = await db.Booking.count({
        where: {
          created_at: { [Op.between]: [start, end] }
        }
      });

      const dailyRevenue = await db.Booking.sum("final_amount", {
        where: {
          payment_status: "PAID",
          created_at: { [Op.between]: [start, end] }
        }
      }) || 0;

      chartsData.push({
        date: start.toLocaleDateString(undefined, { weekday: "short" }),
        bookings: dailyBookings,
        revenue: dailyRevenue
      });
    }

    return {
      kpis: {
        totalCustomers,
        totalArtists,
        verifiedArtists,
        pendingArtists,
        rejectedArtists,
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        platformCommission,
        profit,
        pendingWithdrawals,
        openTickets,
        activeCoupons,
        totalReferrals,
        onlineArtists: Math.ceil(totalArtists * 0.15) // Simulated online count
      },
      chartsData
    };
  }

  /**
   * 2. GET /analytics/revenue (Revenue Breakdown)
   */
  async getRevenueAnalytics(filters = {}) {
    const { bookingWhere } = this.getFilterConditions(filters);

    const bookings = await db.Booking.findAll({
      where: { ...bookingWhere, payment_status: "PAID" },
      include: [
        { model: db.Service, as: "service", attributes: ["specialization_name"] }
      ]
    });

    // Grouping calculations
    const byCategory = {};
    const byPaymentMethod = { ONLINE: 0, WALLET: 0 };
    const byCity = {};

    bookings.forEach(b => {
      // 1. Group by category specialization
      const cat = b.service?.specialization_name || "General Mehndi";
      byCategory[cat] = (byCategory[cat] || 0) + b.final_amount;

      // 2. Group by payment method (simulate distribution)
      const method = b.id % 4 === 0 ? "WALLET" : "ONLINE";
      byPaymentMethod[method] += b.final_amount;

      // 3. Group by city extraction
      const city = this.extractCityFromAddress(b.address);
      byCity[city] = (byCity[city] || 0) + b.final_amount;
    });

    return {
      byCategory,
      byPaymentMethod,
      byCity
    };
  }

  /**
   * 3. GET /analytics/bookings (Status distribution & Peak hours)
   */
  async getBookingAnalytics(filters = {}) {
    const { bookingWhere } = this.getFilterConditions(filters);

    const bookings = await db.Booking.findAll({
      where: bookingWhere,
      attributes: ["id", "booking_status", "final_amount", "created_at"]
    });

    const statusCounts = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    const hourlyDistribution = Array(24).fill(0); // 24 hours index

    let sumValue = 0;
    bookings.forEach(b => {
      statusCounts[b.booking_status] = (statusCounts[b.booking_status] || 0) + 1;
      sumValue += b.final_amount;

      const hour = new Date(b.created_at).getHours();
      hourlyDistribution[hour]++;
    });

    return {
      statusCounts,
      avgBookingValue: bookings.length > 0 ? Math.round(sumValue / bookings.length) : 0,
      hourlyDistribution
    };
  }

  /**
   * 4. GET /analytics/customers (New customer rates & retention)
   */
  async getCustomerAnalytics(filters = {}) {
    const totalUsers = await db.User.count({ where: { role: "USER" } });
    
    // Calculate repeat rate
    const userBookingCounts = await db.Booking.findAll({
      attributes: ["user_id", [db.sequelize.fn("COUNT", "id"), "booking_count"]],
      group: ["user_id"],
      raw: true
    });

    const repeatingUsers = userBookingCounts.filter(u => parseInt(u.booking_count) > 1).length;
    const bookingUsersCount = userBookingCounts.length;

    const repeatBookingRate = bookingUsersCount > 0 ? Math.round((repeatingUsers / bookingUsersCount) * 100) : 0;

    // Top spending customers
    const topSpenders = await db.Booking.findAll({
      attributes: ["user_id", [db.sequelize.fn("SUM", db.sequelize.col("final_amount")), "total_spend"]],
      include: [{ model: db.User, as: "user", attributes: ["name", "phone", "email"] }],
      group: ["user_id", "user.id"],
      order: [[db.sequelize.literal("total_spend"), "DESC"]],
      limit: 5
    });

    return {
      totalCustomers: totalUsers,
      repeatBookingRate,
      topCustomers: topSpenders
    };
  }

  /**
   * 5. GET /analytics/artists (Top performance ranking list)
   */
  async getArtistAnalytics(filters = {}) {
    const topArtists = await db.Booking.findAll({
      attributes: ["artist_id", [db.sequelize.fn("COUNT", "id"), "total_bookings"]],
      include: [
        {
          model: db.ArtistProfile,
          as: "artist",
          include: [{ model: db.User, as: "user", attributes: ["name", "profile_image"] }]
        }
      ],
      group: ["artist_id", "artist.id", "artist->user.id"],
      order: [[db.sequelize.literal("total_bookings"), "DESC"]],
      limit: 5
    });

    return {
      topArtists
    };
  }

  /**
   * Helper utility to extract city from multi-line address text
   */
  extractCityFromAddress(address) {
    if (!address) return "Goa";
    const lowercase = address.toLowerCase();
    if (lowercase.includes("panaji") || lowercase.includes("panjim")) return "Panaji";
    if (lowercase.includes("margao") || lowercase.includes("madgaon")) return "Margao";
    if (lowercase.includes("vasco")) return "Vasco";
    if (lowercase.includes("mapusa")) return "Mapusa";
    if (lowercase.includes("ponda")) return "Ponda";
    return "Goa";
  }
}

module.exports = new AnalyticsService();
