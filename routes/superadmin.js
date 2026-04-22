const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const { superadminAuth, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = require('../middleware/superadminAuth');

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      const token = jwt.sign(
        { isSuperAdmin: true, email: SUPERADMIN_EMAIL },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );
      return res.json({
        token,
        admin: { email: SUPERADMIN_EMAIL, name: 'Super Admin', role: 'superadmin' }
      });
    }

    // Fallback: check DB for superadmin role users
    const user = await User.findOne({ email, role: 'superadmin' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, isSuperAdmin: true }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, admin: { email: user.email, name: user.name, role: 'superadmin' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All routes below require superadmin token ─────────────────────────────────
router.use(superadminAuth);

// ── Get all restaurants with subscription info ────────────────────────────────
router.get('/restaurants', async (req, res) => {
  try {
    const outlets = await Outlet.find().sort({ createdAt: -1 }).lean();

    // Auto-expire in memory before returning
    const now = new Date();
    const enriched = outlets.map(o => {
      let status = o.subscriptionStatus;
      if (o.subscriptionEndDate < now && status === 'active') status = 'expired';
      const daysLeft = Math.ceil((new Date(o.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24));
      return { ...o, subscriptionStatus: status, daysLeft };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get single restaurant ─────────────────────────────────────────────────────
router.get('/restaurants/:id', async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id).lean();
    if (!outlet) return res.status(404).json({ message: 'Restaurant not found' });
    const users = await User.find({ outletId: outlet._id }).select('name email role').lean();
    res.json({ ...outlet, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Toggle enable / disable ───────────────────────────────────────────────────
router.put('/restaurants/:id/toggle', async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Restaurant not found' });

    const wasSuspended = outlet.subscriptionStatus === 'suspended';
    outlet.subscriptionStatus = wasSuspended ? 'active' : 'suspended';
    outlet.isActive = wasSuspended;
    await outlet.save();

    res.json({ message: `Restaurant ${wasSuspended ? 'enabled' : 'suspended'}`, outlet });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Update subscription (extend / shorten / mark paid) ───────────────────────
router.put('/restaurants/:id/subscription', async (req, res) => {
  try {
    const { subscriptionEndDate, planAmount, paymentStatus, notes, subscriptionStatus } = req.body;
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Restaurant not found' });

    if (subscriptionEndDate) outlet.subscriptionEndDate = new Date(subscriptionEndDate);
    if (planAmount !== undefined) outlet.planAmount = planAmount;
    if (paymentStatus) {
      outlet.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') outlet.lastPaymentDate = new Date();
    }
    if (notes !== undefined) outlet.notes = notes;
    if (subscriptionStatus) outlet.subscriptionStatus = subscriptionStatus;

    // Auto-activate if payment received and was suspended/expired
    if (paymentStatus === 'paid' && ['suspended', 'expired', 'trial'].includes(outlet.subscriptionStatus)) {
      outlet.subscriptionStatus = 'active';
      outlet.isActive = true;
    }

    await outlet.save();
    res.json({ message: 'Subscription updated', outlet });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const outlets = await Outlet.find().lean();

    const total = outlets.length;
    const active = outlets.filter(o => o.subscriptionStatus === 'active').length;
    const trial = outlets.filter(o => o.subscriptionStatus === 'trial').length;
    const suspended = outlets.filter(o => o.subscriptionStatus === 'suspended').length;
    const expired = outlets.filter(o =>
      o.subscriptionStatus === 'expired' || (o.subscriptionEndDate < now && o.subscriptionStatus === 'active')
    ).length;
    const paid = outlets.filter(o => o.paymentStatus === 'paid').length;
    const overdue = outlets.filter(o => o.paymentStatus === 'overdue').length;

    const mrr = outlets
      .filter(o => o.subscriptionStatus === 'active' && o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.planAmount || 5000), 0);

    const totalRevenue = outlets
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.planAmount || 5000), 0);

    // Monthly signups (last 6 months)
    const monthlyCounts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = outlets.filter(o => {
        const c = new Date(o.createdAt);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length;
      monthlyCounts.push({ label, count });
    }

    res.json({
      total, active, trial, suspended, expired, paid, overdue,
      mrr, totalRevenue, monthlyCounts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Notifications (alerts) ────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const outlets = await Outlet.find({ subscriptionStatus: { $ne: 'suspended' } }).lean();

    const alerts = [];

    for (const o of outlets) {
      const end = new Date(o.subscriptionEndDate);
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

      if (end < now) {
        alerts.push({
          type: 'expired',
          severity: 'danger',
          outletId: o._id,
          outletName: o.name,
          message: `Subscription expired ${Math.abs(daysLeft)} day(s) ago`,
          date: o.subscriptionEndDate
        });
      } else if (end <= in3Days) {
        alerts.push({
          type: 'critical',
          severity: 'danger',
          outletId: o._id,
          outletName: o.name,
          message: `Subscription expires in ${daysLeft} day(s) — critical`,
          date: o.subscriptionEndDate
        });
      } else if (end <= in7Days) {
        alerts.push({
          type: 'expiring_soon',
          severity: 'warning',
          outletId: o._id,
          outletName: o.name,
          message: `Subscription expires in ${daysLeft} day(s)`,
          date: o.subscriptionEndDate
        });
      }

      if (o.paymentStatus === 'overdue') {
        alerts.push({
          type: 'overdue',
          severity: 'danger',
          outletId: o._id,
          outletName: o.name,
          message: `Payment overdue`,
          date: o.lastPaymentDate
        });
      } else if (o.paymentStatus === 'pending' && daysLeft < 14) {
        alerts.push({
          type: 'payment_due',
          severity: 'warning',
          outletId: o._id,
          outletName: o.name,
          message: `Payment pending — subscription renews in ${daysLeft} day(s)`,
          date: o.subscriptionEndDate
        });
      }
    }

    // Sort: danger first, then warning
    alerts.sort((a, b) => (a.severity === 'danger' ? -1 : 1));

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
