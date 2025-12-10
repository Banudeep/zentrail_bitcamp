const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
// Configure CORS to allow the frontend origin and credentialed requests.
// Using a wildcard ('*') is not allowed when requests include credentials.
const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Connect to MongoDB
// Note: modern MongoDB driver ignores `useNewUrlParser` and `useUnifiedTopology` options
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    // Log error clearly and keep the process alive so we can inspect the problem
    console.error(
      "MongoDB connection error:",
      err && err.message ? err.message : err
    );
  });

// Routes
const parkBoundariesRouter = require("./routes/parkBoundaries");
const parkRoutes = require("./routes/parkRoutes");
const authRoutes = require("./routes/authRoutes");
const stateBoundaryRoutes = require("./routes/stateBoundaries");
const campgroundRoutes = require("./routes/campgroundRoutes");
const trailsRoutes = require("./routes/trails");
const userStatsRoutes = require("./routes/userStatsRoutes");

app.use("/api/park_boundaries", parkBoundariesRouter);
app.use("/api/parks", parkRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/states", stateBoundaryRoutes);
app.use("/api/campgrounds", campgroundRoutes);
app.use("/api/trails", trailsRoutes);
app.use("/api/user_stats", userStatsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
