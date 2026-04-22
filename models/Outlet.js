const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, default: '' },
  ownerName: { type: String, default: '' },
  isActive: { type: Boolean, default: true },

  // Subscription & Payment
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'suspended', 'expired'],
    default: 'trial'
  },
  subscriptionStartDate: { type: Date, default: Date.now },
  subscriptionEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  planAmount: { type: Number, default: 5000 },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'overdue'],
    default: 'pending'
  },
  lastPaymentDate: { type: Date, default: null },
  notes: { type: String, default: '' },

  settings: {
    currency: { type: String, default: 'INR' },
    taxRate: { type: Number, default: 5 },
    serviceCharge: { type: Number, default: 0 },
    isGstEnabled: { type: Boolean, default: true },
    gstNumber: { type: String },
    fssaiNumber: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Outlet', outletSchema);
