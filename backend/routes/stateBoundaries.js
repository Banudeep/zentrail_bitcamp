const express = require("express");
const router = express.Router();
const StateBoundary = require("../models/StateBoundary");
//
// Helper function to convert MongoDB number objects to regular numbers
const convertMongoNumbers = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "object" && obj.$numberDouble) {
    return parseFloat(obj.$numberDouble);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertMongoNumbers);
  }

  if (typeof obj === "object") {
    const result = {};
    for (const key in obj) {
      result[key] = convertMongoNumbers(obj[key]);
    }
    return result;
  }

  return obj;
};

// Get all state boundaries (only name and abbreviation)
router.get("/", async (req, res) => {
  try {
    const states = await StateBoundary.find(
      {},
      { name: 1, abbreviation: 1, _id: 0 }
    );
    res.json(states);
  } catch (error) {
    console.error("Error fetching state boundaries:", error);
    res.status(500).json({ message: "Error fetching state boundaries" });
  }
});

// Get state boundary by abbreviation
router.get("/:abbreviation", async (req, res) => {
  try {
    const state = await StateBoundary.findOne({
      abbreviation: req.params.abbreviation.toUpperCase(),
    });

    if (!state) {
      return res.status(404).json({ message: "State not found" });
    }

    // Convert to plain object and ensure geometry is properly formatted
    const stateObj = state.toObject();

    // If geometry is missing coordinates, try to find it in the database
    if (!stateObj.geometry?.coordinates) {
      const stateWithCoords = await StateBoundary.findOne(
        { abbreviation: req.params.abbreviation.toUpperCase() },
        { geometry: 1 }
      ).lean();

      if (stateWithCoords?.geometry?.coordinates) {
        stateObj.geometry = stateWithCoords.geometry;
      }
    }

    // Ensure the geometry is properly formatted
    if (stateObj.geometry && stateObj.geometry.coordinates) {
      // If it's a Polygon, convert it to MultiPolygon
      if (stateObj.geometry.type === "Polygon") {
        stateObj.geometry = {
          type: "MultiPolygon",
          coordinates: [stateObj.geometry.coordinates],
        };
      }
    }

    res.json(stateObj);
  } catch (error) {
    console.error("Error fetching state boundary:", error);
    res.status(500).json({ message: "Error fetching state boundary" });
  }
});

module.exports = router;
