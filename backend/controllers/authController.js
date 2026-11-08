const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Class IDs supported for the common Computer Science staff login
const CLASS_YEAR_MAP = {
    CS1: '1',
    CS2: '2',
    CS3: '3'
};

// Generate JWT token
const generateToken = (user, scope = {}) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is missing from .env file');
    }

    const payload = {
        id: user._id || user.id,
        role: user.role
    };

    if (scope.year) payload.year = String(scope.year);
    if (scope.classId) payload.classId = scope.classId;

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Login
const login = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const loginId = username || email;

        if (!loginId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username/email and password are required'
            });
        }

        const user = await User.findOne({
            $or: [
                { username: loginId },
                { email: loginId }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name || user.username,
                email: user.email,
                role: user.role,
                department: user.department || '',
                year: user.year || '',
                status: user.status
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Login failed due to a server error'
        });
    }
};

// Get current logged-in user
const getMe = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userObj = user.toObject();
        // Reflect the class selected through a scoped token (common staff account)
        if (req.user.year && req.user.year !== 'All') {
            userObj.year = req.user.year;
        }
        if (req.user.classId) {
            userObj.classId = req.user.classId;
        }

        return res.json({
            success: true,
            user: userObj
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to get user details'
        });
    }
};

// Logout
const logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Logout successful. Remove the token from the client.'
    });
};

// Create staff account (admin only)
const createStaff = async (req, res) => {
    try {
        const { username, email, password, role, department, year } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        if (role && role.toLowerCase() !== 'staff') {
            return res.status(400).json({
                success: false,
                message: 'Only staff accounts can be created here'
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username },
                ...(email ? [{ email }] : [])
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const staff = await User.create({
            username,
            ...(email ? { email } : {}),
            password: hashedPassword,
            role: 'staff',
            ...(department ? { department } : {}),
            ...(year ? { year } : {})
        });

        return res.status(201).json({
            success: true,
            message: 'Staff account created successfully',
            staff: {
                id: staff._id,
                username: staff.username,
                email: staff.email,
                role: staff.role,
                department: staff.department,
                year: staff.year
            }
        });
    } catch (error) {
        console.error('Create staff error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to create staff account'
        });
    }
};

// List staff accounts
const listStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' })
            .select('-password')
            .sort({ username: 1 });

        return res.json({
            success: true,
            count: staff.length,
            staff
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve staff accounts'
        });
    }
};

// Update staff account
const updateStaff = async (req, res) => {
    try {
        const { username, email, password, department, year } = req.body;

        const staff = await User.findOne({
            _id: req.params.id,
            role: 'staff'
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff account not found'
            });
        }

        if (username !== undefined) staff.username = username;
        if (email !== undefined) staff.email = email;
        if (department !== undefined) staff.department = department;
        if (year !== undefined) staff.year = year;

        if (password) {
            staff.password = await bcrypt.hash(password, 12);
        }

        await staff.save();

        return res.json({
            success: true,
            message: 'Staff account updated successfully',
            staff: {
                id: staff._id,
                username: staff.username,
                email: staff.email,
                role: staff.role,
                department: staff.department,
                year: staff.year
            }
        });
    } catch (error) {
        console.error('Update staff error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update staff account'
        });
    }
};

// Select a class after logging in with the common Computer Science staff account
const selectClass = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Only staff accounts can select a class'
            });
        }

        const classId = String(req.body.classId || '').trim().toUpperCase();
        const targetYear = CLASS_YEAR_MAP[classId];

        if (!targetYear) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class. Choose CS1, CS2 or CS3'
            });
        }

        const department = String(req.user.department || '').trim();
        if (!/^computer\s+science$/i.test(department)) {
            return res.status(403).json({
                success: false,
                message: 'Class selection is only available for Computer Science staff'
            });
        }

        const assignedYear = String(req.user.year || 'All');
        if (assignedYear !== 'All' && assignedYear !== targetYear) {
            return res.status(403).json({
                success: false,
                message: `Access denied: This account is assigned to Year ${assignedYear}`
            });
        }

        const token = generateToken(req.user, { year: targetYear, classId });

        return res.status(200).json({
            success: true,
            message: `${classId} selected`,
            token,
            user: {
                id: req.user._id || req.user.id,
                username: req.user.username,
                name: req.user.name || req.user.username,
                email: req.user.email || '',
                role: 'staff',
                department,
                year: targetYear,
                classId,
                status: req.user.status || 'active'
            }
        });
    } catch (error) {
        console.error('Select class error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to select class'
        });
    }
};

module.exports = {
    login,
    getMe,
    logout,
    createStaff,
    listStaff,
    updateStaff,
    selectClass
};
