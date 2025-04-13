const express = require("express");
const router = express.Router();
const ParkBoundary = require("../models/ParkBoundary");

// GET all park boundaries
router.get("/", async (req, res) => {
  try {
    const boundaries = await ParkBoundary.find()
      .select("parkCode boundaryData")
      .lean();

    if (!boundaries || boundaries.length === 0) {
      return res.status(404).json({ message: "No park boundaries found" });
    }

    res.json(boundaries);
  } catch (error) {
    console.error("Error fetching park boundaries:", error);
    res.status(500).json({ message: "Error fetching park boundaries" });
  }
});

// GET a specific park boundary by park code
router.get("/:parkCode", async (req, res) => {
  try {
    const boundary = await ParkBoundary.findOne({
      parkCode: req.params.parkCode,
    })
      .select("parkCode boundaryData")
      .lean();

    if (!boundary) {
      return res.status(404).json({ message: "Park boundary not found" });
    }

    res.json(boundary);
  } catch (error) {
    console.error("Error fetching park boundary:", error);
    res.status(500).json({ message: "Error fetching park boundary" });
  }
});

// GET park boundaries by designation ID
router.get("/designation/:designationId", async (req, res) => {
  try {
    const boundaries = await ParkBoundary.find({
      "boundaryData.features.properties.designationId":
        req.params.designationId,
    })
      .select("parkCode boundaryData")
      .lean();

    if (!boundaries || boundaries.length === 0) {
      return res
        .status(404)
        .json({ message: "No park boundaries found for this designation" });
    }

    res.json(boundaries);
  } catch (error) {
    console.error("Error fetching park boundaries by designation:", error);
    res
      .status(500)
      .json({ message: "Error fetching park boundaries by designation" });
  }
});

module.exports = router;
