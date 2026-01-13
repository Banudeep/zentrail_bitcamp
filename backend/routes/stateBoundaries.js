const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const StateBoundary = require("../models/StateBoundary");

/**
 * Helper function to get the correct database connection
 * Ensures we're querying the 'zentrail' database
 */
const getDatabase = () => {
  const connection = mongoose.connection;
  const currentDb = connection.db.databaseName;

  // If already connected to zentrail, use it
  if (currentDb === "zentrail") {
    return connection.db;
  }

  // Otherwise, get the zentrail database explicitly
  return connection.client.db("zentrail");
};

/**
 * Helper function to normalize geometry format
 * Converts Polygon to MultiPolygon for consistency
 */
const normalizeGeometry = (geometry) => {
  if (!geometry || !geometry.coordinates) {
    return geometry;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }

  return geometry;
};

/**
 * Helper function to query raw MongoDB collection
 * Used as fallback when Mongoose model doesn't work
 */
const queryRawCollection = async (query = {}) => {
  const db = getDatabase();
  const collection = db.collection("us_state_boundaries");
  return await collection.find(query).toArray();
};

/**
 * Helper function to find state by abbreviation in raw collection
 */
const findStateInRawCollection = async (abbreviation) => {
  const db = getDatabase();
  const collection = db.collection("us_state_boundaries");

  const upper = abbreviation.toUpperCase();

  // Try common field name variations
  const query = {
    $or: [
      { abbreviation: upper },
      { abbreviation: { $regex: new RegExp(`^${upper}$`, "i") } },
      { code: upper },
      { state_code: upper },
      { postal: upper },
      { STATE_CODE: upper },
      { STATE_ABBR: upper },
      { ABBR: upper },
    ],
  };

  return await collection.findOne(query);
};

/**
 * Transform raw MongoDB document to expected format
 */
const transformStateDocument = (doc) => {
  if (!doc) return null;

  return {
    _id: doc._id,
    name: doc.name || doc.STATE_NAME || doc.state_name || doc.NAME || "Unknown",
    abbreviation:
      doc.abbreviation ||
      doc.code ||
      doc.state_code ||
      doc.postal ||
      doc.STATE_CODE ||
      doc.STATE_ABBR ||
      doc.ABBR ||
      "",
    geometry: normalizeGeometry(doc.geometry),
  };
};

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/state-boundaries
 * Get all state boundaries (name and abbreviation only)
 */
router.get("/", async (req, res) => {
  try {
    // Try Mongoose model first
    let states = await StateBoundary.find(
      {},
      { name: 1, abbreviation: 1, _id: 0 }
    )
      .lean()
      .sort({ name: 1 });

    // If Mongoose returns empty, try raw collection
    if (!states || states.length === 0) {
      console.log(
        "[State Boundaries] Mongoose returned 0 results, trying raw collection..."
      );
      const rawDocs = await queryRawCollection();

      if (rawDocs.length > 0) {
        states = rawDocs
          .map((doc) => ({
            name:
              doc.name || doc.STATE_NAME || doc.state_name || doc.NAME || null,
            abbreviation:
              doc.abbreviation ||
              doc.code ||
              doc.state_code ||
              doc.postal ||
              doc.STATE_CODE ||
              doc.STATE_ABBR ||
              doc.ABBR ||
              null,
          }))
          .filter((d) => d.name && d.abbreviation)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return res.json(states || []);
  } catch (error) {
    console.error("[State Boundaries] Error fetching all states:", error);
    return res.status(500).json({
      message: "Error fetching state boundaries",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/state-boundaries/:abbreviation
 * Get state boundary by abbreviation (e.g., AL, AK, CA)
 */
router.get("/:abbreviation", async (req, res) => {
  try {
    const abbreviation = String(req.params.abbreviation || "").trim();

    if (!abbreviation) {
      return res
        .status(400)
        .json({ message: "State abbreviation is required" });
    }

    const upper = abbreviation.toUpperCase();

    // Try Mongoose model first
    let state = await StateBoundary.findOne({
      abbreviation: { $regex: new RegExp(`^${upper}$`, "i") },
    });

    // If not found, try raw collection
    if (!state) {
      console.log(
        `[State Boundaries] Not found via Mongoose, trying raw collection for: ${upper}`
      );
      const rawState = await findStateInRawCollection(upper);

      if (rawState) {
        const transformed = transformStateDocument(rawState);
        return res.json(transformed);
      }

      return res.status(404).json({
        message: "State not found",
        abbreviation: upper,
      });
    }

    // Convert Mongoose document to plain object
    const stateObj = state.toObject();
    stateObj.geometry = normalizeGeometry(stateObj.geometry);

    return res.json(stateObj);
  } catch (error) {
    console.error("[State Boundaries] Error fetching state:", error);
    return res.status(500).json({
      message: "Error fetching state boundary",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/state-boundaries/debug/raw
 * Diagnostic endpoint to check raw MongoDB collection
 */
router.get("/debug/raw", async (req, res) => {
  try {
    const db = getDatabase();
    const collection = db.collection("us_state_boundaries");

    const count = await collection.countDocuments({});
    const sample = await collection.find({}).limit(3).toArray();

    const fields = sample.length > 0 ? Object.keys(sample[0]) : [];

    res.json({
      connectedDatabase: db.databaseName,
      collection: "us_state_boundaries",
      count,
      sampleFields: fields,
      sampleDocuments: sample.map((doc) => ({
        _id: doc._id,
        name: doc.name || doc.STATE_NAME || doc.state_name || doc.NAME || null,
        abbreviation:
          doc.abbreviation ||
          doc.code ||
          doc.state_code ||
          doc.postal ||
          doc.STATE_CODE ||
          doc.STATE_ABBR ||
          doc.ABBR ||
          null,
        hasGeometry: !!doc.geometry,
        geometryType: doc.geometry?.type || null,
      })),
    });
  } catch (error) {
    console.error("[State Boundaries] Debug route error:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;
