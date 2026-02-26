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

async function createTestData() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management');
    console.log('✅ Connected to database');

    // Get the existing user
    const user = await User.findOne({ email: 'mhtbansal11@gmail.com' });
    if (!user) {
      console.log('❌ No user found. Please ensure you have a user account.');
      return;
    }

    console.log(`👤 Using user: ${user.name} (${user.restaurantName})`);

    // Clear existing test data (except users and outlets)
    console.log('\n🗑️  Clearing existing test data...');
    await Order.deleteMany({});
    await Customer.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await SeatingLayout.deleteMany({});
    await InventoryItem.deleteMany({});

    // Create inventory items
    console.log('\n📦 Creating inventory items...');
    const inventoryItems = [
      { name: 'Rice', quantity: 50, unit: 'kg', costPrice: 50, category: 'Grains', supplier: 'Local Market' },
      { name: 'Chicken', quantity: 20, unit: 'kg', costPrice: 200, category: 'Meat', supplier: 'Meat Shop' },
      { name: 'Tomato', quantity: 30, unit: 'kg', costPrice: 40, category: 'Vegetables', supplier: 'Vegetable Market' },
      { name: 'Onion', quantity: 25, unit: 'kg', costPrice: 30, category: 'Vegetables', supplier: 'Vegetable Market' },
      { name: 'Potato', quantity: 40, unit: 'kg', costPrice: 25, category: 'Vegetables', supplier: 'Vegetable Market' },
      { name: 'Flour', quantity: 35, unit: 'kg', costPrice: 45, category: 'Grains', supplier: 'Local Market' },
      { name: 'Oil', quantity: 20, unit: 'liters', costPrice: 180, category: 'Cooking Oil', supplier: 'Oil Merchant' },
      { name: 'Spices Mix', quantity: 10, unit: 'kg', costPrice: 300, category: 'Spices', supplier: 'Spice Shop' },
      { name: 'Paneer', quantity: 15, unit: 'kg', costPrice: 250, category: 'Dairy', supplier: 'Dairy Farm' },
      { name: 'Butter', quantity: 12, unit: 'kg', costPrice: 400, category: 'Dairy', supplier: 'Dairy Farm' }
    ];

    const createdInventory = [];
    for (const item of inventoryItems) {
      const inventoryItem = new InventoryItem({
        ...item,
        userId: user._id,
        restaurantName: user.restaurantName
      });
      createdInventory.push(await inventoryItem.save());
    }
    console.log(`✅ Created ${createdInventory.length} inventory items`);

    // Create menu items
    console.log('\n🍽️ Creating menu items...');
    const menuItems = [
      // Starters
      { name: 'Paneer Tikka', description: 'Grilled cottage cheese cubes with spices', price: 250, category: 'Starters' },
      { name: 'Chicken Tikka', description: 'Grilled chicken pieces with spices', price: 300, category: 'Starters' },
      { name: 'Vegetable Spring Rolls', description: 'Crispy vegetable rolls', price: 180, category: 'Starters' },
      
      // Main Course - Veg
      { name: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato gravy', price: 320, category: 'Main Course' },
      { name: 'Dal Makhani', description: 'Creamy black lentils', price: 220, category: 'Main Course' },
      { name: 'Vegetable Biryani', description: 'Fragrant rice with mixed vegetables', price: 280, category: 'Main Course' },
      
      // Main Course - Non Veg
      { name: 'Butter Chicken', description: 'Chicken in creamy tomato gravy', price: 350, category: 'Main Course' },
      { name: 'Chicken Biryani', description: 'Fragrant rice with chicken', price: 320, category: 'Main Course' },
      { name: 'Mutton Rogan Josh', description: 'Mutton in rich gravy', price: 450, category: 'Main Course' },
      
      // Breads
      { name: 'Butter Naan', description: 'Soft leavened bread with butter', price: 60, category: 'Breads' },
      { name: 'Garlic Naan', description: 'Naan with garlic flavor', price: 80, category: 'Breads' },
      { name: 'Roti', description: 'Whole wheat flatbread', price: 30, category: 'Breads' },
      
      // Rice
      { name: 'Plain Rice', description: 'Steamed basmati rice', price: 120, category: 'Rice' },
      { name: 'Jeera Rice', description: 'Rice with cumin seeds', price: 140, category: 'Rice' },
      
      // Desserts
      { name: 'Gulab Jamun', description: 'Sweet milk balls in syrup', price: 120, category: 'Desserts' },
      { name: 'Ice Cream', description: 'Vanilla ice cream', price: 100, category: 'Desserts' },
      
      // Beverages
      { name: 'Masala Chai', description: 'Spiced Indian tea', price: 50, category: 'Beverages' },
      { name: 'Cold Coffee', description: 'Iced coffee with cream', price: 120, category: 'Beverages' },
      { name: 'Fresh Lime Soda', description: 'Refreshing lime drink', price: 80, category: 'Beverages' }
    ];

    const createdMenuItems = [];
    for (const item of menuItems) {
      const menuItem = new MenuItem({
        ...item,
        userId: user._id,
        restaurantName: user.restaurantName,
        ingredients: [] // Simplified for test data
      });
      createdMenuItems.push(await menuItem.save());
    }
    console.log(`✅ Created ${createdMenuItems.length} menu items`);

    // Create tables
    console.log('\n🪑 Creating tables...');
    const tables = [
      { tableId: 'T01', capacity: 2, status: 'available' },
      { tableId: 'T02', capacity: 2, status: 'available' },
      { tableId: 'T03', capacity: 4, status: 'available' },
      { tableId: 'T04', capacity: 4, status: 'available' },
      { tableId: 'T05', capacity: 6, status: 'available' },
      { tableId: 'T06', capacity: 6, status: 'available' },
      { tableId: 'T07', capacity: 8, status: 'available' },
      { tableId: 'T08', capacity: 2, status: 'available' },
      { tableId: 'T09', capacity: 4, status: 'available' },
      { tableId: 'T10', capacity: 4, status: 'available' },
      { tableId: 'T11', capacity: 6, status: 'available' },
      { tableId: 'T12', capacity: 8, status: 'available' }
    ];

    const createdTables = [];
    for (const table of tables) {
      const tableDoc = new Table({
        ...table,
        userId: user._id,
        restaurantName: user.restaurantName
      });
      createdTables.push(await tableDoc.save());
    }
    console.log(`✅ Created ${createdTables.length} tables`);

    // Create customers
    console.log('\n👥 Creating customers...');
    const customers = [
      { name: 'Rajesh Kumar', phone: '+919876543210', email: 'rajesh@email.com', address: '123 Main Street' },
      { name: 'Priya Sharma', phone: '+919876543211', email: 'priya@email.com', address: '456 Oak Avenue' },
      { name: 'Amit Patel', phone: '+919876543212', email: 'amit@email.com', address: '789 Pine Road' },
      { name: 'Sneha Gupta', phone: '+919876543213', email: 'sneha@email.com', address: '321 Elm Street' },
      { name: 'Vikram Singh', phone: '+919876543214', email: 'vikram@email.com', address: '654 Maple Avenue' }
    ];

    const createdCustomers = [];
    for (const customer of customers) {
      const customerDoc = new Customer({
        ...customer,
        userId: user._id,
        restaurantName: user.restaurantName
      });
      createdCustomers.push(await customerDoc.save());
    }
    console.log(`✅ Created ${createdCustomers.length} customers`);

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Inventory Items: ${createdInventory.length}`);
    console.log(`   - Menu Items: ${createdMenuItems.length}`);
    console.log(`   - Tables: ${createdTables.length}`);
    console.log(`   - Customers: ${createdCustomers.length}`);
    console.log('\n✅ Your restaurant is now ready for comprehensive testing!');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the function
createTestData();
