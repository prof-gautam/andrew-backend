// Middleware to check user roles
module.exports = (requiredRole) => {
    return (req, res, next) => {
        const userRole = req.user.role;

        if (!userRole) {
            return res.status(403).json({
                status: 'error',
                message: 'User role not found.'
            });
        }

        if (userRole !== requiredRole) {
            return res.status(403).json({
                status: 'error',
                message: `Access denied. Required role: ${requiredRole}`
            });
        }

        next();
    };
};