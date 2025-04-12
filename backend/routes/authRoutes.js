const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Received token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Handle both id and userId fields
    const userId = decoded.userId || decoded.id;
    console.log('Looking for user with ID:', userId);

    const user = await User.findById(userId);
    console.log('Found user from token:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('No user found for decoded ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current user
router.get('/user', verifyToken, async (req, res) => {
  try {
    console.log('Looking up user with ID:', req.user._id);
    const user = await User.findById(req.user._id).select('-password');
    console.log('User found:', user);
    if (!user) {
      console.log('No user found with ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Google OAuth Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5002/api/auth/google/callback",
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ email: profile.emails[0].value });
      console.log('Google OAuth - Existing user:', user ? 'Found' : 'Not found');
      
      if (!user) {
        // Create new user if doesn't exist
        console.log('Creating new user with profile:', {
          email: profile.emails[0].value,
          name: profile.displayName,
          googleId: profile.id
        });
        
        user = await User.create({
          email: profile.emails[0].value,
          name: profile.displayName,
          googleId: profile.id,
          avatar: profile.photos[0].value
        });
        
        console.log('New user created:', user._id);
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Regular auth routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    console.log('Google callback - User:', req.user);
    
    // Create JWT token with consistent field names
    const token = jwt.sign(
      { 
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token payload:', {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// Mount routes BEFORE the 404 handler
router.post('/update-profile', authController.updateProfile);

module.exports = router; 