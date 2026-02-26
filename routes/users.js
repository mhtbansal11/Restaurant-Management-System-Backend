const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/aadhar';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'aadhar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all staff members for the current restaurant/outlet
router.get('/', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    // If owner/manager, show all staff in their restaurant
    // If superadmin, they might see all (but for now let's keep it scoped)
    const query = { restaurantName: req.user.restaurantName };
    
    // Don't include the current user in the list
    query._id = { $ne: req.user._id };

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve Aadhar (admin only)
router.patch('/approve-aadhar/:userId', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { 
        aadharVerified: true,
        aadharStatus: 'approved',
        aadharRejectionReason: ''
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create notification for the user
    await Notification.create({
      userId: user._id,
      title: 'Aadhar Card Approved',
      message: 'Your Aadhar card has been approved by the administration.',
      type: 'success',
      relatedTo: 'aadhar',
      restaurantName: user.restaurantName
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject Aadhar (admin only)
router.patch('/reject-aadhar/:userId', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { 
        aadharVerified: false,
        aadharStatus: 'rejected',
        aadharRejectionReason: rejectionReason || 'Aadhar card rejected. Please upload a clear copy.'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create notification for the user
    await Notification.create({
      userId: user._id,
      title: 'Aadhar Card Rejected',
      message: `Your Aadhar card was rejected. Reason: ${rejectionReason || 'Aadhar card rejected. Please upload a clear copy.'}`,
      type: 'error',
      relatedTo: 'aadhar',
      restaurantName: user.restaurantName
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new staff member
router.post('/', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser = new User({
      name,
      email,
      password,
      role,
      restaurantName: req.user.restaurantName,
      outletId: req.user.outletId
    });

    await newUser.save();
    
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a staff member
router.put('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, restaurantName: req.user.restaurantName },
      { name, email, role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a staff member
router.delete('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      restaurantName: req.user.restaurantName 
    });

    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        restaurantName: req.user.restaurantName
      },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Get user by ID (admin only)
router.get('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure the requested user belongs to the same restaurant
    const user = await User.findOne({ 
      _id: id, 
      restaurantName: req.user.restaurantName 
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user profile (own profile or admin updating staff)
router.put('/:id?', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id || req.user._id;
    const { name, phone, address, dateOfBirth, gender, emergencyContact, aadharNumber } = req.body;
    
    // Check permissions: user can update their own profile or admin can update staff
    const isOwnProfile = targetUserId === req.user._id.toString();
    const isAdmin = ['superadmin', 'owner', 'manager'].includes(req.user.role);
    
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // If admin is updating staff, ensure staff belongs to same restaurant
    if (!isOwnProfile) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || targetUser.restaurantName !== req.user.restaurantName) {
        return res.status(404).json({ message: 'User not found' });
      }
    }
    
    const updateData = {
      name,
      phone,
      address,
      dateOfBirth,
      gender,
      emergencyContact,
      aadharNumber: aadharNumber ? aadharNumber.replace(/\D/g, '') : aadharNumber
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      targetUserId,
      updateData,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload Aadhar card (own profile or admin uploading for staff)
router.post('/upload-aadhar', [auth, upload.single('aadhar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { side, userId } = req.body;
    if (!['front', 'back'].includes(side)) {
      return res.status(400).json({ message: 'Invalid side specified' });
    }

    // Determine target user: if userId is provided (admin uploading for staff), use that user
    // Otherwise, use the authenticated user's ID (own profile upload)
    let targetUserId = req.user._id;
    let isAdminUpload = false;
    
    if (userId) {
      // Check if the authenticated user has permission to upload for this user
      const isAdmin = ['superadmin', 'owner', 'manager'].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Verify the target user belongs to the same restaurant
      const targetUser = await User.findById(userId);
      if (!targetUser || targetUser.restaurantName !== req.user.restaurantName) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      targetUserId = userId;
      isAdminUpload = true;
    }

    // Construct file URL (adjust based on your server setup)
    const fileUrl = `/uploads/aadhar/${req.file.filename}`;

    const updateField = side === 'front' ? 'aadharFront' : 'aadharBack';
    
    const user = await User.findByIdAndUpdate(
      targetUserId,
      { 
        [updateField]: fileUrl,
        aadharStatus: 'pending',
        aadharRejectionReason: ''
      },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit complete Aadhar information (number + both sides)
router.post('/submit-aadhar', [auth, upload.fields([
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 }
])], async (req, res) => {
  try {
    const { aadharNumber, userId } = req.body;
    const files = req.files;

    // Determine target user
    let targetUserId = req.user._id;
    
    if (userId) {
      // Check admin permissions
      const isAdmin = ['superadmin', 'owner', 'manager'].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Verify target user belongs to same restaurant
      const targetUser = await User.findById(userId);
      if (!targetUser || targetUser.restaurantName !== req.user.restaurantName) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      targetUserId = userId;
    }

    // Prepare update data
    const updateData = {
      aadharStatus: 'pending',
      aadharRejectionReason: ''
    };

    // Add Aadhar number if provided
    if (aadharNumber) {
      updateData.aadharNumber = aadharNumber.replace(/\\D/g, '');
    }

    // Add front side file if uploaded
    if (files && files.aadharFront && files.aadharFront[0]) {
      updateData.aadharFront = `/uploads/aadhar/${files.aadharFront[0].filename}`;
    }

    // Add back side file if uploaded
    if (files && files.aadharBack && files.aadharBack[0]) {
      updateData.aadharBack = `/uploads/aadhar/${files.aadharBack[0].filename}`;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      targetUserId,
      updateData,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle login authorization (admin only)
router.patch('/:userId/login-auth', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    const { loginAuthorized } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { loginAuthorized },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Aadhar (admin only)
router.patch('/verify-aadhar/:userId', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { aadharVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve Aadhar (admin only)
router.patch('/approve-aadhar/:userId', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { 
        aadharVerified: true,
        aadharStatus: 'approved',
        aadharRejectionReason: ''
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject Aadhar (admin only)
router.patch('/reject-aadhar/:userId', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;
    
    const user = await User.findOneAndUpdate(
      { _id: userId, restaurantName: req.user.restaurantName },
      { 
        aadharVerified: false,
        aadharStatus: 'rejected',
        aadharRejectionReason: rejectionReason || 'Aadhar card rejected. Please upload a clear copy.'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      restaurantName: req.user.restaurantName
    }).sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
