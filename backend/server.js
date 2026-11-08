
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');

// Existing route imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const studentRequestRoutes = require('./routes/studentRequestRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map(origin => origin.trim());

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no Origin header (curl, Postman, health checks)
            // or when opening HTML files directly from disk (file://) in development.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // In development, log the blocked origin to help diagnose mismatches.
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`CORS blocked origin: "${origin}". Add it to FRONTEND_ORIGIN in .env`);
            }

            return callback(new Error('Origin not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');

    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        status: connected ? 'OK' : 'DATABASE_DISCONNECTED',
        service: 'College Attendance Management API',
        database: connected ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Existing API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/student-requests', studentRequestRoutes);
app.use('/api/student-registration-requests', studentRequestRoutes);

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.originalUrl} not found`
    });
});

// Central error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production'
            ? undefined
            : err.stack
    });
});

// Connect database first, then start server
const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

async function startServer() {
    try {
        await connectDB();
        console.log('');

        app.listen(PORT, () => {
            console.log(`Attendance Backend running on port ${PORT}`);
            console.log(`API Base: http://localhost:${PORT}/api`);
            console.log(`Health Check: http://localhost:${PORT}/api/health`);
            console.log(`Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
            console.log('');
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('');
        console.error('===========================================');
        console.error('Server startup failed: MongoDB connection error');
        console.error('===========================================');
        console.error('');
        console.error('Please verify the following in MongoDB Atlas:');
        console.error('  1. Your current IP is whitelisted in Network Access');
        console.error('  2. Database user credentials are correct');
        console.error('  3. The cluster is running (not paused)');
        console.error('  4. Your network allows outbound connections to MongoDB Atlas');
        console.error('');
        console.error('Check your backend/.env file for MONGODB_URI configuration');
        console.error('');
        process.exit(1);
    }
}

startServer();

module.exports = app;
