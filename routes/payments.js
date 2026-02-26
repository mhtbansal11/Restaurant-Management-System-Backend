const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// Get payments with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { period = 'today', paymentType, customerStatus, search } = req.query;
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
      case 'all':
        startDate = new Date(0); // All time
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Build query
    let query = {
      restaurantName
    };

    // Date filtering logic
    const isDateSearch = /^\d{4}-\d{2}-\d{2}$/.test(search);
    
    if (search) {
        // If searching and period is the default 'today', search all-time
        // Also if searching by a specific date, ignore the period filter
        if (period !== 'today' && period !== 'all' && !isDateSearch) {
            query.createdAt = { $gte: startDate };
        }
    } else {
        // Not searching, apply period filter
        if (period !== 'all') {
            query.createdAt = { $gte: startDate };
        }
    }

    // Filter by payment type
    if (paymentType && paymentType !== 'all') {
      if (paymentType === 'due') {
        query.dueAmount = { $gt: 0 };
      } else {
        query.paymentMode = paymentType;
      }
    }

    // Filter by customer status
    if (customerStatus && customerStatus === 'due') {
      query.dueAmount = { $gt: 0 };
    } else if (customerStatus === 'paid') {
      query.dueAmount = 0;
    }

    // Add search functionality
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      
      const searchConditions = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { paymentMode: searchRegex },
        { paymentStatus: searchRegex }
      ];

      // Enable partial search for Order ID
      // We use $expr to convert _id to string for partial matching
      searchConditions.push({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: escapedSearch,
            options: "i"
          }
        }
      });

      // Check if search is a number (for amount or dueAmount)
      const searchNumber = parseFloat(search);
      if (!isNaN(searchNumber) && /^\d+(\.\d+)?$/.test(search)) {
        searchConditions.push({ totalAmount: searchNumber });
        searchConditions.push({ dueAmount: searchNumber });
      }

      // Check if search is a date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(search)) {
        const searchDate = new Date(search);
        if (!isNaN(searchDate.getTime())) {
          const nextDay = new Date(searchDate);
          nextDay.setDate(searchDate.getDate() + 1);
          searchConditions.push({
            createdAt: {
              $gte: searchDate,
              $lt: nextDay
            }
          });
        }
      }

      query.$or = searchConditions;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone email pendingBalance')
      .sort({ createdAt: -1 });

    // Calculate stats
    const stats = {
      totalCash: 0,
      totalOnline: 0,
      totalDue: 0,
      totalRevenue: 0
    };

    const payments = orders.map(order => {
      // Update stats
      if (order.paymentMode === 'cash') {
        stats.totalCash += (order.paidAmount || 0);
      } else if (order.paymentMode === 'online' || order.paymentMode === 'card') {
        stats.totalOnline += (order.paidAmount || 0);
      } else if (order.paymentMode === 'mixed') {
        // For mixed, we should ideally have a breakdown, but let's assume it's mostly online for now
        // or split it if you have that data. For now, add to online.
        stats.totalOnline += (order.paidAmount || 0);
      }
      
      stats.totalDue += (order.dueAmount || 0);
      stats.totalRevenue += (order.paidAmount || 0);  // Only count paid amounts as revenue

      return {
        _id: order._id,
        orderId: order._id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customer: order.customer,
        orderType: order.orderType,
        tableLabel: order.tableLabel,
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        paymentStatus: order.paymentStatus,
        paidAmount: order.paidAmount,
        dueAmount: order.dueAmount,
        createdAt: order.createdAt
      };
    });

    res.json({
      payments,
      stats
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// Get payment analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const restaurantName = req.user.restaurantName;
    const { period = 'month' } = req.query;
    
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
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const orders = await Order.find({
      restaurantName,
      createdAt: { $gte: startDate }
    });

    // Daily breakdown
    const dailyData = {};
    const paymentTypeData = {
      cash: 0,
      online: 0,
      card: 0,
      due: 0,
      mixed: 0
    };

    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          revenue: 0,
          cash: 0,
          online: 0,
          card: 0,
          due: 0,
          orders: 0
        };
      }
      
      // Revenue is only paid amount (exclude due amounts)
      const orderRevenue = (order.paidAmount || 0);
      dailyData[date].revenue += orderRevenue;
      
      // Track collected amounts by type
      if (order.paymentMode === 'cash') {
        dailyData[date].cash += (order.paidAmount || 0);
      } else if (order.paymentMode === 'online' || order.paymentMode === 'card') {
        dailyData[date].online += (order.paidAmount || 0);
      } else if (order.paymentMode === 'due') {
        if (order.paidAmount > 0) {
          dailyData[date].cash += (order.paidAmount || 0);
        }
        dailyData[date].due += (order.dueAmount || 0);
      } else if (order.paymentMode === 'mixed') {
        dailyData[date].online += (order.paidAmount || 0);
        dailyData[date].due += (order.dueAmount || 0);
      }
      
      dailyData[date].orders += 1;
      
      // Update aggregate payment type data
      if (order.paymentMode === 'due') {
        if (order.paidAmount > 0) {
          paymentTypeData.cash += (order.paidAmount || 0);
        }
        paymentTypeData.due += (order.dueAmount || 0);
      } else if (order.paymentMode === 'mixed') {
        paymentTypeData.online += (order.paidAmount || 0);
        paymentTypeData.due += (order.dueAmount || 0);
      } else {
        paymentTypeData[order.paymentMode] += (order.paidAmount || 0);
      }
    });

    res.json({
      dailyData,
      paymentTypeData,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.paidAmount || 0), 0),  // Only paid amounts
      totalDue: orders.reduce((sum, order) => sum + (order.dueAmount || 0), 0)
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({ message: 'Error fetching payment analytics' });
  }
});

module.exports = router;
