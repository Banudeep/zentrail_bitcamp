const mongoose = require("mongoose");

const stateBoundarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    abbreviation: {
      type: String,
      required: true,
      unique: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ["Polygon", "MultiPolygon"],
        required: true,
      },
      coordinates: {
        type: [[[[Number]]]],
        required: true,
        get: function (coords) {
          if (!coords) return coords;
          return coords.map((polygon) =>
            polygon.map((ring) =>
              ring.map((point) =>
                point.map((coord) =>
                  typeof coord === "object" && coord.$numberDouble
                    ? parseFloat(coord.$numberDouble)
                    : coord
                )
              )
            )
          );
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
    collection: "us_state_boundaries",
  }
);

module.exports = mongoose.model("StateBoundary", stateBoundarySchema);
