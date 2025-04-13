const express = require("express");
const router = express.Router();
const StateBoundary = require("../models/StateBoundary");

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

    // Convert MongoDB number objects to regular numbers
    const convertedState = convertMongoNumbers(state.toObject());

    // Transform the data into the format expected by the frontend
    const transformedState = {
      _id: convertedState._id,
      stateCode: convertedState.abbreviation,
      boundaryData: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: convertedState._id,
            geometry: {
              type: "MultiPolygon", // Always use MultiPolygon for consistency
              coordinates: Array.isArray(
                convertedState.geometry.coordinates[0][0][0]
              )
                ? convertedState.geometry.coordinates
                : [convertedState.geometry.coordinates], // Convert Polygon to MultiPolygon
            },
            properties: {
              name: convertedState.name,
              stateCode: convertedState.abbreviation,
            },
          },
        ],
      },
    };

    res.json(transformedState);
  } catch (error) {
    console.error("Error fetching state boundary:", error);
    res.status(500).json({ message: "Error fetching state boundary" });
  }
});

module.exports = router;
