// server/routes/metricRoutes.js
const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, admin, async (req, res) => {
  try {
    // --- NEW: Date range filtering ---
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to the last 30 days if no range is provided
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      dateFilter.timestamp = { $gte: defaultStartDate };
    }

    // --- All aggregations now include the dateFilter ---

    const featureAdoption = await Log.aggregate([
      { $match: { status: "success", ...dateFilter } },
      { $group: { _id: "$apiEndpoint", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    const powerUsers = await Log.aggregate([
      { $match: { status: "success", ...dateFilter } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          _id: 0,
          name: { $arrayElemAt: ["$userDetails.name", 0] },
          email: { $arrayElemAt: ["$userDetails.email", 0] },
          count: 1,
        },
      },
    ]);

    const errorRateStats = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // --- NEW: Per-endpoint error distribution ---
    const endpointErrors = await Log.aggregate([
      { $match: { status: "failure", ...dateFilter } },
      { $group: { _id: "$apiEndpoint", errors: { $sum: 1 } } },
      { $sort: { errors: -1 } },
      { $project: { _id: 0, name: "_id", errors: 1 } },
    ]);

    const formattedStats = { totalSuccess: 0, totalFailure: 0 };
    errorRateStats.forEach((stat) => {
      if (stat._id === "success") formattedStats.totalSuccess = stat.count;
      if (stat._id === "failure") formattedStats.totalFailure = stat.count;
    });

    const totalRuns = formattedStats.totalSuccess + formattedStats.totalFailure;
    const errorRate =
      totalRuns > 0 ? (formattedStats.totalFailure / totalRuns) * 100 : 0;

    const metrics = {
      featureAdoption,
      powerUsers,
      totalRuns,
      errorRate: errorRate.toFixed(2),
      endpointErrors, // Add the new metric to the response
    };

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ error: "Server error while fetching metrics." });
  }
});

module.exports = router;
