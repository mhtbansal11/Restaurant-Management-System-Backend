require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Outlet = require('./models/Outlet');

const commonPassword = '12345678';
const targetRestaurantName = 'ATC';
const ownerEmail = 'mhtbansal11@gmail.com';

const staffMembers = [
  { name: 'Manager User', email: 'manager@test.com', role: 'manager' },
  { name: 'Cashier User', email: 'cashier@test.com', role: 'cashier' },
  { name: 'Receptionist User', email: 'receptionist@test.com', role: 'receptionist' },
  { name: 'Kitchen Staff User', email: 'kitchen@test.com', role: 'kitchen_staff' },
  { name: 'Waiter User', email: 'waiter@test.com', role: 'waiter' }
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db');
    console.log('Connected to MongoDB');
    
    // Check if outlet exists for ATC, else create one
    let outlet = await Outlet.findOne({ name: 'ATC Main Outlet' });
    if (!outlet) {
      outlet = await Outlet.create({
        name: 'ATC Main Outlet',
        address: 'ATC Address',
        phone: '1234567890',
        settings: { currency: 'INR' }
      });
      console.log('Created ATC Main Outlet');
    }

    // Update or Create Owner
    const existingOwner = await User.findOne({ email: ownerEmail });
    if (existingOwner) {
        console.log(`Updating owner ${ownerEmail}...`);
        existingOwner.restaurantName = targetRestaurantName;
        existingOwner.outletId = outlet._id;
        // existingOwner.role = 'owner'; // Don't change role if already owner
        await existingOwner.save();
    } else {
        console.log(`Creating owner ${ownerEmail}...`);
        await User.create({
            name: 'MHT Bansal',
            email: ownerEmail,
            password: commonPassword,
            role: 'owner',
            restaurantName: targetRestaurantName,
            outletId: outlet._id
        });
    }

    // Update/Create Staff
    for (const staff of staffMembers) {
      const existingUser = await User.findOne({ email: staff.email });
      if (existingUser) {
        console.log(`User ${staff.email} already exists. Updating to ${targetRestaurantName}...`);
        existingUser.password = commonPassword; 
        existingUser.role = staff.role;
        existingUser.outletId = outlet._id;
        existingUser.restaurantName = targetRestaurantName;
        await existingUser.save();
      } else {
        await User.create({
          ...staff,
          password: commonPassword,
          restaurantName: targetRestaurantName,
          outletId: outlet._id
        });
        console.log(`Created user: ${staff.email} (${staff.role}) for ${targetRestaurantName}`);
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
