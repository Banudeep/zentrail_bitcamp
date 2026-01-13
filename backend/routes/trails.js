const express = require("express");
const router = express.Router();
const Trail = require("../models/Trail");
//
// Helper function to convert MongoDB number objects to regular numbers
const convertMongoNumbers = (trail) => {
  if (trail.properties && trail.properties.OBJECTID) {
    trail.properties.OBJECTID = Number(trail.properties.OBJECTID);
  }
  if (trail.properties && trail.properties.ShapeSTLength) {
    trail.properties.ShapeSTLength = Number(trail.properties.ShapeSTLength);
  }
  return trail;
};

// Get all trails
router.get("/", async (req, res) => {
  try {
    const trails = await Trail.find(
      {},
      {
        "properties.TRLNAME": 1,
        "properties.UNITCODE": 1,
        "properties.UNITNAME": 1,
        "properties.TRLSTATUS": 1,
        "properties.TRLUSE": 1,
        "properties.SEASONAL": 1,
        "properties.SEASDESC": 1,
        "properties.MAINTAINER": 1,
        "properties.NOTES": 1,
        geometry: 1,
      }
    );
    res.json(trails.map(convertMongoNumbers));
  } catch (error) {
    console.error("Error fetching trails:", error);
    res.status(500).json({ message: "Error fetching trails" });
  }
});

// Diagnostic endpoint to check trail data
router.get("/debug/info", async (req, res) => {
  try {
    const totalTrails = await Trail.countDocuments({});
    const unitCodes = await Trail.distinct("properties.UNITCODE");
    const trailsByUnit = {};
    
    // Get count per unit code (limit to first 20 for performance)
    for (const unitCode of unitCodes.slice(0, 20)) {
      const count = await Trail.countDocuments({ "properties.UNITCODE": unitCode });
      trailsByUnit[unitCode] = count;
    }
    
    res.json({
      totalTrails,
      uniqueUnitCodes: unitCodes.length,
      sampleUnitCodes: unitCodes.slice(0, 20),
      trailsByUnitCode: trailsByUnit,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ message: "Error fetching trail info", error: error.message });
  }
});

// get trails by unit code
router.get("/unit/:unitCode", async (req, res) => {
  try {
    const unitCode = req.params.unitCode.toUpperCase(); // Normalize to uppercase
    console.log(`[Trails] Fetching trails for unit code: ${unitCode}`);
    
    // Try exact match first (most common case)
    let trails = await Trail.find({
      "properties.UNITCODE": unitCode,
    }).select(
      "properties.TRLNAME properties.UNITCODE properties.UNITNAME properties.TRLSTATUS properties.TRLSURFACE properties.TRLTYPE properties.TRLCLASS properties.TRLUSE properties.SEASONAL properties.SEASDESC properties.MAINTAINER properties.NOTES geometry"
    );
    
    // If no results, try case-insensitive regex
    if (!trails || trails.length === 0) {
      console.log(`[Trails] No exact match for ${unitCode}, trying case-insensitive...`);
      trails = await Trail.find({
        "properties.UNITCODE": { $regex: new RegExp(`^${req.params.unitCode}$`, "i") },
      }).select(
        "properties.TRLNAME properties.UNITCODE properties.UNITNAME properties.TRLSTATUS properties.TRLSURFACE properties.TRLTYPE properties.TRLCLASS properties.TRLUSE properties.SEASONAL properties.SEASDESC properties.MAINTAINER properties.NOTES geometry"
      );
    }
    
    // Debug: Check what UNITCODE values actually exist
    if (!trails || trails.length === 0) {
      const sampleUnitCodes = await Trail.distinct("properties.UNITCODE");
      console.log(`[Trails] No trails found for ${unitCode}. Sample UNITCODEs in DB:`, sampleUnitCodes.slice(0, 10));
    } else {
      console.log(`[Trails] Found ${trails.length} trails for unit code: ${unitCode}`);
    }
    
    res.json(trails.map(convertMongoNumbers));
  } catch (error) {
    console.error("Error fetching trails by unit code:", error);
    res.status(500).json({ message: "Error fetching trails by unit code" });
  }
});

// Get trails by park code
router.get("/park/:parkCode", async (req, res) => {
  try {
    const trails = await Trail.find(
      { "properties.UNITCODE": req.params.parkCode },
      {
        "properties.TRLNAME": 1,
        "properties.TRLALTNAME": 1,
        "properties.MAPLABEL": 1,
        "properties.TRLSTATUS": 1,
        "properties.TRLSURFACE": 1,
        "properties.TRLTYPE": 1,
        "properties.TRLCLASS": 1,
        "properties.TRLUSE": 1,
        "properties.SEASONAL": 1,
        "properties.SEASDESC": 1,
        "properties.MAINTAINER": 1,
        "properties.NOTES": 1,
        geometry: 1,
      }
    );

    if (!trails || trails.length === 0) {
      return res.status(404).json({ message: "No trails found for this park" });
    }

    res.json(trails.map(convertMongoNumbers));
  } catch (error) {
    console.error("Error fetching park trails:", error);
    res.status(500).json({ message: "Error fetching park trails" });
  }
});

// Get trail by ID
router.get("/:id", async (req, res) => {
  try {
    const trail = await Trail.findById(req.params.id);

    if (!trail) {
      return res.status(404).json({ message: "Trail not found" });
    }

    res.json(convertMongoNumbers(trail));
  } catch (error) {
    console.error("Error fetching trail:", error);
    res.status(500).json({ message: "Error fetching trail" });
  }
});

module.exports = router;
