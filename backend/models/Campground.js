const mongoose = require('mongoose');

const campgroundSchema = new mongoose.Schema({
  id: String,
  name: String,
  parkCode: String,
  description: String,
  type: String,
  latitude: Number,
  longitude: Number,
  amenities: [String],
  accessibility: {
    wheelchairAccess: Boolean,
    internetInfo: String,
    cellPhoneInfo: String,
    rvAllowed: Boolean,
    rvInfo: String,
    additionalInfo: String,
  },
  contacts: {
    phoneNumbers: [{
      phoneNumber: String,
      description: String,
      extension: String,
      type: String
    }],
    emailAddresses: [{
      emailAddress: String,
      description: String
    }]
  }
});

module.exports = mongoose.model('Campground', campgroundSchema);