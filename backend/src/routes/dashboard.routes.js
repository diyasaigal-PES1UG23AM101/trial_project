const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

// Middleware to log overall dashboard API time
router.use(async (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Dashboard route "${req.originalUrl}" responded in ${duration}ms`);
  });
  next();
});

// Dashboard endpoints
router.get("/assets", dashboardController.getAssets);
router.get("/licenses", dashboardController.getLicenses);
router.get("/monitoring", dashboardController.getMonitoring);
router.get("/reports", dashboardController.getReports);
router.get("/device-bandwidth", dashboardController.getDeviceBandwidth);
router.get("/downtime-alerts", dashboardController.getDowntimeAlerts);

module.exports = router;
