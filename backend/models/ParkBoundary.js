const mongoose = require("mongoose");

const parkBoundarySchema = new mongoose.Schema(
  {
    parkCode: {
      type: String,
      required: true,
      unique: true,
    },
    boundaryData: {
      type: {
        type: String,
        enum: ["FeatureCollection"],
        required: true,
      },
      features: [
        {
          type: {
            type: String,
            enum: ["Feature"],
            required: true,
          },
          id: String,
          geometry: {
            type: {
              type: String,
              enum: ["MultiPolygon"],
              required: true,
            },
            coordinates: {
              type: [[[[Number]]]],
              required: true,
              get: function (coords) {
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
          properties: {
            alternateName: String,
            designationId: {
              type: String,
              required: true,
            },
            designation: {
              name: String,
              description: String,
              abbreviation: String,
              id: String,
            },
            aliases: [
              {
                parkId: String,
                current: Boolean,
                name: String,
                id: String,
              },
            ],
            name: {
              type: String,
              required: true,
            },
          },
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
    collection: "park_boundaries",
  }
);

module.exports = mongoose.model("ParkBoundary", parkBoundarySchema);
