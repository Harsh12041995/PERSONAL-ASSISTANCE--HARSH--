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
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/harsh_personal')
    .then(() => console.log('✅  MongoDB Connected — harsh_personal'))
    .catch(err => console.log('❌  MongoDB Error:', err));

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth'));

// ── Protected personal module routes ─────────────────────────────────────────
app.use('/api/v1/personal', protect, require('./routes/personal'));

// ── Admin routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/admin', require('./routes/admin'));

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
