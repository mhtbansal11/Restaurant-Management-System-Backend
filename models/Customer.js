const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: String,
  pendingBalance: {
    type: Number,
    default: 0
  },
  advancePayment: {
    type: Number,
    default: 0
  },
  orderHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  notes: String
}, {
  timestamps: true
});

// Create a compound index for name and phone per restaurant
customerSchema.index({ restaurantName: 1, name: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
