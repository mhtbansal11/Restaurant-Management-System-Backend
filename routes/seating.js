const express = require('express');
const SeatingLayout = require('../models/SeatingLayout');
const Table = require('../models/Table');
const auth = require('../middleware/auth');
const router = express.Router();

// Get seating layout
router.get('/layout', auth, async (req, res) => {
  try {
    let layout = await SeatingLayout.findOne({ restaurantName: req.user.restaurantName });
    if (!layout) {
      // Create default layout if none exists
      layout = new SeatingLayout({
        userId: req.user._id,
        restaurantName: req.user.restaurantName,
        floors: [{
          id: 'floor-1',
          name: 'Main Floor',
          canvasWidth: 1200,
          canvasHeight: 800,
          tables: []
        }]
      });
      await layout.save();
    }
    // Migration check: if old schema exists (tables at root), migrate to floors
    if (layout.toObject().tables && (!layout.floors || layout.floors.length === 0)) {
        layout.floors = [{
            id: 'floor-1',
            name: 'Main Floor',
            canvasWidth: layout.canvasWidth || 1200,
            canvasHeight: layout.canvasHeight || 800,
            tables: layout.toObject().tables || []
        }];
        await layout.save();
    }
    res.json(layout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save/Update seating layout
router.post('/layout', auth, async (req, res) => {
  try {
    const { floors } = req.body; // Expecting { floors: [...] }

    let layout = await SeatingLayout.findOne({ restaurantName: req.user.restaurantName });

    if (layout) {
      layout.floors = floors;
      await layout.save();
    } else {
      layout = new SeatingLayout({
        userId: req.user._id,
        restaurantName: req.user.restaurantName,
        floors: floors || [{
            id: 'floor-1',
            name: 'Main Floor',
            canvasWidth: 1200,
            canvasHeight: 800,
            tables: []
        }]
      });
      await layout.save();
    }

    // Sync tables in Table collection
    const allTables = [];
    if (floors && floors.length > 0) {
      floors.forEach(floor => {
          if (floor.tables) {
              allTables.push(...floor.tables);
          }
      });
    }

    if (allTables.length > 0) {
      for (const table of allTables) {
        await Table.findOneAndUpdate(
          { restaurantName: req.user.restaurantName, tableId: table.id },
          {
            $set: { 
                userId: req.user._id,
                restaurantName: req.user.restaurantName,
                tableId: table.id,
                capacity: table.capacity 
            },
            $setOnInsert: { status: 'available' }
          },
          { upsert: true, new: true }
        );
      }
    }

    res.json(layout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tables with their status
router.get('/tables', auth, async (req, res) => {
  try {
    const tables = await Table.find({ restaurantName: req.user.restaurantName }).populate('currentOrder');
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update table status
router.put('/tables/:tableId', auth, async (req, res) => {
  try {
    const { status, customerCount, currentOrder } = req.body;

    const table = await Table.findOneAndUpdate(
      { restaurantName: req.user.restaurantName, tableId: req.params.tableId },
      { status, customerCount, currentOrder },
      { new: true }
    );

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

