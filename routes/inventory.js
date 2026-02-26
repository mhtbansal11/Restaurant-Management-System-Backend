const express = require('express');
const InventoryItem = require('../models/InventoryItem');
const { getInventoryInsights } = require('../services/ai/inventoryService');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');
const router = express.Router();

// @route   GET /api/inventory/insights
// @desc    Get AI-driven inventory insights
// @access  Private
router.get('/insights', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const items = await InventoryItem.find({ restaurantName: req.user.restaurantName });
    const insights = await getInventoryInsights(items, req.user._id);
    res.json(insights);
  } catch (error) {
    console.error('Inventory Insights Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all inventory items
router.get('/', [auth, checkRole(['superadmin', 'owner', 'manager', 'kitchen_staff'])], async (req, res) => {
  try {
    const items = await InventoryItem.find({ restaurantName: req.user.restaurantName });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new inventory item
router.post('/', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const item = new InventoryItem({
      ...req.body,
      userId: req.user._id,
      restaurantName: req.user.restaurantName
    });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update inventory item
router.put('/:id', [auth, checkRole(['superadmin', 'owner', 'manager', 'kitchen_staff'])], async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, restaurantName: req.user.restaurantName },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete inventory item
router.delete('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, restaurantName: req.user.restaurantName });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
