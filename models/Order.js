const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['queued', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'queued'
  }
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'packing'],
    default: 'dine-in'
  },
  previousOrderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'packing', null],
    default: null
  },
  tableId: {
    type: String, // Can be null for takeaway/delivery
    default: null
  },
  tableLabel: {
    type: String,
    default: null
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  serviceChargeRate: {
    type: Number,
    default: 0
  },
  serviceChargeAmount: {
    type: Number,
    default: 0
  },
  subtotal: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'preparing', 'ready', 'served', 'payment_pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid', 'refunded'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'online', 'card', 'due', 'mixed'],
    default: 'cash'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  // For AI Forecasting
  weatherAtTime: { type: String }, // e.g., "Rainy", "Sunny"
  isHoliday: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
