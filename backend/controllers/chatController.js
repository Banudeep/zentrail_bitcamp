const axios = require('axios');
const Park = require('../models/Park');

// Custom error for chat-related issues
class ChatError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const handleChat = async (req, res) => {
  try {
    const { message, parkCode, selectedActivities } = req.body;
    if (!message || !parkCode) {
      throw new ChatError('Message and park code are required', 400);
    }

    // Get park information for context
    const park = await Park.findOne({ parkCode });
    if (!park) {
      throw new ChatError('Park not found', 404);
    }

    // Create context from park data and selected activities
    const context = {
      parkName: park.fullName,
      description: park.description,
      activities: selectedActivities 
        ? park.activities.filter(a => selectedActivities.includes(a.id))
        : park.activities,
      amenities: park.amenities,
      entranceFees: park.entranceFees,
      operatingHours: park.operatingHours,
      contacts: park.contacts,
      weatherInfo: park.weatherInfo,
      directionsInfo: park.directionsInfo
    };

    // Call your Gemini API with the context
    try {
      const response = await axios.post(process.env.GEMINI_API_URL, {
        message,
        context,
        type: 'chat'
      });

      // Send response back to client
      return res.json({
        message: response.data.response,
        options: response.data.suggestions || []
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new ChatError('Error processing chat request');
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

const generateItinerary = async (req, res) => {
  try {
    const { parkCode, selectedActivities, userPreferences } = req.body;
    if (!parkCode) {
      throw new ChatError('Park code is required', 400);
    }

    // Get park information
    const park = await Park.findOne({ parkCode });
    if (!park) {
      throw new ChatError('Park not found', 404);
    }

    // Create context for itinerary generation
    const context = {
      parkName: park.fullName,
      activities: selectedActivities 
        ? park.activities.filter(a => selectedActivities.includes(a.id))
        : park.activities,
      amenities: park.amenities,
      operatingHours: park.operatingHours,
      weatherInfo: park.weatherInfo,
      userPreferences
    };

    // Call Gemini API for itinerary generation
    try {
      const response = await axios.post(process.env.GEMINI_API_URL, {
        context,
        type: 'itinerary'
      });

      return res.json({
        itinerary: response.data.itinerary,
        suggestions: response.data.suggestions
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new ChatError('Error generating itinerary');
    }
  } catch (error) {
    console.error('Itinerary generation error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  handleChat,
  generateItinerary
};