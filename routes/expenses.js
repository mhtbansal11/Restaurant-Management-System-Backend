const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get all expenses with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { period = 'month', category, status, search } = req.query;
    const restaurantName = req.user.restaurantName;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Build query
    let query = { restaurantName };
    
    if (period !== 'all') {
      query.date = { $gte: startDate };
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(query)
      .populate('userId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expense by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      restaurantName: req.user.restaurantName
    }).populate('userId', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new expense
router.post('/', auth, async (req, res) => {
  try {
    const {
      category,
      description,
      amount,
      date,
      paymentMethod,
      referenceNumber,
      vendor,
      isRecurring,
      recurringFrequency,
      status
    } = req.body;

    const expense = new Expense({
      userId: req.user.id,
      restaurantName: req.user.restaurantName,
      category,
      description,
      amount,
      date: date || new Date(),
      paymentMethod,
      referenceNumber,
      vendor,
      isRecurring,
      recurringFrequency,
      status
    });

    await expense.save();
    await expense.populate('userId', 'name email');
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        restaurantName: req.user.restaurantName
      },
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      restaurantName: req.user.restaurantName
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expense statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const restaurantName = req.user.restaurantName;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get total expenses
    const totalExpenses = await Expense.aggregate([
      {
        $match: {
          restaurantName,
          date: { $gte: startDate },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get expenses by category
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          restaurantName,
          date: { $gte: startDate },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Get monthly trend
    const monthlyTrend = await Expense.aggregate([
      {
        $match: {
          restaurantName,
          date: { $gte: new Date(now.getFullYear(), 0, 1) },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      totalExpenses: totalExpenses[0]?.total || 0,
      expensesByCategory,
      monthlyTrend
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get profit and loss data
router.get('/stats/profit-loss', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const restaurantName = req.user.restaurantName;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get total revenue from orders (use paidAmount instead of totalAmount for accurate revenue)
    const revenueData = await Order.aggregate([
      {
        $match: {
          restaurantName,
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paidAmount' },  // Use paidAmount instead of totalAmount
          totalDueAmount: { $sum: '$dueAmount' },  // Track due amounts separately
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Get total expenses
    const expenseData = await Expense.aggregate([
      {
        $match: {
          restaurantName,
          date: { $gte: startDate },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          expenseCount: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalDueAmount = revenueData[0]?.totalDueAmount || 0;
    const totalExpenses = expenseData[0]?.totalExpenses || 0;
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      totalRevenue,
      totalDueAmount,  // Include due amounts in response
      totalExpenses,
      netProfit,
      orderCount: revenueData[0]?.orderCount || 0,
      expenseCount: expenseData[0]?.expenseCount || 0,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;