const express = require('express');
const router = express.Router();
const { handleChat, generateItinerary } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// Chat endpoint
router.post('/chat', verifyToken, handleChat);

// Itinerary generation endpoint
router.post('/itinerary', verifyToken, generateItinerary);

module.exports = router;