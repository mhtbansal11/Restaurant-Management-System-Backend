const Outlet = require('../models/Outlet');

// Auto-expire outlets whose subscription end date has passed
async function checkSubscription(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.outletId) return next();
    if (user.role === 'superadmin') return next();

    const outlet = await Outlet.findById(user.outletId);
    if (!outlet) return next();

    // Auto-mark expired for both active and trial outlets whose end date has passed
    if (outlet.subscriptionEndDate < new Date() && ['active', 'trial'].includes(outlet.subscriptionStatus)) {
      outlet.subscriptionStatus = 'expired';
      outlet.paymentStatus = 'overdue';
      await outlet.save();
    }

    if (outlet.subscriptionStatus === 'suspended' || outlet.subscriptionStatus === 'expired') {
      return res.status(403).json({
        message: 'Your subscription has expired or been suspended. Please contact support.',
        subscriptionStatus: outlet.subscriptionStatus,
        subscriptionEndDate: outlet.subscriptionEndDate
      });
    }

    next();
  } catch (err) {
    next(); // Don't block on middleware errors
  }
}

module.exports = checkSubscription;
