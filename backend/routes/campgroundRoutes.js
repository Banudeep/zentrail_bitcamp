const express = require('express');
const router = express.Router();
const Campground = require('../models/Campground');

// Get all campgrounds
router.get('/', async (req, res) => {
  try {
    const campgrounds = await Campground.find();
    res.json(campgrounds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get campgrounds by park code
router.get('/park/:parkCode', async (req, res) => {
  try {
    const campgrounds = await Campground.find({ parkCode: req.params.parkCode });
    res.json(campgrounds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single campground by ID
router.get('/:id', async (req, res) => {
  try {
    const campground = await Campground.findOne({ id: req.params.id });
    if (!campground) {
      return res.status(404).json({ message: 'Campground not found' });
    }
    res.json(campground);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new campground
router.post('/', async (req, res) => {
  const campground = new Campground(req.body);
  try {
    const newCampground = await campground.save();
    res.status(201).json(newCampground);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a campground
router.patch('/:id', async (req, res) => {
  try {
    const campground = await Campground.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!campground) {
      return res.status(404).json({ message: 'Campground not found' });
    }
    res.json(campground);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a campground
router.delete('/:id', async (req, res) => {
  try {
    const campground = await Campground.findOneAndDelete({ id: req.params.id });
    if (!campground) {
      return res.status(404).json({ message: 'Campground not found' });
    }
    res.json({ message: 'Campground deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;