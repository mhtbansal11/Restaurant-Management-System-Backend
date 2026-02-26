const express = require('express');
const Outlet = require('../models/Outlet');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');
const router = express.Router();

// Get current outlet settings
router.get('/current', auth, async (req, res) => {
  try {
    let outlet;
    if (req.user.outletId) {
      outlet = await Outlet.findById(req.user.outletId);
    } else {
      // Fallback for owners without outletId yet
      outlet = await Outlet.findOne();
      if (!outlet) {
        // Create a default outlet if none exists
        outlet = new Outlet({
          name: req.user.restaurantName || 'My Restaurant',
          address: 'Default Address',
          phone: '0000000000'
        });
        await outlet.save();
      }
    }
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update outlet settings
router.put('/current', [auth, checkRole(['superadmin', 'owner'])], async (req, res) => {
  try {
    let outlet;
    if (req.user.outletId) {
      outlet = await Outlet.findByIdAndUpdate(req.user.outletId, req.body, { new: true });
    } else {
      outlet = await Outlet.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    }
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
