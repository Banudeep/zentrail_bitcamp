const express = require('express');
const router = express.Router();
const UserStats = require('../models/UserStats');

// Create or update user stats
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      totalTripsPlanned,
      nationalParksVisited,
      stateParksVisited,
      milesOfTrailsPlanned,
      campgroundsStayed
    } = req.body;

    const stats = await UserStats.findOneAndUpdate(
      { userId },
      {
        totalTripsPlanned,
        nationalParksVisited,
        stateParksVisited,
        milesOfTrailsPlanned,
        campgroundsStayed,
        lastUpdated: Date.now()
      },
      { new: true, upsert: true }
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user stats
router.get('/:userId', async (req, res) => {
  try {
    const stats = await UserStats.findOne({ userId: req.params.userId });
    if (!stats) {
      return res.status(404).json({ message: 'User stats not found' });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
