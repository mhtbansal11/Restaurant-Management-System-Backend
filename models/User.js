const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'kitchen_staff', 'waiter'],
    default: 'owner'
  },
  outletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outlet'
  },
  // Personal Information
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    default: ''
  },
  emergencyContact: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    relation: {
      type: String,
      default: ''
    }
  },
  // Aadhar Card Information
  aadharNumber: {
    type: String,
    default: ''
  },
  aadharFront: {
    type: String,
    default: ''
  },
  aadharBack: {
    type: String,
    default: ''
  },
  aadharVerified: {
    type: Boolean,
    default: false
  },
  aadharStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  aadharRejectionReason: {
    type: String,
    default: ''
  },
  // Login Authorization
  loginAuthorized: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

