const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');
const { extractMenuItemsFromImage } = require('../services/aiService');
const { uploadToCloudinary } = require('../utils/cloudinary');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/menu';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Get all menu items
router.get('/', auth, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ restaurantName: req.user.restaurantName }).sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get menu item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create menu item from image (AI-powered)
router.post('/ai-extract', [auth, checkRole(['superadmin', 'owner', 'manager'])], upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload image to Cloudinary
    let imageUrl = await uploadToCloudinary(req.file);
    let aiImageUrl = imageUrl;

    // Fallback to local file if Cloudinary is not configured
    if (!imageUrl) {
      const protocol = req.protocol;
      const host = req.get('host');
      const relativePath = req.file.path.replace(/\\/g, '/');
      imageUrl = `${protocol}://${host}/${relativePath}`;

      // Convert to base64 for AI analysis since OpenAI can't access localhost
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      aiImageUrl = `data:${mimeType};base64,${base64Image}`;
    }
    
    // Extract menu items using AI
    const extractedItems = await extractMenuItemsFromImage(aiImageUrl);

    // Save extracted items to database
    const savedItems = [];
    for (const item of extractedItems) {
      const menuItem = new MenuItem({
        userId: req.user._id,
        restaurantName: req.user.restaurantName,
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        category: item.category || 'Other',
        image: imageUrl,
        aiGenerated: true
      });
      await menuItem.save();
      savedItems.push(menuItem);
    }

    // Clean up local file ONLY if uploaded to Cloudinary
    if (imageUrl.includes('cloudinary')) {
       fs.unlinkSync(req.file.path);
    }

    res.json({ 
      message: `Successfully extracted ${savedItems.length} menu items`,
      items: savedItems 
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
});

// Create menu item manually
router.post('/', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const { name, description, price, category, image, isAvailable } = req.body;

    const menuItem = new MenuItem({
      userId: req.user._id,
      restaurantName: req.user.restaurantName,
      name,
      description,
      price,
      category,
      image: image || '',
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update menu item (Allow kitchen_staff to update for availability toggling)
router.put('/:id', [auth, checkRole(['superadmin', 'owner', 'manager', 'kitchen_staff'])], async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    Object.assign(menuItem, req.body);
    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete menu item
router.delete('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const menuItem = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantName: req.user.restaurantName });
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

