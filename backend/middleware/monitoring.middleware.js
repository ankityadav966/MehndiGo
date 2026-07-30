/**
 * Real-Time System Monitoring & Incident Alert Middleware
 */
const activeAlerts = [];
const systemMetrics = {
  totalRequests: 0,
  failedRequests: 0,
  slowRequests: 0,
  paymentFailures: 0,
  dbErrors: 0,
};

function recordAlert(priority, type, message, metadata = {}) {
  const alert = {
    id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    priority, // CRITICAL, HIGH, MEDIUM, LOW
    type, // API_FAILURE, SLOW_API, PAYMENT_FAILURE, DB_ERROR
    message,
    metadata,
    timestamp: new Date(),
  };
  activeAlerts.unshift(alert);
  if (activeAlerts.length > 50) activeAlerts.pop(); // Keep last 50 alerts
  console.log(`[ALERT System - ${priority}] ${type}: ${message}`);
  return alert;
}

function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  systemMetrics.totalRequests++;

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    // 1. Slow API Latency Tracking (> 1000ms)
    if (duration > 1000) {
      systemMetrics.slowRequests++;
      recordAlert("MEDIUM", "SLOW_API", `Slow API endpoint detected: ${req.method} ${req.originalUrl} (${duration}ms)`, {
        duration,
        url: req.originalUrl,
      });
    }

    // 2. HTTP 5xx Server Errors Tracking
    if (res.statusCode >= 500) {
      systemMetrics.failedRequests++;
      recordAlert("CRITICAL", "SERVER_ERROR", `Internal Server Error: ${req.method} ${req.originalUrl} (${res.statusCode})`, {
        statusCode: res.statusCode,
        url: req.originalUrl,
      });
    }
  });

  next();
}

module.exports = {
  monitoringMiddleware,
  recordAlert,
  systemMetrics,
  activeAlerts,
};
