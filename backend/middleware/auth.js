const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Logger = require('../utils/logger');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        Logger.info('Auth Middleware', 'Token verification started', { tokenPresent: !!token });
        
        if (!token) {
            Logger.warn('Auth Middleware', 'No token provided');
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        Logger.info('Auth Middleware', 'Token decoded successfully');

        // Handle both id and userId fields for compatibility
        const userId = decoded.userId || decoded.id;
        
        const user = await User.findById(userId);
        Logger.info('Auth Middleware', 'User lookup complete', { userFound: !!user });

        if (!user) {
            Logger.warn('Auth Middleware', 'User not found for token', { userId });
            return res.status(404).json({ message: 'User not found' });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        Logger.error('Auth Middleware', 'Token verification failed', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        return res.status(500).json({ message: 'Internal server error during authentication' });
    }
};

module.exports = verifyToken;