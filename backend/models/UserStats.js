const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalTripsPlanned: {
    type: Number,
    default: 0,
    min: 0
  },
  nationalParksVisited: {
    type: Number,
    default: 0,
    min: 0
  },
  stateParksVisited: {
    type: Number,
    default: 0,
    min: 0
  },
  milesOfTrailsPlanned: {
    type: Number,
    default: 0,
    min: 0
  },
  campgroundsStayed: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = UserStats;
