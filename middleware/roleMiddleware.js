
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.user.role) {
      return res.status(403).json({ message: 'Your account has no role assigned. Contact your administrator.' });
    }

    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        message: `Access denied. Your role (${req.user.role}) does not have permission for this action.`,
        requiredRoles: roles,
        yourRole: req.user.role
      });
    }
  };
};

module.exports = checkRole;
