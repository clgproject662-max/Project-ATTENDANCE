const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token provided'
        });
    }

    // Check for local token first (for offline/local development)
    if (token.startsWith('local-token-')) {
        const username = token.replace('local-token-', '');
        
        // Create a mock user object for local authentication
        if (username === 'admin') {
            req.user = {
                _id: 'local-admin',
                username: 'admin',
                name: 'System Administrator',
                role: 'admin',
                department: 'Administration',
                year: 'All',
                status: 'active'
            };
            return next();
        } else if (username === 'cs') {
            // Common staff account: a class must be selected before class data is accessible
            req.user = {
                _id: 'local-cs',
                username: 'cs',
                name: 'CS Staff',
                role: 'staff',
                department: 'Computer Science',
                year: 'All',
                status: 'active'
            };
            return next();
        } else if (/^cs[123]$/.test(username)) {
            const year = username.replace('cs', '');
            req.user = {
                _id: `local-${username}`,
                username: username,
                name: `CS Staff (Year ${year})`,
                role: 'staff',
                department: 'Computer Science',
                year: year,
                status: 'active'
            };
            return next();
        }
        
        return res.status(401).json({
            success: false,
            message: 'Not authorized, unknown local user'
        });
    }

    // JWT Token verification (for users with actual JWT tokens)
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        const decoded = jwt.verify(token, secret);

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Account has been deactivated'
            });
        }

        // A class-selection token carries the chosen class. It is signed by the
        // server, so this year overrides the account's default scope.
        if (decoded.year) {
            if (user.role !== 'staff' || !['1', '2', '3'].includes(String(decoded.year))) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, invalid class scope in token'
                });
            }

            const scopedUser = user.toObject();
            scopedUser.year = String(decoded.year);
            scopedUser.classId = decoded.classId || `CS${decoded.year}`;
            req.user = scopedUser;
            return next();
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token invalid or expired'
        });
    }
};

module.exports = { protect };
