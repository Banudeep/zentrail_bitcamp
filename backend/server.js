require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");

// Import passport config
require("./config/passport");

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    // origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // allowedHeaders: ["*"],
  })
);

// Add CORS preflight
app.options("*", cors());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  next();
});

// Test route
app.get("/api/test", (req, res) => {
  console.log("Test endpoint hit");
  res.json({ message: "Backend server is running!" });
});

// Import and use routes
const authRoutes = require("./routes/authRoutes");
const userStatsRoutes = require("./routes/userStatsRoutes");
const parkRoutes = require("./routes/parkRoutes");
const chatRoutes = require("./routes/chatRoutes");

// Mount routes BEFORE the 404 handler
app.use("/api/auth", authRoutes);
app.use("/api/user-stats", userStatsRoutes);
app.use("/api/parks", parkRoutes);
app.use("/api/chat", chatRoutes);

// MongoDB connection with detailed error handling
const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log(
      "Connection string:",
      process.env.MONGODB_URI.replace(/:[^:]*@/, ":****@")
    );

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // List all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    // Count users
    const userCount = await mongoose.connection.db
      .collection("users")
      .countDocuments();
    console.log("Number of users in database:", userCount);
  } catch (error) {
    console.error("MongoDB connection error details:", {
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      message: error.message,
      errorResponse: error.errorResponse,
    });
    process.exit(1);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === "MongoError" && err.code === 11000) {
    return res.status(400).json({
      message: "Duplicate Key Error",
      error: "A record with this key already exists",
    });
  }

  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler - MUST be after all other routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// Start server with port retry logic
const startServer = async (initialPort) => {
  let currentPort = initialPort;
  const maxRetries = 10;

  const tryListen = (port) => {
    return new Promise((resolve, reject) => {
      const server = app.listen(port)
        .once('listening', () => {
          console.log(`Server running on port ${port}`);
          console.log(`Client URL: ${process.env.CLIENT_URL}`);
          resolve(server);
        })
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            resolve(false);
          } else {
            reject(err);
          }
        });
    });
  };

  for (let i = 0; i < maxRetries; i++) {
    const server = await tryListen(currentPort);
    if (server) {
      return;
    }
    console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
    currentPort++;
  }
  throw new Error(`Could not find an available port after ${maxRetries} retries`);
};

// Modified server start
const PORT = process.env.PORT || 5001;
connectDB()
  .then(() => startServer(PORT))
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
