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
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/harsh_personal', {
            // Options to help with connectivity issues in some environments
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log(`✅  MongoDB Connected — ${conn.connection.host}`);
    } catch (error) {
        console.error('❌  MongoDB Error:', error.message);
        // Don't exit process in dev, but log details
        if (error.code === 'ECONNREFUSED' || error.name === 'MongoServerSelectionError') {
            console.error('💡 TIP: This looks like a network or DNS problem with MongoDB.');
            console.error('   Check if your internet is stable and if the MongoDB URI is correct.');
        }
    }
};

connectDB();

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth'));

// ── Protected personal module routes ─────────────────────────────────────────
app.use('/api/v1/personal', protect, require('./routes/personal'));

// ── Admin routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/admin', require('./routes/admin'));

// ── Chat / AI routes ─────────────────────────────────────────────────────────
app.use('/api/v1/chat', require('./routes/chat'));

// ── Notification routes ──────────────────────────────────────────────────────
app.use('/api/v1/notifications', require('./routes/notification'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        server: 'Harsh Personal Backend',
        mongodb: mongoStatus,
        mongoState: mongoose.connection.readyState
    });
});

app.listen(PORT, () => console.log(`🚀  Backend running on http://localhost:${PORT}`));
