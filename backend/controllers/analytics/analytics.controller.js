const analyticsService = require("../../services/analytics.services");
const { SuccessResponse, ErrorResponse } = require("../../utils/common");

// 1. GET /analytics/dashboard
async function getDashboard(req, res) {
  try {
    const stats = await analyticsService.getDashboardStats(req.query);
    return res.status(200).json(SuccessResponse("CEO Dashboard stats fetched successfully", stats));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 2. GET /analytics/revenue
async function getRevenue(req, res) {
  try {
    const data = await analyticsService.getRevenueAnalytics(req.query);
    return res.status(200).json(SuccessResponse("Revenue analytics fetched successfully", data));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 3. GET /analytics/bookings
async function getBookings(req, res) {
  try {
    const data = await analyticsService.getBookingAnalytics(req.query);
    return res.status(200).json(SuccessResponse("Booking analytics fetched successfully", data));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 4. GET /analytics/customers
async function getCustomers(req, res) {
  try {
    const data = await analyticsService.getCustomerAnalytics(req.query);
    return res.status(200).json(SuccessResponse("Customer analytics fetched successfully", data));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 5. GET /analytics/artists
async function getArtists(req, res) {
  try {
    const data = await analyticsService.getArtistAnalytics(req.query);
    return res.status(200).json(SuccessResponse("Artist analytics fetched successfully", data));
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 6. GET /analytics/export
async function exportCSV(req, res) {
  try {
    const { reportType } = req.query;
    
    let csvContent = "";
    if (reportType === "revenue") {
      const data = await analyticsService.getRevenueAnalytics(req.query);
      csvContent = "Category,Revenue\n" + 
        Object.entries(data.byCategory).map(([k, v]) => `"${k}",${v}`).join("\n");
    } else {
      const data = await analyticsService.getBookingAnalytics(req.query);
      csvContent = "Status,Count\n" + 
        Object.entries(data.statusCounts).map(([k, v]) => `"${k}",${v}`).join("\n");
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=mehndigo_${reportType || "report"}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

// 8. GET /analytics/export-report
async function exportBusinessReport(req, res) {
  try {
    const { period = "monthly", format = "csv" } = req.query;
    const stats = await analyticsService.getDashboardStats(req.query);

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="MehndiGo_${period}_report.csv"`);
      
      const csvData = `Metric,Value\nPeriod,${period.toUpperCase()}\nTotal Customers,${stats.kpis.totalCustomers}\nTotal Artists,${stats.kpis.totalArtists}\nGross Revenue,₹${stats.kpis.totalRevenue}\nPlatform Commission,₹${stats.kpis.commissionEarned}\nActive Coupons,${stats.kpis.activeCoupons}\n`;
      return res.status(200).send(csvData);
    }

    return res.status(200).json(
      SuccessResponse(`Business report (${period.toUpperCase()}) exported successfully in ${format.toUpperCase()} format`, {
        downloadUrl: `http://192.168.1.17:8000/api/v1/analytics/reports/download?period=${period}&format=${format}`,
        stats
      })
    );
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message, error));
  }
}

module.exports = {
  getDashboard,
  getRevenue,
  getBookings,
  getCustomers,
  getArtists,
  exportCSV,
  exportBusinessReport
};
