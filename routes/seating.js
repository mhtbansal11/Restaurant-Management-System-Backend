const express = require('express');
const SeatingLayout = require('../models/SeatingLayout');
const Table = require('../models/Table');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const router = express.Router();

// Get seating layout
router.get('/layout', async (req, res) => {
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
router.post('/layout', async (req, res) => {
  try {
    const { floors } = req.body; // Expecting { floors: [...] }

    let layout = await SeatingLayout.findOne({ restaurantName: req.user.restaurantName });
    const existingFloors = layout?.floors || [];
    const existingTables = existingFloors.flatMap((floor) => floor.tables || []);
    const nextFloors = floors || [];
    const nextTables = nextFloors.flatMap((floor) => floor.tables || []);
    const nextTableIdSet = new Set(nextTables.map((table) => table.id));

    const removedTables = existingTables.filter((table) => !nextTableIdSet.has(table.id));

    for (const removedTable of removedTables) {
      if (!removedTable?.isTemporary) {
        return res.status(400).json({
          message: `Table ${removedTable.label || removedTable.id} cannot be removed because it is not temporary.`
        });
      }

      const tableStatusDoc = await Table.findOne({
        restaurantName: req.user.restaurantName,
        tableId: removedTable.id
      });

      if (tableStatusDoc && tableStatusDoc.status !== 'available') {
        return res.status(400).json({
          message: `Temporary table ${removedTable.label || removedTable.id} can be removed only when available.`
        });
      }
    }

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
                capacity: table.capacity,
                isTemporary: Boolean(table.isTemporary)
            },
            $setOnInsert: { status: 'available' }
          },
          { upsert: true, new: true }
        );
      }
    }

    const activeTableIds = allTables.map((table) => table.id);
    if (activeTableIds.length > 0) {
      await Table.deleteMany({
        restaurantName: req.user.restaurantName,
        tableId: { $nin: activeTableIds }
      });
    } else {
      await Table.deleteMany({ restaurantName: req.user.restaurantName });
    }

    res.json(layout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tables with their status
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find({ restaurantName: req.user.restaurantName }).populate('currentOrder');
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update table status
router.put('/tables/:tableId', async (req, res) => {
  try {
    const { status, customerCount, currentOrder, forceClear, reservation } = req.body;

    const table = await Table.findOne({ 
      restaurantName: req.user.restaurantName, 
      tableId: req.params.tableId 
    }).populate('currentOrder');

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Validation: Prevent clearing table if there's an active order that's not completed or paid
    if (status === 'available' && table.currentOrder && !forceClear) {
      const order = table.currentOrder;
      const isCompleted = order.status === 'completed' || order.status === 'cancelled';
      const isPaid = order.paymentStatus === 'paid';

      if (!isCompleted || !isPaid) {
        let reason = '';
        if (!isCompleted && !isPaid) reason = 'order is not completed and payment is still pending';
        else if (!isCompleted) reason = 'order is not completed';
        else if (!isPaid) reason = 'payment is still pending';

        return res.status(400).json({ 
          message: `Cannot clear table because the ${reason}.`,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus
        });
      }
    }

    if (status === 'reserved') {
      if (table.currentOrder) {
        return res.status(400).json({ message: 'Cannot reserve a table with an active order' });
      }

      if (reservation?.reservedFor) {
        const reservedForDate = new Date(reservation.reservedFor);
        if (Number.isNaN(reservedForDate.getTime())) {
          return res.status(400).json({ message: 'Reservation date/time is invalid' });
        }

        if (reservedForDate.getTime() < Date.now()) {
          return res.status(400).json({ message: 'Reservation date/time must be in the future' });
        }
      }
    }

    // Prepare update object
    const updateData = { status };
    
    if (customerCount !== undefined) updateData.customerCount = customerCount;
    
    // Explicitly handle currentOrder
     // If setting to available, we should probably clear currentOrder unless specified otherwise
     if (status === 'available') {
       // If we're force clearing, we might want to detach the order from this table
       if (forceClear && table.currentOrder) {
         await Order.findByIdAndUpdate(table.currentOrder._id, {
           $set: { tableId: null, tableLabel: null }
         });
       }
       updateData.currentOrder = null;
       updateData.customerCount = 0;
       updateData.reservation = {
         reservedFor: null,
         guestName: '',
         guestPhone: '',
         notes: ''
       };
     } else if (status === 'reserved') {
       updateData.currentOrder = null;
       updateData.customerCount = 0;
       updateData.reservation = {
         reservedFor: reservation?.reservedFor ? new Date(reservation.reservedFor) : null,
         guestName: reservation?.guestName || '',
         guestPhone: reservation?.guestPhone || '',
         notes: reservation?.notes || ''
       };
     } else if (currentOrder !== undefined) {
       updateData.currentOrder = currentOrder;
       if (status === 'occupied') {
         updateData.reservation = {
           reservedFor: null,
           guestName: '',
           guestPhone: '',
           notes: ''
         };
       }
     }

    const updatedTable = await Table.findOneAndUpdate(
      { restaurantName: req.user.restaurantName, tableId: req.params.tableId },
      updateData,
      { new: true }
    ).populate('currentOrder');

    res.json(updatedTable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

