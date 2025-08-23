// server/routes/metricRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { protect, admin } = require('../middleware/authMiddleware');

// --- @route   GET /api/metrics ---
// --- @desc    Get aggregated usage metrics for the admin dashboard ---
// --- @access  Private/Admin ---
router.get('/', protect, admin, async (req, res) => {
    try {
        // 1. Feature Adoption: Count how many times each endpoint was successfully used.
        const featureAdoption = await Log.aggregate([
            { $match: { status: 'success' } }, // Only count successful runs
            {
                $group: {
                    _id: '$apiEndpoint',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    name: '$_id', // Rename _id to name
                    count: 1,
                },
            },
        ]);

        // 2. Power Users: Find which users have the most successful runs.
        const powerUsers = await Log.aggregate([
            { $match: { status: 'success' } },
            {
                $group: {
                    _id: '$user',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 5 }, // Get the top 5 users
            {
                $lookup: { // Join with the 'users' collection to get user details
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $project: {
                    _id: 0,
                    name: { $arrayElemAt: ['$userDetails.name', 0] },
                    email: { $arrayElemAt: ['$userDetails.email', 0] },
                    count: 1,
                },
            },
        ]);

        // 3. Error Rate: Calculate the total number of successes and failures.
        const errorRateStats = await Log.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Format the results into a clean object
        const formattedStats = {
            totalSuccess: 0,
            totalFailure: 0,
        };
        errorRateStats.forEach(stat => {
            if (stat._id === 'success') formattedStats.totalSuccess = stat.count;
            if (stat._id === 'failure') formattedStats.totalFailure = stat.count;
        });

        const totalRuns = formattedStats.totalSuccess + formattedStats.totalFailure;
        const errorRate = totalRuns > 0 ? (formattedStats.totalFailure / totalRuns) * 100 : 0;


        // Combine all metrics into a single response object
        const metrics = {
            featureAdoption,
            powerUsers,
            totalRuns,
            errorRate: errorRate.toFixed(2), // Format to 2 decimal places
        };

        res.json(metrics);

    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Server error while fetching metrics.' });
    }
});

module.exports = router;
