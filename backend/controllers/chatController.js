const axios = require('axios');
const Park = require('../models/Park');

// Validate environment variables on startup
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
}

// Custom error for chat-related issues
class ChatError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'ChatError';
  }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const CHROMA_API_URL = 'http://localhost:8000';

const queryChromaServer = async (query, parkCode) => {
  try {
    const response = await axios.post(`${CHROMA_API_URL}/query`, {
      query,
      park_code: parkCode,
      n_results: 3
    });
    return response.data.results;
  } catch (error) {

    console.error('Chroma server error:', error.response?.data || error.message);
    throw new ChatError('Error querying park information');
  } 
};

const handleChat = async (req, res) => {
  console.log('handleChat called with body:', JSON.stringify(req.body));
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

    // Query Chroma server for relevant park information
    const chromaResults = await queryChromaServer(message, parkCode);

    // Create context from park data, selected activities, and Chroma results
    const context = {
      parkName: park.fullName,
      description: park.description,
      activities: selectedActivities && park.activities 
        ? park.activities.filter(a => selectedActivities.includes(a.id))
        : park.activities,
      amenities: park.amenities,
      entranceFees: park.entranceFees,
      operatingHours: park.operatingHours,
      contacts: park.contacts,
      weatherInfo: park.weatherInfo,
      directionsInfo: park.directionsInfo,
      relevantInfo: chromaResults.documents[0]
    };

    // Call Gemini API with enhanced context
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `You are a national park guide assistant. Use the following context to provide detailed and accurate information about ${park.fullName}.
              
              Relevant park information: ${chromaResults.documents[0].join('\n')}
              
              Park context: ${JSON.stringify(context)}
              
              User message: ${message}
              
              Please focus on providing specific details about:
              1. Activities asked about: ${selectedActivities ? selectedActivities.join(', ') : 'Any available activities'}
              2. Operating hours and best times to visit
              3. Relevant amenities and facilities
              4. Important visitor information
              
              Provide a helpful and informative response based on the above context.`
            }]
          }]
        }
      );

      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response';

      return res.json({
        message: {
          text: aiResponse
        },
        options: park.activities.map(a => ({
          id: a.id,
          name: a.name
        })),
        relevantInfo: chromaResults.documents[0]
      });
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new ChatError('Error processing chat request');
    }
  } catch (error) {
    console.error('Chat error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status
    });
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

const generateItinerary = async (req, res) => {
  console.log('generateItinerary called with body:', JSON.stringify(req.body));
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

    // Query Chroma server for relevant park information
    const chromaResults = await queryChromaServer('itinerary planning ' + parkCode, parkCode);

    // Create enhanced context for itinerary generation
    const context = {
      parkName: park.fullName,
      description: park.description,
      activities: selectedActivities && park.activities 
        ? park.activities.filter(a => selectedActivities.includes(a.id))
        : park.activities,
      amenities: park.amenities,
      operatingHours: park.operatingHours,
      weatherInfo: park.weatherInfo,
      userPreferences,
      relevantInfo: chromaResults.documents[0]
    };

    // Call Gemini API with enhanced context
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Generate a detailed itinerary for ${park.fullName}.
              
              Park Information:
              - Description: ${park.description}
              - Weather: ${park.weatherInfo}
              - Available Activities: ${context.activities.map(a => a.name).join(', ')}
              
              Operating Hours:
              ${context.operatingHours.map(oh => `${oh.description}: ${JSON.stringify(oh.standardHours)}`).join('\n')}
              
              User Preferences:
              ${Object.entries(userPreferences || {}).map(([key, value]) => `${key}: ${value}`).join('\n')}
              
              Additional Context:
              ${chromaResults.documents[0].join('\n')}
              
              Please create a detailed day-by-day itinerary that:
              1. Incorporates the selected activities: ${selectedActivities ? selectedActivities.join(', ') : 'All available activities'}
              2. Considers park operating hours and seasonal conditions
              3. Accounts for user preferences and group needs
              4. Includes relevant amenities and facilities
              5. Provides estimated durations for each activity`
            }]
          }]
        }
      );

      const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate an itinerary';

      return res.json({
        itinerary: aiResponse,
        suggestions: park.activities.map(a => ({
          id: a.id,
          name: a.name
        })),
        relevantInfo: chromaResults.documents[0]
      });
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new ChatError('Error generating itinerary');
    }
  } catch (error) {
    console.error('Itinerary error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status
    });
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error'
    });
  }
};

// Export both functions explicitly
const chatController = {
  handleChat,
  generateItinerary
};

module.exports = chatController;