const mongoose = require('mongoose');

const expenseReminderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  restaurantName: { 
    type: String, 
    required: true 
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['salary', 'inventory', 'rent', 'utilities', 'maintenance', 'marketing', 'other', 'custom'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'once'
  },
  reminderType: {
    type: String,
    enum: ['before_due', 'on_due', 'after_due', 'recurring'],
    default: 'before_due'
  },
  reminderDays: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'snoozed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastNotified: {
    type: Date,
    default: null
  },
  nextReminder: {
    type: Date,
    required: true
  },
  vendor: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'upi', 'other']
  },
  notes: {
    type: String,
    trim: true
  },
  autoCreateFromExpense: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Index for efficient querying
expenseReminderSchema.index({ userId: 1, nextReminder: 1, status: 1 });
expenseReminderSchema.index({ restaurantName: 1, dueDate: 1 });
expenseReminderSchema.index({ category: 1, status: 1 });

// Method to calculate next reminder date
expenseReminderSchema.methods.calculateNextReminder = function() {
  const now = new Date();
  const dueDate = new Date(this.dueDate);
  
  switch (this.reminderType) {
    case 'before_due':
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - this.reminderDays);
      return reminderDate;
    
    case 'on_due':
      return dueDate;
    
    case 'after_due':
      const afterDate = new Date(dueDate);
      afterDate.setDate(dueDate.getDate() + this.reminderDays);
      return afterDate;
    
    case 'recurring':
      const nextDate = new Date(this.nextReminder || now);
      switch (this.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
      return nextDate;
    
    default:
      return dueDate;
  }
};

// Static method to get upcoming reminders
expenseReminderSchema.statics.getUpcomingReminders = function(restaurantName, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    restaurantName,
    nextReminder: { $gte: startDate, $lte: endDate },
    status: 'pending',
    isActive: true
  }).sort({ nextReminder: 1 });
};

// Static method to get overdue reminders
expenseReminderSchema.statics.getOverdueReminders = function(restaurantName) {
  const now = new Date();
  
  return this.find({
    restaurantName,
    nextReminder: { $lt: now },
    status: 'pending',
    isActive: true
  }).sort({ nextReminder: 1 });
};

module.exports = mongoose.model('ExpenseReminder', expenseReminderSchema);