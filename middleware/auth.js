const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database unavailable. Please start MongoDB and try again.' });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (user.loginAuthorized === false) {
      return res.status(403).json({ message: 'Your account access has been revoked. Contact your manager.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;

