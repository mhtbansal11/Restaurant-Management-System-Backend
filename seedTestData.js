require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Outlet = require('./models/Outlet');
const MenuItem = require('./models/MenuItem');
const InventoryItem = require('./models/InventoryItem');
const Expense = require('./models/Expense');
const ExpenseReminder = require('./models/ExpenseReminder');
const Order = require('./models/Order');
const Customer = require('./models/Customer');

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

const menuItems = [
  // Starters
  { name: 'Paneer Tikka', category: 'starters', price: 250, description: 'Grilled cottage cheese with spices', cost: 80, isAvailable: true },
  { name: 'Chicken 65', category: 'starters', price: 280, description: 'Spicy fried chicken', cost: 90, isAvailable: true },
  { name: 'Spring Rolls', category: 'starters', price: 180, description: 'Crispy vegetable rolls', cost: 60, isAvailable: true },
  
  // Main Course - Veg
  { name: 'Paneer Butter Masala', category: 'main_course', price: 320, description: 'Cottage cheese in rich tomato gravy', cost: 100, isAvailable: true },
  { name: 'Dal Makhani', category: 'main_course', price: 220, description: 'Creamy black lentils', cost: 70, isAvailable: true },
  { name: 'Vegetable Biryani', category: 'main_course', price: 280, description: 'Fragrant rice with vegetables', cost: 85, isAvailable: true },
  
  // Main Course - Non Veg
  { name: 'Butter Chicken', category: 'main_course', price: 380, description: 'Chicken in creamy tomato sauce', cost: 120, isAvailable: true },
  { name: 'Mutton Rogan Josh', category: 'main_course', price: 420, description: 'Mutton in rich gravy', cost: 140, isAvailable: true },
  { name: 'Chicken Biryani', category: 'main_course', price: 320, description: 'Fragrant rice with chicken', cost: 100, isAvailable: true },
  
  // Breads
  { name: 'Butter Naan', category: 'breads', price: 60, description: 'Soft leavened bread', cost: 20, isAvailable: true },
  { name: 'Garlic Naan', category: 'breads', price: 80, description: 'Naan with garlic butter', cost: 25, isAvailable: true },
  { name: 'Roti', category: 'breads', price: 30, description: 'Whole wheat bread', cost: 10, isAvailable: true },
  
  // Desserts
  { name: 'Gulab Jamun', category: 'desserts', price: 120, description: 'Sweet milk balls in syrup', cost: 40, isAvailable: true },
  { name: 'Ice Cream', category: 'desserts', price: 150, description: 'Vanilla ice cream', cost: 50, isAvailable: true },
  
  // Beverages
  { name: 'Masala Chai', category: 'beverages', price: 50, description: 'Spiced Indian tea', cost: 15, isAvailable: true },
  { name: 'Fresh Lime Soda', category: 'beverages', price: 80, description: 'Refreshing lime drink', cost: 25, isAvailable: true },
  { name: 'Coca Cola', category: 'beverages', price: 60, description: 'Cold drink', cost: 20, isAvailable: true }
];

const inventoryItems = [
  { name: 'Paneer', category: 'dairy', quantity: 50, unit: 'kg', minThreshold: 10, costPrice: 200 },
  { name: 'Chicken', category: 'meat', quantity: 30, unit: 'kg', minThreshold: 5, costPrice: 180 },
  { name: 'Mutton', category: 'meat', quantity: 20, unit: 'kg', minThreshold: 5, costPrice: 400 },
  { name: 'Rice', category: 'grains', quantity: 100, unit: 'kg', minThreshold: 20, costPrice: 50 },
  { name: 'Wheat Flour', category: 'grains', quantity: 80, unit: 'kg', minThreshold: 15, costPrice: 40 },
  { name: 'Tomatoes', category: 'vegetables', quantity: 25, unit: 'kg', minThreshold: 5, costPrice: 30 },
  { name: 'Onions', category: 'vegetables', quantity: 40, unit: 'kg', minThreshold: 8, costPrice: 25 },
  { name: 'Milk', category: 'dairy', quantity: 20, unit: 'liters', minThreshold: 5, costPrice: 60 },
  { name: 'Butter', category: 'dairy', quantity: 15, unit: 'kg', minThreshold: 3, costPrice: 300 },
  { name: 'Cooking Oil', category: 'oils', quantity: 30, unit: 'liters', minThreshold: 5, costPrice: 150 },
  { name: 'Spices', category: 'spices', quantity: 10, unit: 'kg', minThreshold: 2, costPrice: 500 }
];

const monthlyExpenses = [
  { category: 'rent', amount: 50000, description: 'Monthly shop rent', date: new Date() },
  { category: 'utilities', amount: 15000, description: 'Electricity, water, gas bills', date: new Date() },
  { category: 'salary', amount: 120000, description: 'Staff salaries for the month', date: new Date() },
  { category: 'inventory', amount: 80000, description: 'Monthly grocery purchase', date: new Date() },
  { category: 'maintenance', amount: 10000, description: 'Equipment maintenance', date: new Date() }
];

const expenseReminders = [
  { title: 'Rent Payment', description: 'Pay shop rent for next month', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), nextReminder: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), amount: 50000, category: 'rent', frequency: 'monthly', reminderType: 'before_due' },
  { title: 'Staff Salaries', description: 'Pay staff salaries for current month', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), nextReminder: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), amount: 120000, category: 'salary', frequency: 'monthly', reminderType: 'before_due' },
  { title: 'Grocery Order', description: 'Place monthly grocery order', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), nextReminder: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), amount: 80000, category: 'inventory', frequency: 'monthly', reminderType: 'before_due' },
  { title: 'Buy Milk', description: 'Buy 10 litre milk today', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), nextReminder: new Date(Date.now() + 12 * 60 * 60 * 1000), amount: 0, category: 'inventory', frequency: 'daily', reminderType: 'before_due' }
];

const testCustomers = [
  { name: 'Regular Customer', phone: '9876543210', email: 'regular@customer.com', address: '123 Main Street' },
  { name: 'VIP Customer', phone: '9876543211', email: 'vip@customer.com', address: '456 Elite Road' },
  { name: 'New Customer', phone: '9876543212', email: 'new@customer.com', address: '789 New Avenue' }
];

const seedTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-db');
    console.log('Connected to MongoDB');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Outlet.deleteMany({});
    await MenuItem.deleteMany({});
    await InventoryItem.deleteMany({});
    await Expense.deleteMany({});
    await ExpenseReminder.deleteMany({});
    await Order.deleteMany({});
    await Customer.deleteMany({});
    
    console.log('All existing data cleared');
    
    // Create outlet
    const outlet = await Outlet.create({
      name: 'ATC Main Outlet',
      address: 'ATC Address, City Center',
      phone: '1234567890',
      settings: { currency: 'INR', taxRate: 5, serviceChargeRate: 10 }
    });
    console.log('Created ATC Main Outlet');
    
    // Create owner
    const owner = await User.create({
      name: 'MHT Bansal',
      email: ownerEmail,
      password: commonPassword,
      role: 'owner',
      restaurantName: targetRestaurantName,
      outletId: outlet._id
    });
    console.log('Created owner account');
    
    // Create staff members
    for (const staff of staffMembers) {
      await User.create({
        ...staff,
        password: commonPassword,
        restaurantName: targetRestaurantName,
        outletId: outlet._id
      });
      console.log(`Created staff: ${staff.name} (${staff.role})`);
    }
    
    // Create menu items
    const createdMenuItems = [];
    for (const item of menuItems) {
      const menuItem = await MenuItem.create({
        ...item,
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id
      });
      createdMenuItems.push(menuItem);
      console.log(`Created menu item: ${item.name}`);
    }
    
    // Create inventory items
    for (const item of inventoryItems) {
      await InventoryItem.create({
        ...item,
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id
      });
      console.log(`Created inventory item: ${item.name}`);
    }
    
    // Create monthly expenses
    for (const expense of monthlyExpenses) {
      await Expense.create({
        ...expense,
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        approvedBy: owner._id
      });
      console.log(`Created expense: ${expense.category} - ₹${expense.amount}`);
    }
    
    // Create expense reminders
    for (const reminder of expenseReminders) {
      await ExpenseReminder.create({
        ...reminder,
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        createdBy: owner._id
      });
      console.log(`Created reminder: ${reminder.title}`);
    }
    
    // Create test customers
    const createdCustomers = [];
    for (const customer of testCustomers) {
      const cust = await Customer.create({
        ...customer,
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id
      });
      createdCustomers.push(cust);
      console.log(`Created customer: ${customer.name}`);
    }
    
    // Create test orders with payment data
    const today = new Date();
    const orders = [
      // Completed orders with cash payment
      {
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        orderType: 'dine-in',
        tableLabel: 'Table 1',
        items: [
          { menuItem: createdMenuItems[0]._id, quantity: 2, price: createdMenuItems[0].price },
          { menuItem: createdMenuItems[3]._id, quantity: 1, price: createdMenuItems[3].price }
        ],
        totalAmount: 820,
        paidAmount: 820,
        dueAmount: 0,
        paymentMode: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        customer: createdCustomers[0]._id,
        customerName: createdCustomers[0].name,
        customerPhone: createdCustomers[0].phone,
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30)
      },
      {
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        orderType: 'takeaway',
        items: [
          { menuItem: createdMenuItems[1]._id, quantity: 1, price: createdMenuItems[1].price },
          { menuItem: createdMenuItems[10]._id, quantity: 3, price: createdMenuItems[10].price }
        ],
        totalAmount: 460,
        paidAmount: 460,
        dueAmount: 0,
        paymentMode: 'online',
        paymentStatus: 'paid',
        status: 'completed',
        customer: createdCustomers[1]._id,
        customerName: createdCustomers[1].name,
        customerPhone: createdCustomers[1].phone,
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 45)
      },
      
      // Order with due amount
      {
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        orderType: 'dine-in',
        tableLabel: 'Table 3',
        items: [
          { menuItem: createdMenuItems[6]._id, quantity: 2, price: createdMenuItems[6].price },
          { menuItem: createdMenuItems[11]._id, quantity: 2, price: createdMenuItems[11].price }
        ],
        totalAmount: 1400,
        paidAmount: 1000,
        dueAmount: 400,
        paymentMode: 'due',
        paymentStatus: 'partially_paid',
        status: 'completed',
        customer: createdCustomers[2]._id,
        customerName: createdCustomers[2].name,
        customerPhone: createdCustomers[2].phone,
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 15)
      },
      
      // Mixed payment order
      {
        userId: owner._id,
        restaurantName: targetRestaurantName,
        outletId: outlet._id,
        orderType: 'dine-in',
        tableLabel: 'Table 2',
        items: [
          { menuItem: createdMenuItems[4]._id, quantity: 1, price: createdMenuItems[4].price },
          { menuItem: createdMenuItems[8]._id, quantity: 2, price: createdMenuItems[8].price },
          { menuItem: createdMenuItems[15]._id, quantity: 2, price: createdMenuItems[15].price }
        ],
        totalAmount: 1040,
        paidAmount: 1040,
        dueAmount: 0,
        paymentMode: 'mixed',
        paymentStatus: 'paid',
        status: 'completed',
        customer: createdCustomers[0]._id,
        customerName: createdCustomers[0].name,
        customerPhone: createdCustomers[0].phone,
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 20)
      }
    ];
    
    for (const orderData of orders) {
      const order = await Order.create(orderData);
      console.log(`Created order: ₹${order.totalAmount} (${order.paymentMode})`);
    }
    
    console.log('\n✅ Test data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${staffMembers.length} staff members created`);
    console.log(`   - ${menuItems.length} menu items created`);
    console.log(`   - ${inventoryItems.length} inventory items created`);
    console.log(`   - ${monthlyExpenses.length} monthly expenses created`);
    console.log(`   - ${expenseReminders.length} expense reminders created`);
    console.log(`   - ${testCustomers.length} customers created`);
    console.log(`   - ${orders.length} orders with payment data created`);
    console.log('\n🔑 Login credentials:');
    console.log(`   Owner: ${ownerEmail} / ${commonPassword}`);
    console.log(`   Manager: manager@test.com / ${commonPassword}`);
    console.log(`   Cashier: cashier@test.com / ${commonPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedTestData();
