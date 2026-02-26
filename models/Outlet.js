const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  settings: {
    currency: { type: String, default: 'INR' },
    taxRate: { type: Number, default: 5 }, // Percentage
    serviceCharge: { type: Number, default: 0 },
    isGstEnabled: { type: Boolean, default: true },
    gstNumber: { type: String },
    fssaiNumber: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Outlet', outletSchema);
