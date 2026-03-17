const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { protect } = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
let isConnected = false;
const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    
    console.log('🔄 Connecting to MongoDB...');
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            connectTimeoutMS: 5000, // Faster timeout for serverless
            socketTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
        });
        isConnected = true;
        console.log(`✅  MongoDB Connected — ${conn.connection.host}`);
    } catch (error) {
        console.error('❌  MongoDB Error:', error.message);
        // Throw error so the handler can catch it or the function can fail visibly
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(503).json({
            success: false,
            message: "Database connection failed. Please ensure your MongoDB Atlas IP whitelist is set to '0.0.0.0/0'.",
            error: error.message
        });
    }
});

// ── Request Logging Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// ── Route configuration ──────────────────────────────────────────────────────
const apiVersion = '/v1';
const apiPrefix = '/api' + apiVersion;

// Handle both /api/v1 and /v1 for Netlify serverless compatibility
const routes = {
    auth: require('./routes/auth'),
    personal: require('./routes/personal'),
    admin: require('./routes/admin'),
    chat: require('./routes/chat'),
    notifications: require('./routes/notification')
};

app.use([`${apiPrefix}/auth`, `${apiVersion}/auth`, '/api/auth'], routes.auth);
app.use([`${apiPrefix}/personal`, `${apiVersion}/personal`, '/api/personal'], protect, routes.personal);
app.use([`${apiPrefix}/admin`, `${apiVersion}/admin`, '/api/admin'], routes.admin);
app.use([`${apiPrefix}/chat`, `${apiVersion}/chat`, '/api/chat'], routes.chat);
app.use([`${apiPrefix}/notifications`, `${apiVersion}/notifications`, '/api/notifications'], routes.notifications);

// ── Health check ──────────────────────────────────────────────────────────────
app.get(['/health', '/api/health'], (_req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        server: 'Harsh Personal Backend',
        mongodb: mongoStatus,
        mongoState: mongoose.connection.readyState
    });
});

// Export the app for serverless deployment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀  Backend running on http://localhost:${PORT}`));
}

module.exports = app;
