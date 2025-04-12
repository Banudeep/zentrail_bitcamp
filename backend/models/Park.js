const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activitySchema = new Schema({
  id: String,
  name: String,
});

const addressSchema = new Schema({
  postalCode: String,
  city: String,
  stateCode: String,
  countryCode: String,
  provinceTerritoryCode: String,
  line1: String,
  line2: String,
  line3: String,
  type: String,
});

const contactSchema = new Schema({
  phoneNumbers: [
    {
      phoneNumber: String,
      description: String,
      extension: String,
      type: String,
    },
  ],
  emailAddresses: [
    {
      description: String,
      emailAddress: String,
    },
  ],
});

const imageSchema = new Schema({
  credit: String,
  title: String,
  altText: String,
  caption: String,
  url: String,
});

const operatingHoursSchema = new Schema({
  exceptions: [
    {
      exceptionHours: Schema.Types.Mixed,
      startDate: String,
      name: String,
      endDate: String,
    },
  ],
  description: String,
  standardHours: {
    wednesday: String,
    monday: String,
    thursday: String,
    sunday: String,
    tuesday: String,
    friday: String,
    saturday: String,
  },
  name: String,
});

const topicSchema = new Schema({
  id: String,
  name: String,
});

const parkSchema = new Schema({
  id: String,
  activities: [activitySchema],
  addresses: [addressSchema],
  contacts: contactSchema,
  description: String,
  designation: String,
  directionsInfo: String,
  directionsUrl: String,
  entranceFees: [Schema.Types.Mixed],
  entrancePasses: [Schema.Types.Mixed],
  fees: [Schema.Types.Mixed],
  fullName: String,
  images: [imageSchema],
  latLong: String,
  latitude: String,
  longitude: String,
  multimedia: [Schema.Types.Mixed],
  name: String,
  operatingHours: [operatingHoursSchema],
  parkCode: {
    type: String,
    unique: true,
  },
  relevanceScore: Number,
  states: String,
  topics: [topicSchema],
  url: String,
  weatherInfo: String,
});

// Update the updatedAt timestamp before saving
parkSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Park = mongoose.model("Park", parkSchema);

module.exports = Park;
