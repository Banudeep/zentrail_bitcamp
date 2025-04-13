const express = require("express");
const router = express.Router();
const Park = require("../models/Park");
const verifyToken = require('../middleware/auth');

// Get all parks
router.get("/", verifyToken, async (req, res) => {
  try {
    const parks = await Park.find({
      designation: "National Park",
    })
      .select(
        "id parkCode name fullName states description images designation latitude longitude"
      )
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
      designation: "National Park",
    })
      .select("id parkCode name fullName states description images designation")
      .sort({ name: 1 });
    res.json(parks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
