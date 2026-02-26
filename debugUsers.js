require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db');
    console.log('Connected to MongoDB');

    const ownerEmail = 'mhtbansal11@gmail.com';
    const owner = await User.findOne({ email: ownerEmail });

    if (owner) {
      console.log('Owner found:', {
        email: owner.email,
        restaurantName: owner.restaurantName,
        role: owner.role,
        outletId: owner.outletId
      });
    } else {
      console.log('Owner mhtbansal11@gmail.com not found.');
    }

    const staff = await User.find({ email: { $ne: ownerEmail } }).limit(10);
    console.log('Sample Staff members:');
    staff.forEach(s => {
      console.log({
        email: s.email,
        restaurantName: s.restaurantName,
        role: s.role
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkData();
