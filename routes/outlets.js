const express = require('express');
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const checkRole = require('../middleware/roleMiddleware');
const router = express.Router();

const ALLOWED_OUTLET_FIELDS = ['name', 'address', 'phone', 'email', 'ownerName', 'settings'];

// Get current outlet settings
router.get('/current', async (req, res) => {
  try {
    let outlet;
    if (req.user.outletId) {
      outlet = await Outlet.findById(req.user.outletId);
    } else {
      outlet = await Outlet.findOne({ createdBy: req.user._id });
      if (!outlet) {
        outlet = new Outlet({
          name: req.user.restaurantName || 'My Restaurant',
          address: '',
          phone: '',
          createdBy: req.user._id
        });
        await outlet.save();
      }
      // Link outlet to user so future requests use the fast path
      await User.findByIdAndUpdate(req.user._id, { outletId: outlet._id });
    }
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update outlet settings
router.put('/current', checkRole(['superadmin', 'owner']), async (req, res) => {
  try {
    const update = {};
    ALLOWED_OUTLET_FIELDS.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    let outlet;
    if (req.user.outletId) {
      outlet = await Outlet.findByIdAndUpdate(req.user.outletId, update, { new: true });
    } else {
      outlet = await Outlet.findOneAndUpdate(
        { createdBy: req.user._id },
        update,
        { new: true, upsert: true }
      );
      await User.findByIdAndUpdate(req.user._id, { outletId: outlet._id });
    }
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
