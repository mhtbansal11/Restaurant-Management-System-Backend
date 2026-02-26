const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get all customers with search
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { restaurantName: req.user.restaurantName };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer by phone
router.get('/phone/:phone', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ 
      restaurantName: req.user.restaurantName, 
      phone: req.params.phone 
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update customer
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    
    let customer = await Customer.findOne({ restaurantName: req.user.restaurantName, phone });
    
    if (customer) {
      customer.name = name || customer.name;
      customer.email = email || customer.email;
      customer.address = address || customer.address;
      customer.notes = notes || customer.notes;
      await customer.save();
    } else {
      customer = new Customer({
        userId: req.user._id,
        restaurantName: req.user.restaurantName,
        name,
        phone,
        email,
        address,
        notes
      });
      await customer.save();
    }
    
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get customer balance and history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ 
      _id: req.params.id, 
      restaurantName: req.user.restaurantName 
    });
    
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    const orders = await Order.find({
      restaurantName: req.user.restaurantName,
      $or: [
        { customer: customer._id },
        { customerPhone: customer.phone }
      ]
    })
      .select('_id totalAmount paidAmount dueAmount paymentStatus paymentMode createdAt status subtotal discountAmount taxAmount serviceChargeAmount taxRate serviceChargeRate discountPercent items orderType tableLabel')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: -1 });

    res.json({
      ...customer.toObject(),
      orderHistory: orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
