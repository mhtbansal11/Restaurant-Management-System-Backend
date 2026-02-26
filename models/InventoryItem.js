const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String, // e.g., 'kg', 'liters', 'pcs'
    required: true
  },
  minThreshold: {
    type: Number, // Level at which to alert
    default: 10
  },
  costPrice: {
    type: Number,
    required: true
  },
  supplier: {
    type: String,
    default: ''
  },
  category: {
    type: String, // e.g., 'Vegetables', 'Meat', 'Dairy'
    default: 'General'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
