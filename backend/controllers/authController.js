const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    console.log('Found user:', user); // Debug log
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Debug log to check user fields
    console.log('User fields:', {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Generate token with consistent field names
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send back both token and user data
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Error signing in' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Get user from request (set by verifyToken middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { firstName, lastName } = req.body;

    // Update user fields if provided (email cannot be changed)
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    await user.save();

    // Return updated user (without password)
    const updatedUser = await User.findById(user._id).select('-password');
    
    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    // Get user from request (set by verifyToken middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user has a password (Google OAuth users might not have one)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'This account was created with Google OAuth. Please use Google to sign in.' 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Trim whitespace
    const trimmedNewPassword = newPassword.trim();

    // Validate password matches original constraints (matching signup requirements)
    // Minimum length: 8 characters (frontend requirement) or 6 (backend model minimum)
    if (trimmedNewPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Check for uppercase, lowercase, and number (matching frontend signup validation)
    const hasUpperCase = /[A-Z]/.test(trimmedNewPassword);
    const hasLowerCase = /[a-z]/.test(trimmedNewPassword);
    const hasNumber = /\d/.test(trimmedNewPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({ 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is the same as current password
    const isSamePassword = await user.comparePassword(trimmedNewPassword);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: 'New password must be different from your current password' 
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = trimmedNewPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ 
        message: 'Password validation failed', 
        errors: messages 
      });
    }
    
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // Get user from request (set by verifyToken middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Delete user
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Error deleting account', error: error.message });
  }
}; 