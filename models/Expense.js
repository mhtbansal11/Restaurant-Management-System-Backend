const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['salary', 'inventory', 'rent', 'utilities', 'maintenance', 'marketing', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'upi', 'other'],
    default: 'cash'
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  vendor: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', null],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'paid'
  }
}, {
  timestamps: true
});

// Index for efficient querying
expenseSchema.index({ restaurantName: 1, date: -1 });
expenseSchema.index({ restaurantName: 1, category: 1 });
expenseSchema.index({ restaurantName: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);