const express = require("express");
const router = express.Router();
const Park = require("../models/Park");
const jwt = require("jsonwebtoken");

// Authentication middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get all parks
router.get("/", verifyToken, async (req, res) => {
  try {
    const parks = await Park.find({
      designation: "National Park",
    })
      .select("id parkCode name fullName states description images designation")
      .sort({ name: 1 });
    res.json(parks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get park by parkCode
router.get("/park/:parkCode", verifyToken, async (req, res) => {
  try {
    const park = await Park.findOne({ parkCode: req.params.parkCode });
    if (!park) {
      return res.status(404).json({ message: "Park not found" });
    }
    res.json(park);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get parks by state
router.get("/:stateCode", verifyToken, async (req, res) => {
  try {
    const parks = await Park.find({
      states: { $regex: new RegExp(req.params.stateCode, "i") },
      designation: "National Park",
    })
      .select("id parkCode name fullName states description images designation")
      .sort({ name: 1 });
    res.json(parks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get parks by activity
router.get("/activity/:activityId", verifyToken, async (req, res) => {
  try {
    const parks = await Park.find({
      "activities.id": req.params.activityId,
    })
      .select("id parkCode name fullName states description images designation")
      .sort({ name: 1 });
    res.json(parks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get parks by topic
router.get("/topic/:topicId", verifyToken, async (req, res) => {
  try {
    const parks = await Park.find({
      "topics.id": req.params.topicId,
    })
      .select("id parkCode name fullName states description images designation")
      .sort({ name: 1 });
    res.json(parks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all unique activities
router.get("/activities", verifyToken, async (req, res) => {
  try {
    const activities = await Park.aggregate([
      { $unwind: "$activities" },
      {
        $group: { _id: "$activities.id", name: { $first: "$activities.name" } },
      },
      { $sort: { name: 1 } },
    ]);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all unique topics
router.get("/topics", verifyToken, async (req, res) => {
  try {
    const topics = await Park.aggregate([
      { $unwind: "$topics" },
      { $group: { _id: "$topics.id", name: { $first: "$topics.name" } } },
      { $sort: { name: 1 } },
    ]);
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
