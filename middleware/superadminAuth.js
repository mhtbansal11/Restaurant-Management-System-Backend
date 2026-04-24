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

    // Token issued by superadmin login — isSuperAdmin flag is always present
    if (!decoded.isSuperAdmin) {
      return res.status(403).json({ message: 'Superadmin access required' });
    }

    // If the token carries a userId it belongs to a DB superadmin — verify role still holds
    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access required' });
      }
      req.superAdmin = user;
    } else {
      // Hardcoded admin token (no userId)
      req.superAdmin = { email: SUPERADMIN_EMAIL, role: 'superadmin' };
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { superadminAuth, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD };
