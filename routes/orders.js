const express = require('express');
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const InventoryItem = require('../models/InventoryItem');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');
const Customer = require('../models/Customer');
const router = express.Router();

// Get order stats for dashboard
router.get('/stats', checkRole(['superadmin', 'owner', 'manager']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!req.user || !req.user.restaurantName) {
      return res.status(400).json({ message: 'Restaurant context missing from user profile' });
    }

    const orders = await Order.find({
      restaurantName: req.user.restaurantName,
      createdAt: { $gte: today }
    });

    const stats = {
      cashCollected: 0,
      onlineReceived: 0,
      dueAmount: 0,
      totalOrders: orders.length
    };

    orders.forEach(order => {
      if (order.paymentMode === 'cash') stats.cashCollected += (order.paidAmount || 0);
      else if (order.paymentMode === 'online' || order.paymentMode === 'card') stats.onlineReceived += (order.paidAmount || 0);
      else if (order.paymentMode === 'mixed') {
        stats.cashCollected += (order.paidAmount || 0); 
      }
      
      stats.dueAmount += (order.dueAmount || 0);
    });

    res.json(stats);
  } catch (error) {
    console.error('FETCH_STATS_ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, tableId } = req.query;
    const query = { restaurantName: req.user.restaurantName };
    if (status) query.status = status;
    if (tableId) query.tableId = tableId;

    const orders = await Order.find(query)
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName })
      .populate('items.menuItem');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new order
router.post('/', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'waiter']), async (req, res) => {
  try {
    const { tableIds, tableLabels, items, customerName, customerPhone, customerId, discountPercent, discountAmount, taxRate, taxAmount, serviceChargeRate, serviceChargeAmount, subtotal } = req.body;

    // Calculate total amount
    const totalAmount = req.body.totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check if any table is already occupied
    if (req.body.orderType === 'dine-in' && tableIds && tableIds.length > 0) {
      const occupiedTables = await Table.find({ 
        restaurantName: req.user.restaurantName, 
        tableId: { $in: tableIds },
        status: 'occupied'
      });
      
      if (occupiedTables.length > 0) {
        return res.status(400).json({ 
          message: `Table(s) ${occupiedTables.map(t => t.tableId).join(', ')} are already occupied.`,
          occupiedTableIds: occupiedTables.map(t => t.tableId)
        });
      }
    }

    const order = new Order({
      userId: req.user._id,
      restaurantName: req.user.restaurantName,
      tableIds: tableIds || [],
      tableLabels: tableLabels || [],
      items,
      totalAmount,
      subtotal: subtotal || 0,
      discountPercent: discountPercent || 0,
      discountAmount: discountAmount || 0,
      taxRate: taxRate || 0,
      taxAmount: taxAmount || 0,
      serviceChargeRate: serviceChargeRate || 0,
      serviceChargeAmount: serviceChargeAmount || 0,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customer: customerId || null,
      orderType: req.body.orderType || 'dine-in'
    });

    await order.save();

    let linkedCustomer = null;
    if (customerId) {
      linkedCustomer = await Customer.findOne({ _id: customerId, restaurantName: req.user.restaurantName });
    } else if (customerPhone) {
      linkedCustomer = await Customer.findOne({ phone: customerPhone, restaurantName: req.user.restaurantName });
    }

    if (linkedCustomer) {
      order.customer = linkedCustomer._id;
      await order.save();
      if (!linkedCustomer.orderHistory.includes(order._id)) {
        linkedCustomer.orderHistory.push(order._id);
        await linkedCustomer.save();
      }
    }

    // Deduct inventory based on recipes
    try {
      for (const item of items) {
        const menuItem = await MenuItem.findById(item.menuItem).populate('ingredients.inventoryItemId');
        if (menuItem) {
          let ingredientsToDeduct = [];
          
          if (menuItem.hasVariants && item.variant && item.variant.name) {
            const variant = menuItem.variants.find(v => v.name === item.variant.name);
            if (variant && variant.ingredients && variant.ingredients.length > 0) {
              ingredientsToDeduct = variant.ingredients;
            }
          } else if (menuItem.ingredients && menuItem.ingredients.length > 0) {
            ingredientsToDeduct = menuItem.ingredients;
          }

          for (const ingredient of ingredientsToDeduct) {
            if (ingredient.inventoryItemId) {
              const deduction = ingredient.quantity * item.quantity;
              await InventoryItem.findByIdAndUpdate(
                ingredient.inventoryItemId,
                { $inc: { quantity: -deduction } }
              );
            }
          }
        }
      }
    } catch (invError) {
      console.error('Error deducting inventory:', invError);
    }

    // Update all selected tables to occupied
    if (req.body.orderType === 'dine-in' && tableIds && tableIds.length > 0) {
      await Table.updateMany(
        { restaurantName: req.user.restaurantName, tableId: { $in: tableIds } },
        { 
          status: 'occupied',
          currentOrder: order._id,
          customerCount: req.body.customerCount || 0,
          reservation: {
            reservedFor: null,
            guestName: '',
            guestPhone: '',
            notes: ''
          }
        }
      );
    }

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    
    // Emit real-time notification
    const io = req.app.get('socketio');
    if (io) {
      io.to(req.user.restaurantName).emit('new_order', populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'kitchen_staff', 'waiter']), async (req, res) => {
  try {
    const { status, keepTableOccupied, freeTable } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Role-based status transition restrictions
    if (req.user.role === 'waiter' && !['served', 'cancelled'].includes(status)) {
        return res.status(403).json({ message: 'Waiters can only mark orders as served or cancelled' });
    }
    if (req.user.role === 'kitchen_staff' && !['preparing', 'ready', 'completed'].includes(status)) {
        return res.status(403).json({ message: 'Kitchen staff can only mark orders as preparing, ready, or completed' });
    }

    order.status = status;

    // Update all items status when order status changes to keep them in sync
    if (status === 'preparing') {
      order.items.forEach(item => {
        if (item.status === 'queued') item.status = 'preparing';
      });
    } else if (status === 'ready') {
      order.items.forEach(item => {
        if (['queued', 'preparing'].includes(item.status)) item.status = 'ready';
      });
    } else if (status === 'served') {
      order.items.forEach(item => {
        if (['queued', 'preparing', 'ready'].includes(item.status)) item.status = 'served';
      });
    }

    await order.save();

    // Emit real-time notification
    const io = req.app.get('socketio');
    if (io) {
      const populated = await Order.findById(order._id).populate('items.menuItem');
      io.to(req.user.restaurantName).emit('order_updated', populated);
    }

    if (status === 'completed' || status === 'cancelled') {
      let shouldFreeTable = true;
      if (typeof freeTable === 'boolean') {
        shouldFreeTable = freeTable;
      } else if (keepTableOccupied === true) {
        shouldFreeTable = false;
      }
      
      if (shouldFreeTable) {
        // Free all associated tables
        await Table.updateMany(
          { restaurantName: req.user.restaurantName, tableId: { $in: order.tableIds } },
          { 
            status: 'available',
            currentOrder: null,
            customerCount: 0,
            reservation: {
              reservedFor: null,
              guestName: '',
              guestPhone: '',
              notes: ''
            }
          }
        );
      }

      // WASTAGE LOGIC: Return inventory ONLY if item was 'queued' (not started)
      // If order is cancelled, we might return ingredients for items not yet prepared
      if (status === 'cancelled') {
        try {
          for (const item of order.items) {
            if (item.status === 'queued') {
              const menuItem = await MenuItem.findById(item.menuItem).populate('ingredients.inventoryItemId');
              if (menuItem) {
                let ingredientsToReturn = menuItem.ingredients || [];
                for (const ingredient of ingredientsToReturn) {
                  if (ingredient.inventoryItemId) {
                    const restitution = ingredient.quantity * item.quantity;
                    await InventoryItem.findByIdAndUpdate(
                      ingredient.inventoryItemId,
                      { $inc: { quantity: restitution } }
                    );
                  }
                }
              }
            } else {
              // Item was 'preparing', 'ready', or 'served' -> WASTAGE
              console.log(`Wastage: Item ${item.menuItem} was ${item.status} and cancelled.`);
            }
          }
        } catch (err) {
          console.error('Error in cancellation stock restitution:', err);
        }
      }
    }

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');

    // Emit real-time update
    const statusUpdateSocket = req.app.get('socketio');
    if (statusUpdateSocket) {
      statusUpdateSocket.to(req.user.restaurantName).emit('order_updated', populatedOrder);
    }

    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order items
router.put('/:id', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'waiter']), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.body.items) {
      // Inventory Delta Logic
      // 1. Calculate current inventory burden
      // 2. Calculate new inventory burden
      // 3. Apply the difference
      
      const calculateBurden = async (itemsList) => {
        const burden = {};
        for (const item of itemsList) {
          if (item.status === 'cancelled') continue;
          const menuItem = await MenuItem.findById(item.menuItem);
          if (menuItem) {
            let ingredients = menuItem.ingredients || [];
            if (menuItem.hasVariants && item.variant && item.variant.name) {
              const variant = menuItem.variants.find(v => v.name === item.variant.name);
              if (variant && variant.ingredients) ingredients = variant.ingredients;
            }
            for (const ing of ingredients) {
              if (ing.inventoryItemId) {
                const id = ing.inventoryItemId.toString();
                burden[id] = (burden[id] || 0) + (ing.quantity * item.quantity);
              }
            }
          }
        }
        return burden;
      };

      try {
        const oldBurden = await calculateBurden(order.items);
        const newBurden = await calculateBurden(req.body.items);
        
        // Items to deduct (new > old) or return (old > new)
        const allIds = new Set([...Object.keys(oldBurden), ...Object.keys(newBurden)]);
        for (const id of allIds) {
          const delta = (newBurden[id] || 0) - (oldBurden[id] || 0);
          if (delta !== 0) {
            await InventoryItem.findByIdAndUpdate(id, { $inc: { quantity: -delta } });
          }
        }
      } catch (err) {
        console.error('Inventory delta error:', err);
      }

      const getItemSignature = (item) => {
        const menuItemId = item?.menuItem?._id?.toString?.() || item?.menuItem?.toString?.() || '';
        const variantName = item?.variant?.name || '';
        const notes = item?.notes || '';
        const price = Number(item?.price || 0);
        return `${menuItemId}__${variantName}__${notes}__${price}`;
      };

      const existingItemsById = new Map(
        order.items.map(item => [item._id.toString(), item])
      );
      const existingItemsBySignature = new Map(
        order.items.map(item => [getItemSignature(item), item])
      );

      order.items = req.body.items.map((item) => {
        const existingItemById = item._id
          ? existingItemsById.get(item._id.toString())
          : null;
        const existingItem = existingItemById || existingItemsBySignature.get(getItemSignature(item));
        const nextQuantity = Number(item.quantity || 0);
        const previousPrintedQuantity = Number(existingItem?.kotPrintedQuantity || 0);

        return {
          ...item,
          _id: existingItem?._id || item._id,
          kotPrintedQuantity: existingItem
            ? Math.min(previousPrintedQuantity, nextQuantity)
            : 0
        };
      });
      
      if (req.body.subtotal !== undefined) order.subtotal = req.body.subtotal;
      if (req.body.discountPercent !== undefined) order.discountPercent = req.body.discountPercent;
      if (req.body.discountAmount !== undefined) order.discountAmount = req.body.discountAmount;
      if (req.body.taxRate !== undefined) order.taxRate = req.body.taxRate;
      if (req.body.taxAmount !== undefined) order.taxAmount = req.body.taxAmount;
      if (req.body.serviceChargeRate !== undefined) order.serviceChargeRate = req.body.serviceChargeRate;
      if (req.body.serviceChargeAmount !== undefined) order.serviceChargeAmount = req.body.serviceChargeAmount;
      
      if (req.body.totalAmount !== undefined) {
        order.totalAmount = req.body.totalAmount;
      } else {
        order.totalAmount = req.body.items
          .filter(item => item.status !== 'cancelled')
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
    }

    if (req.body.customerName !== undefined) order.customerName = req.body.customerName;
    if (req.body.customerPhone !== undefined) order.customerPhone = req.body.customerPhone;

    // Handle orderType and table changes for multiple tables
    const oldOrderType = order.orderType;
    const oldTableIds = order.tableIds || [];
    const newOrderType = req.body.orderType;
    const newTableIds = req.body.tableIds;

    if (newOrderType && newOrderType !== oldOrderType) {
      order.previousOrderType = oldOrderType;
      order.orderType = newOrderType;
    }

    if (newTableIds !== undefined) {
      order.tableIds = newTableIds;
      order.tableLabels = req.body.tableLabels || [];
    }

    // Sync table status if orderType or tables changed
    if (oldOrderType === 'dine-in' && (newOrderType !== 'dine-in' || (newTableIds !== undefined && JSON.stringify(newTableIds) !== JSON.stringify(oldTableIds)))) {
      // Free old tables
      await Table.updateMany(
        { restaurantName: req.user.restaurantName, tableId: { $in: oldTableIds } },
        {
          status: 'available',
          currentOrder: null,
          customerCount: 0,
          reservation: {
            reservedFor: null,
            guestName: '',
            guestPhone: '',
            notes: ''
          }
        }
      );
    }

    if (newOrderType === 'dine-in' && (oldOrderType !== 'dine-in' || (newTableIds !== undefined && JSON.stringify(newTableIds) !== JSON.stringify(oldTableIds)))) {
      // Occupy new tables
      // First check for conflicts
      const conflicts = await Table.find({
        restaurantName: req.user.restaurantName,
        tableId: { $in: newTableIds },
        status: 'occupied',
        currentOrder: { $ne: order._id }
      });
      if (conflicts.length > 0) {
        return res.status(400).json({ message: `Tables ${conflicts.map(c => c.tableId).join(', ')} are occupied.` });
      }

      await Table.updateMany(
        { restaurantName: req.user.restaurantName, tableId: { $in: newTableIds } },
        {
          status: 'occupied',
          currentOrder: order._id,
          customerCount: req.body.customerCount || 0,
          reservation: {
            reservedFor: null,
            guestName: '',
            guestPhone: '',
            notes: ''
          }
        }
      );
    }

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/kot/printed', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'waiter']), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.items.forEach((item) => {
      if (item.status === 'cancelled') return;
      item.kotPrintedQuantity = item.quantity;
    });

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete order
router.delete('/:id', checkRole(['superadmin', 'owner', 'manager']), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Free associated tables
    await Table.updateMany(
      { restaurantName: req.user.restaurantName, tableId: { $in: order.tableIds } },
      { 
        status: 'available',
        currentOrder: null,
        customerCount: 0,
        reservation: {
          reservedFor: null,
          guestName: '',
          guestPhone: '',
          notes: ''
        }
      }
    );

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order item status (KDS)
router.patch('/:id/item/:itemId/status', checkRole(['superadmin', 'owner', 'manager', 'kitchen_staff']), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in order' });
    }

    item.status = status;

    // Automatically update order status based on item statuses
    const allItemsServed = order.items.every(i => ['served', 'cancelled'].includes(i.status));
    const allItemsReady = order.items.every(i => ['ready', 'served', 'cancelled'].includes(i.status));
    const anyItemPreparing = order.items.some(i => i.status === 'preparing');
    const anyItemReady = order.items.some(i => i.status === 'ready');

    if (allItemsServed) {
      order.status = 'served';
    } else if (allItemsReady) {
      order.status = 'ready';
    } else if (anyItemPreparing) {
      order.status = 'preparing';
    } else if (anyItemReady) {
      order.status = 'preparing';
    }

    await order.save();

    // Emit real-time update
    const io = req.app.get('socketio');
    if (io) {
      const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
      io.to(req.user.restaurantName).emit('order_updated', populatedOrder);
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Settle/Pay order
router.put('/:id/pay', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist']), async (req, res) => {
  try {
    const { paymentMode, paidAmount, customerId, keepTableOccupied, markCompleted, freeTable } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.paymentMode = paymentMode;
    
    // Handle different payment modes correctly
    if (paymentMode === 'due') {
      // For 'due' payments, the entire amount is due
      order.paidAmount = 0;
      order.dueAmount = order.totalAmount;
      order.paymentStatus = 'pending';
    } else if (paymentMode === 'mixed') {
      // For 'mixed' payments, use the provided paidAmount
      order.paidAmount = paidAmount;
      order.dueAmount = Math.max(0, order.totalAmount - paidAmount);
      
      if (paidAmount >= order.totalAmount) {
        order.paymentStatus = 'paid';
        order.dueAmount = 0;
      } else if (paidAmount > 0) {
        order.paymentStatus = 'partially_paid';
      } else {
        order.paymentStatus = 'pending';
      }
    } else {
      // For other payment modes (cash, online, card)
      order.paidAmount = paidAmount;
      order.dueAmount = Math.max(0, order.totalAmount - paidAmount);
      
      if (paidAmount >= order.totalAmount) {
        order.paymentStatus = 'paid';
        order.dueAmount = 0;
      } else if (paidAmount > 0) {
        order.paymentStatus = 'partially_paid';
      } else {
        order.paymentStatus = 'pending';
      }
    }
    
    if (markCompleted === true) {
      order.status = 'completed';
    }

    if (customerId) {
      order.customer = customerId;
      const customer = await Customer.findOne({ _id: customerId, restaurantName: req.user.restaurantName });
      if (customer) {
        // If paidAmount is greater than totalAmount, the excess is advance payment
        if (paidAmount > order.totalAmount) {
          const excess = paidAmount - order.totalAmount;
          customer.advancePayment = (customer.advancePayment || 0) + excess;
        }
        
        customer.pendingBalance += order.dueAmount;
        if (!customer.orderHistory.includes(order._id)) {
          customer.orderHistory.push(order._id);
        }
        await customer.save();
      }
    }

    await order.save();

    let shouldFreeTable = false;
    if (typeof freeTable === 'boolean') {
      shouldFreeTable = freeTable;
    } else if (keepTableOccupied === true) {
      shouldFreeTable = false;
    } else if (markCompleted === true) {
      shouldFreeTable = true;
    } else {
      shouldFreeTable = false;
    }

    if (order.tableIds && order.tableIds.length > 0 && shouldFreeTable) {
      await Table.updateMany(
        { restaurantName: req.user.restaurantName, tableId: { $in: order.tableIds } },
        { 
          status: 'available',
          currentOrder: null,
          customerCount: 0,
          reservation: {
            reservedFor: null,
            guestName: '',
            guestPhone: '',
            notes: ''
          }
        }
      );
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Settle partial due amount
router.put('/:id/settle-due', checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist']), async (req, res) => {
  try {
    const { settledAmount, paymentMode } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already fully paid' });
    }

    if (settledAmount <= 0) {
      return res.status(400).json({ message: 'Settled amount must be greater than 0' });
    }

    if (settledAmount > order.dueAmount) {
      return res.status(400).json({ message: 'Settled amount cannot exceed due amount' });
    }

    // Update payment details
    order.paidAmount += settledAmount;
    order.dueAmount -= settledAmount;

    // Update payment mode if this is the first payment
    if (order.paymentMode === 'due' && paymentMode) {
      order.paymentMode = paymentMode;
    } else if (order.paidAmount > 0 && order.dueAmount > 0) {
      order.paymentMode = 'mixed';
    }

    // Update payment status
    if (order.dueAmount === 0) {
      order.paymentStatus = 'paid';
    } else if (order.paidAmount > 0) {
      order.paymentStatus = 'partially_paid';
    }

    // Update customer pending balance if order is linked to a customer
    if (order.customer) {
      const customer = await Customer.findOne({ _id: order.customer, restaurantName: req.user.restaurantName });
      if (customer) {
        customer.pendingBalance = Math.max(0, customer.pendingBalance - settledAmount);
        await customer.save();
      }
    }

    await order.save();
    res.json(order);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

