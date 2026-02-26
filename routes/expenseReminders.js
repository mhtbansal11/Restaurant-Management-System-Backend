const express = require('express');
const router = express.Router();
const ExpenseReminder = require('../models/ExpenseReminder');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Get all reminders with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, priority, upcoming } = req.query;
    const restaurantName = req.user.restaurantName;
    
    let query = { restaurantName };
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    if (upcoming === 'true') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      query.nextReminder = { $lte: sevenDaysFromNow };
    }
    
    const reminders = await ExpenseReminder.find(query)
      .sort({ nextReminder: 1, priority: -1 })
      .populate('expenseId', 'description amount date');
    
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific reminder
router.get('/:id', auth, async (req, res) => {
  try {
    const reminder = await ExpenseReminder.findOne({
      _id: req.params.id,
      restaurantName: req.user.restaurantName
    }).populate('expenseId', 'description amount date');
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new reminder
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      amount,
      dueDate,
      frequency,
      reminderType,
      reminderDays,
      priority,
      vendor,
      paymentMethod,
      notes,
      expenseId
    } = req.body;
    
    const nextReminder = new ExpenseReminder({
      userId: req.user.id,
      restaurantName: req.user.restaurantName,
      expenseId,
      title,
      description,
      category,
      amount,
      dueDate: new Date(dueDate),
      frequency,
      reminderType,
      reminderDays: reminderDays || 1,
      priority: priority || 'medium',
      vendor,
      paymentMethod,
      notes,
      nextReminder: new Date() // Will be recalculated
    });
    
    // Calculate proper next reminder date
    nextReminder.nextReminder = nextReminder.calculateNextReminder();
    
    await nextReminder.save();
    
    res.status(201).json(nextReminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update reminder
router.put('/:id', auth, async (req, res) => {
  try {
    const reminder = await ExpenseReminder.findOneAndUpdate(
      {
        _id: req.params.id,
        restaurantName: req.user.restaurantName
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    // Recalculate next reminder if relevant fields changed
    if (req.body.dueDate || req.body.reminderType || req.body.reminderDays || req.body.frequency) {
      reminder.nextReminder = reminder.calculateNextReminder();
      await reminder.save();
    }
    
    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete reminder
router.delete('/:id', auth, async (req, res) => {
  try {
    const reminder = await ExpenseReminder.findOneAndDelete({
      _id: req.params.id,
      restaurantName: req.user.restaurantName
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark reminder as completed
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const reminder = await ExpenseReminder.findOneAndUpdate(
      {
        _id: req.params.id,
        restaurantName: req.user.restaurantName
      },
      { status: 'completed', isActive: false },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    console.error('Error completing reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Snooze reminder
router.patch('/:id/snooze', auth, async (req, res) => {
  try {
    const { days = 1 } = req.body;
    const reminder = await ExpenseReminder.findOne({
      _id: req.params.id,
      restaurantName: req.user.restaurantName
    });
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    reminder.nextReminder = newDate;
    reminder.status = 'snoozed';
    
    await reminder.save();
    
    res.json(reminder);
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming reminders for notifications
router.get('/notifications/upcoming', auth, async (req, res) => {
  try {
    const reminders = await ExpenseReminder.getUpcomingReminders(req.user.restaurantName, 3); // Next 3 days
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overdue reminders
router.get('/notifications/overdue', auth, async (req, res) => {
  try {
    const reminders = await ExpenseReminder.getOverdueReminders(req.user.restaurantName);
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching overdue reminders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create reminder from expense template
router.post('/from-template', auth, async (req, res) => {
  try {
    const { expenseId, reminderType = 'before_due', reminderDays = 1 } = req.body;
    
    const expense = await Expense.findOne({
      _id: expenseId,
      restaurantName: req.user.restaurantName
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Create reminder based on expense
    const reminder = new ExpenseReminder({
      userId: req.user.id,
      restaurantName: req.user.restaurantName,
      expenseId: expense._id,
      title: `Payment: ${expense.description}`,
      description: `Reminder for ${expense.description} payment`,
      category: expense.category,
      amount: expense.amount,
      dueDate: expense.date,
      frequency: expense.isRecurring ? expense.recurringFrequency : 'once',
      reminderType,
      reminderDays,
      priority: expense.amount > 10000 ? 'high' : 'medium',
      vendor: expense.vendor,
      paymentMethod: expense.paymentMethod,
      notes: `Auto-created from expense: ${expense.description}`,
      autoCreateFromExpense: true
    });
    
    reminder.nextReminder = reminder.calculateNextReminder();
    await reminder.save();
    
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder from template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;