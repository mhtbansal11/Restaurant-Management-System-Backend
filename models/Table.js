const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservedFor: {
    type: Date,
    default: null
  },
  guestName: {
    type: String,
    trim: true,
    default: ''
  },
  guestPhone: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const tableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  tableId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  customerCount: {
    type: Number,
    default: 0
  },
  capacity: {
    type: Number,
    required: true
  },
  reservation: {
    type: reservationSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Table', tableSchema);

