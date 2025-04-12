const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Route for chat interactions
router.post('/', authenticateToken, chatController.handleChat);

// Route for getting itinerary
router.post('/generate-itinerary', authenticateToken, chatController.generateItinerary);

module.exports = router;