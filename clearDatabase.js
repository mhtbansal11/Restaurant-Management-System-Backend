const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import all models
const User = require('./models/User');
const Customer = require('./models/Customer');
const Order = require('./models/Order');
const MenuItem = require('./models/MenuItem');
const Table = require('./models/Table');
const SeatingLayout = require('./models/SeatingLayout');
const Outlet = require('./models/Outlet');
const InventoryItem = require('./models/InventoryItem');

async function clearDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
    console.log('✅ Connected to database');

    // Clear all collections in order of dependencies
    console.log('\n🗑️  Clearing database data (keeping Users and Outlets for access)...');
    
    // Clear orders first (depends on customers, menu items, tables)
    const orderResult = await Order.deleteMany({});
    console.log(`📋 Orders: ${orderResult.deletedCount} documents deleted`);

    // Clear customers
    const customerResult = await Customer.deleteMany({});
    console.log(`👥 Customers: ${customerResult.deletedCount} documents deleted`);

    // Clear inventory items
    const inventoryResult = await InventoryItem.deleteMany({});
    console.log(`📦 Inventory Items: ${inventoryResult.deletedCount} documents deleted`);

    // Clear menu items
    const menuResult = await MenuItem.deleteMany({});
    console.log(`🍽️ Menu Items: ${menuResult.deletedCount} documents deleted`);

    // Clear tables
    const tableResult = await Table.deleteMany({});
    console.log(`🪑 Tables: ${tableResult.deletedCount} documents deleted`);

    // Clear seating layouts
    const seatingResult = await SeatingLayout.deleteMany({});
    console.log(`🏛️ Seating Layouts: ${seatingResult.deletedCount} documents deleted`);

    // We keep Outlets and Users so the user can still log in and use the system
    console.log('🏪 Outlets: Kept for system configuration');
    console.log('👤 Users: Kept for login access');

    console.log('\n✅ Database transactional data cleared successfully!');
    console.log('📊 Summary:');
    console.log(`   - Orders: ${orderResult.deletedCount}`);
    console.log(`   - Customers: ${customerResult.deletedCount}`);
    console.log(`   - Inventory Items: ${inventoryResult.deletedCount}`);
    console.log(`   - Menu Items: ${menuResult.deletedCount}`);
    console.log(`   - Tables: ${tableResult.deletedCount}`);
    console.log(`   - Seating Layouts: ${seatingResult.deletedCount}`);


  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the clear function
clearDatabase();
