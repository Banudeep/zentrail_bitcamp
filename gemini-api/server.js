require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 9000; // Use PORT from .env or default to 9000
const API_KEY = process.env.GEMINI_API_KEY; // Load API key from .env

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend's URL
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);
app.use(bodyParser.json());

// Endpoint to generate itinerary
app.post("/generate-itinerary", (req, res) => {
  console.log("Request received:", req.body); // Debugging log
  const { date, time, cost, people, transportation } = req.body;

  if (!date || !time || !cost || !people || !transportation) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate API key (optional)
  const clientApiKey = req.headers["authorization"]?.split("Bearer ")[1];
  if (API_KEY && clientApiKey !== API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  const itinerary = `
    Itinerary Details:
    - Date: ${date}
    - Time: ${time}
    - Estimated Cost: $${cost}
    - Number of People: ${people}
    - Transportation: ${transportation}
  `;

  res.json({ itinerary });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Gemini API server is running on http://localhost:${PORT}`);
});
