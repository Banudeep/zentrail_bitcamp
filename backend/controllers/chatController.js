const axios = require('axios');
const Park = require('../models/Park');

// Custom error for chat-related issues
class ChatError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

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

    // Call Gemini API with proper authentication
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Context: ${JSON.stringify(context)}\n\nUser message: ${message}`
            }]
          }]
        }
      );

      // Process Gemini response
      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response';

      // Send response back to client
      return res.json({
        message: {
          text: aiResponse
        },
        options: []
      });
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
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
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Generate a detailed itinerary for ${park.fullName}. Context: ${JSON.stringify(context)}`
            }]
          }]
        }
      );

      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate an itinerary';

      return res.json({
        itinerary: aiResponse,
        suggestions: []
      });
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
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