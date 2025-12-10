const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const StateBoundary = require("../models/StateBoundary");

// Diagnostic route to check raw MongoDB collection
router.get("/debug/raw", async (req, res) => {
  try {
    const connection = mongoose.connection;
    const dbName = connection.db.databaseName;
    const db = connection.db;

    // Try the default database first
    let collection = db.collection("us_state_boundaries");
    let count = await collection.countDocuments({});
    let sample = await collection.find({}).limit(3).toArray();

    // If no results, try explicitly using the "zentrail" database
    if (count === 0 && dbName !== "zentrail") {
      console.log(
        `[Debug] No results in ${dbName}, trying zentrail database...`
      );
      const zentrailDb = connection.client.db("zentrail");
      collection = zentrailDb.collection("us_state_boundaries");
      count = await collection.countDocuments({});
      sample = await collection.find({}).limit(3).toArray();
    }

    // Get all field names from first document if it exists
    let fields = [];
    if (sample.length > 0) {
      fields = Object.keys(sample[0]);
    }

    res.json({
      connectedDatabase: dbName,
      collection: "us_state_boundaries",
      count,
      sampleFields: fields,
      sampleDocuments: sample.map((doc) => ({
        _id: doc._id,
        // Show top-level fields only (no geometry coordinates)
        ...Object.keys(doc).reduce((acc, key) => {
          if (key === "geometry") {
            acc[key] = {
              type: doc[key]?.type,
              hasCoordinates: !!doc[key]?.coordinates,
              coordinateDepth: doc[key]?.coordinates
                ? Array.isArray(doc[key].coordinates)
                  ? Array.isArray(doc[key].coordinates[0])
                    ? Array.isArray(doc[key].coordinates[0][0])
                      ? "4D"
                      : "3D"
                    : "2D"
                  : "1D"
                : "none",
            };
          } else if (key !== "_id") {
            acc[key] = typeof doc[key] === "object" ? "[Object]" : doc[key];
          }
          return acc;
        }, {}),
      })),
    });
  } catch (error) {
    console.error("Error in debug route:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});
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
    // Primary: expected fields
    let states = await StateBoundary.find(
      {},
      { name: 1, abbreviation: 1, _id: 0 }
    ).lean();

    // If nothing came back, try broader projections to handle alternate schemas
    if (!states || states.length === 0) {
      const alt = await StateBoundary.find(
        {},
        {
          name: 1,
          abbreviation: 1,
          code: 1,
          state_code: 1,
          postal: 1,
        }
      )
        .limit(10)
        .lean();

      const mapped = alt
        .map((d) => ({
          name: d.name || d.STATE_NAME || d.state_name || null,
          abbreviation:
            d.abbreviation || d.code || d.state_code || d.postal || null,
        }))
        .filter((d) => d.name || d.abbreviation);

      // If we were able to map anything, return that
      if (mapped.length > 0) {
        const total = await StateBoundary.countDocuments({});
        return res.json(mapped);
      }

      // Last resort: query raw MongoDB collection directly
      console.log(
        "[State Boundaries] Mongoose model returned 0 results, trying raw MongoDB query..."
      );
      const connection = mongoose.connection;
      // Try zentrail database explicitly
      const db = connection.client.db("zentrail") || connection.db;
      const collection = db.collection("us_state_boundaries");
      const rawDocs = await collection.find({}).limit(50).toArray();

      if (rawDocs.length > 0) {
        console.log(
          `[State Boundaries] Found ${rawDocs.length} documents in raw collection`
        );
        console.log(
          `[State Boundaries] Sample document keys:`,
          Object.keys(rawDocs[0])
        );

        // Try to extract name and abbreviation from raw documents
        const mapped = rawDocs
          .map((doc) => {
            const name =
              doc.name ||
              doc.STATE_NAME ||
              doc.state_name ||
              doc.NAME ||
              doc.State ||
              null;
            const abbrev =
              doc.abbreviation ||
              doc.code ||
              doc.state_code ||
              doc.postal ||
              doc.STATE_CODE ||
              doc.STATE_ABBR ||
              doc.ABBR ||
              doc.Code ||
              null;
            return { name, abbreviation: abbrev };
          })
          .filter((d) => d.name || d.abbreviation);

        if (mapped.length > 0) {
          return res.json(mapped);
        }
      }
    }

    return res.json(states);
  } catch (error) {
    console.error("Error fetching state boundaries:", error);
    return res.status(500).json({ message: "Error fetching state boundaries" });
  }
});

// Get state boundary by abbreviation
router.get("/:abbreviation", async (req, res) => {
  try {
    const raw = String(req.params.abbreviation || "");
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    console.log(
      `[State Boundaries] Looking for state: ${raw} (upper: ${upper}, lower: ${lower})`
    );

    // First, try a simple case-insensitive match on abbreviation
    let state = await StateBoundary.findOne({
      abbreviation: { $regex: new RegExp(`^${upper}$`, "i") },
    });

    // If not found, try other field names
    if (!state) {
      console.log(
        `[State Boundaries] Not found by abbreviation, trying other fields...`
      );
      state = await StateBoundary.findOne({ code: upper });
      if (!state) {
        state = await StateBoundary.findOne({ state_code: upper });
      }
      if (!state) {
        state = await StateBoundary.findOne({ postal: upper });
      }
      if (!state) {
        state = await StateBoundary.findOne({ abbreviation: lower });
      }
    }

    // If still not found, try a broader search
    if (!state) {
      console.log(`[State Boundaries] Trying case-insensitive regex search...`);
      const query = {
        $or: [
          { abbreviation: { $regex: new RegExp(`^${raw}$`, "i") } },
          { code: { $regex: new RegExp(`^${raw}$`, "i") } },
          { state_code: { $regex: new RegExp(`^${raw}$`, "i") } },
          { postal: { $regex: new RegExp(`^${raw}$`, "i") } },
        ],
      };
      state = await StateBoundary.findOne(query);
    }

    // Debug: Check what states are actually in the database
    if (!state) {
      const sampleStates = await StateBoundary.find({})
        .limit(5)
        .select("name abbreviation code state_code postal")
        .lean();
      console.log(
        `[State Boundaries] Sample states in DB:`,
        JSON.stringify(sampleStates, null, 2)
      );
      console.log(
        `[State Boundaries] Total states in DB:`,
        await StateBoundary.countDocuments({})
      );

      // Last resort: query raw MongoDB collection directly
      console.log("[State Boundaries] Trying raw MongoDB query as fallback...");
      const connection = mongoose.connection;
      // Try zentrail database explicitly
      const db = connection.client.db("zentrail") || connection.db;
      const collection = db.collection("us_state_boundaries");

      // Try various field name combinations
      const rawState = await collection.findOne({
        $or: [
          { abbreviation: { $regex: new RegExp(`^${raw}$`, "i") } },
          { code: { $regex: new RegExp(`^${raw}$`, "i") } },
          { state_code: { $regex: new RegExp(`^${raw}$`, "i") } },
          { postal: { $regex: new RegExp(`^${raw}$`, "i") } },
          { STATE_CODE: { $regex: new RegExp(`^${raw}$`, "i") } },
          { STATE_ABBR: { $regex: new RegExp(`^${raw}$`, "i") } },
          { ABBR: { $regex: new RegExp(`^${raw}$`, "i") } },
          { Code: { $regex: new RegExp(`^${raw}$`, "i") } },
        ],
      });

      if (rawState) {
        console.log(
          `[State Boundaries] Found state in raw collection:`,
          Object.keys(rawState)
        );

        // Convert raw document to expected format
        const stateObj = {
          _id: rawState._id,
          name:
            rawState.name ||
            rawState.STATE_NAME ||
            rawState.state_name ||
            rawState.NAME ||
            rawState.State ||
            "Unknown",
          abbreviation:
            rawState.abbreviation ||
            rawState.code ||
            rawState.state_code ||
            rawState.postal ||
            rawState.STATE_CODE ||
            rawState.STATE_ABBR ||
            rawState.ABBR ||
            rawState.Code ||
            raw,
          geometry: rawState.geometry,
        };

        // Ensure geometry is properly formatted
        if (stateObj.geometry && stateObj.geometry.coordinates) {
          if (stateObj.geometry.type === "Polygon") {
            stateObj.geometry = {
              type: "MultiPolygon",
              coordinates: [stateObj.geometry.coordinates],
            };
          }
        }

        return res.json(stateObj);
      }

      return res.status(404).json({
        message: "State not found",
        input: raw,
        searched: { upper, lower, raw },
      });
    }

    console.log(
      `[State Boundaries] Found state: ${state.name} (${
        state.abbreviation || state.code || state.state_code || "N/A"
      })`
    );

    // Convert to plain object and ensure geometry is properly formatted
    const stateObj = state.toObject();

    // If geometry is missing coordinates, try to re-fetch just geometry
    if (!stateObj.geometry?.coordinates) {
      const onlyGeom = await StateBoundary.findOne(
        { _id: state._id },
        { geometry: 1 }
      ).lean();
      if (onlyGeom?.geometry?.coordinates) {
        stateObj.geometry = onlyGeom.geometry;
      }
    }

    // Ensure GeoJSON is MultiPolygon for Leaflet consistency
    if (stateObj.geometry && stateObj.geometry.coordinates) {
      if (stateObj.geometry.type === "Polygon") {
        stateObj.geometry = {
          type: "MultiPolygon",
          coordinates: [stateObj.geometry.coordinates],
        };
      }
    }

    return res.json(stateObj);
  } catch (error) {
    console.error("Error fetching state boundary:", error);
    return res.status(500).json({ message: "Error fetching state boundary" });
  }
});

module.exports = router;
