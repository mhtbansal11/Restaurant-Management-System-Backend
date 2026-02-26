const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
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
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  ingredients: [{
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem'
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);

