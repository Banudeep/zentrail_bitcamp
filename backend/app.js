const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Routes
const parkBoundariesRouter = require("./routes/parkBoundaries");
const parkRoutes = require("./routes/parks");
const stateBoundaryRoutes = require("./routes/stateBoundaries");
const campgroundRoutes = require("./routes/campgroundRoutes");

app.use("/api/park_boundaries", parkBoundariesRouter);
app.use("/api/parks", parkRoutes);
app.use("/api/states", stateBoundaryRoutes);
app.use("/api/campgrounds", campgroundRoutes);

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
