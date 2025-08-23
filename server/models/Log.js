// server/models/Log.js
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // This creates a reference to the User model
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
});

module.exports = mongoose.model('Log', LogSchema);