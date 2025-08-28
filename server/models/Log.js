// server/models/Log.js
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    apiEndpoint: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    fileName: {
        type: String,
    },
    status: {
        type: String,
        enum: ['initiated', 'success', 'failure'],
        required: true,
    },
    errorMessage: {
        type: String,
    },
    // New field for observability and request tracing
    requestId: {
        type: String,
    },
    // New field for performance monitoring
    latency: {
        type: Number, // in milliseconds
    }
});

// --- Add Indexes for Performance ---
// These will speed up queries on the admin dashboard.
LogSchema.index({ timestamp: -1 });
LogSchema.index({ user: 1 });
LogSchema.index({ apiEndpoint: 1 });


module.exports = mongoose.model('Log', LogSchema);
