/**
 * Restrict endpoint access to specific roles (e.g. 'admin')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access restricted to ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Enforce staff academic scope restrictions:
 * Staff can ONLY access their assigned department and year.
 * Admins are unrestricted across all departments and years.
 */
const enforceClassScope = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role === 'admin') {
        return next(); // Admins have unrestricted access
    }

    // Staff using the common account must choose a class first
    if (!req.user.year || req.user.year === 'All') {
        return res.status(403).json({
            success: false,
            message: 'Please select a class (CS1, CS2 or CS3) before accessing class data'
        });
    }

    // For staff, extract requested department and year from body, query or params
    const body = req.body || {};
    const reqDept = body.department || req.query.department;
    const reqYear = body.year !== undefined ? String(body.year) : (req.query.year !== undefined ? String(req.query.year) : null);

    if (reqDept && reqDept.trim().toLowerCase() !== req.user.department.trim().toLowerCase()) {
        return res.status(403).json({
            success: false,
            message: `Access denied: You are only authorized for ${req.user.department}`
        });
    }

    if (reqYear && req.user.year !== 'All' && String(reqYear).trim() !== String(req.user.year).trim()) {
        return res.status(403).json({
            success: false,
            message: `Access denied: You are only authorized for Year ${req.user.year}`
        });
    }

    next();
};

module.exports = { requireRole, enforceClassScope };
