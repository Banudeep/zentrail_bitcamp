const mongoose = require("mongoose");

const trailSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "Feature",
  },
  properties: {
    OBJECTID: Number,
    TRLNAME: String,
    TRLALTNAME: String,
    MAPLABEL: String,
    TRLSTATUS: String,
    TRLSURFACE: String,
    TRLTYPE: String,
    TRLCLASS: String,
    TRLUSE: String,
    PUBLICDISPLAY: String,
    DATAACCESS: String,
    ACCESSNOTES: String,
    ORIGINATOR: String,
    UNITCODE: String,
    UNITNAME: String,
    UNITTYPE: String,
    GROUPCODE: String,
    GROUPNAME: String,
    REGIONCODE: String,
    CREATEDATE: Date,
    EDITDATE: Date,
    LINETYPE: String,
    MAPMETHOD: String,
    MAPSOURCE: String,
    SOURCEDATE: Date,
    XYACCURACY: String,
    GEOMETRYID: String,
    FEATUREID: String,
    FACLOCID: String,
    FACASSETID: String,
    IMLOCID: String,
    OBSERVABLE: String,
    ISEXTANT: String,
    OPENTOPUBLIC: String,
    ALTLANGNAME: String,
    ALTLANG: String,
    SEASONAL: String,
    SEASDESC: String,
    MAINTAINER: String,
    NOTES: String,
    StagingTable: String,
    ShapeSTLength: Number,
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default: "LineString",
    },
    coordinates: {
      type: [[Number]],
      required: true,
    },
  },
});

// Add getter to convert MongoDB number objects to regular numbers
trailSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.properties && ret.properties.OBJECTID) {
      ret.properties.OBJECTID = Number(ret.properties.OBJECTID);
    }
    if (ret.properties && ret.properties.ShapeSTLength) {
      ret.properties.ShapeSTLength = Number(ret.properties.ShapeSTLength);
    }
    return ret;
  },
});

module.exports = mongoose.model("trails", trailSchema);
