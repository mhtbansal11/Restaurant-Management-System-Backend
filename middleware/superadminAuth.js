const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Hard-coded superadmin credentials (checked before DB lookup)
const SUPERADMIN_EMAIL = 'admin@masalamatrix.com';
const SUPERADMIN_PASSWORD = 'MasalaMatrix@12';

const superadminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Accept both the hard-coded superadmin and DB users with superadmin role
    if (decoded.isSuperAdmin) {
      req.superAdmin = { email: SUPERADMIN_EMAIL, role: 'superadmin' };
      return next();
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access required' });
    }
    req.superAdmin = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { superadminAuth, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD };
