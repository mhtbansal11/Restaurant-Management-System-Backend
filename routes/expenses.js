const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get all expenses with filtering
router.get('/', async (req, res) => {
  try {
    const { period = 'month', category, status, search } = req.query;
    const restaurantName = req.user.restaurantName;
    
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

    let query = { restaurantName };
    if (period !== 'all') query.date = { $gte: startDate };
    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;
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

// Get expense statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const restaurantName = req.user.restaurantName;
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today': startDate.setHours(0, 0, 0, 0); break;
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }

    const totalExpenses = await Expense.aggregate([
      { $match: { restaurantName, date: { $gte: startDate }, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const expensesByCategory = await Expense.aggregate([
      { $match: { restaurantName, date: { $gte: startDate }, status: 'paid' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.json({
      totalExpenses: totalExpenses[0]?.total || 0,
      expensesByCategory
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// AI Budget Alerts
router.get('/stats/alerts', async (req, res) => {
  try {
    const restaurantName = req.user.restaurantName;
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    const [revenueData, expenseData] = await Promise.all([
      Order.aggregate([
        { $match: { restaurantName, createdAt: { $gte: thirtyDaysAgo }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      Expense.aggregate([
        { $match: { restaurantName, date: { $gte: thirtyDaysAgo }, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const revenue = revenueData[0]?.total || 0;
    const expenses = expenseData[0]?.total || 0;
    const ratio = revenue > 0 ? (expenses / revenue) : 0;

    const alerts = [];
    if (ratio > 0.5) {
      alerts.push({ level: 'critical', message: `High overhead: Expenses are ${Math.round(ratio * 100)}% of revenue.`, action: 'Review non-essential spend immediately.' });
    } else if (ratio > 0.3) {
      alerts.push({ level: 'warning', message: `Margin squeeze: Expenses reached ${Math.round(ratio * 100)}% of revenue.`, action: 'Monitor ingredient waste and supplier costs.' });
    }

    const categoryTrend = await Expense.aggregate([
      { $match: { restaurantName, date: { $gte: thirtyDaysAgo }, status: 'paid' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    if (categoryTrend.length > 0 && categoryTrend[0].total > (expenses * 0.4)) {
      alerts.push({ level: 'info', message: `Category focus: "${categoryTrend[0]._id}" accounts for ${Math.round((categoryTrend[0].total / expenses) * 100)}% of spend.`, action: 'Audit spikes in this category.' });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Standard CRUD (Simplified)
router.post('/', async (req, res) => {
  try {
    const expense = new Expense({ ...req.body, userId: req.user.id, restaurantName: req.user.restaurantName });
    await expense.save();
    
    // Emit real-time notification
    const io = req.app.get('socketio');
    if (io) {
      io.to(req.user.restaurantName).emit('new_expense', expense);
    }

    res.status(201).json(expense);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate({ _id: req.params.id, restaurantName: req.user.restaurantName }, req.body, { new: true });
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, restaurantName: req.user.restaurantName });
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;