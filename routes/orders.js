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
router.get('/stats', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        // For mixed, we count the paid portion as cash for simplicity in dashboard
        stats.cashCollected += (order.paidAmount || 0); 
      }
      
      stats.dueAmount += (order.dueAmount || 0);
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
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
router.post('/', [auth, checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'waiter'])], async (req, res) => {
  try {
    const { tableId, tableLabel, items, customerName, customerPhone, customerId, discountPercent, discountAmount, taxRate, taxAmount, serviceChargeRate, serviceChargeAmount, subtotal } = req.body;

    // Calculate total amount
    const totalAmount = req.body.totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = new Order({
      userId: req.user._id,
      restaurantName: req.user.restaurantName,
      tableId,
      tableLabel,
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
        if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
          for (const ingredient of menuItem.ingredients) {
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

    // Update table status
    await Table.findOneAndUpdate(
      { restaurantName: req.user.restaurantName, tableId },
      { 
        status: 'occupied',
        currentOrder: order._id,
        customerCount: req.body.customerCount || 0
      }
    );

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', [auth, checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'kitchen_staff', 'waiter'])], async (req, res) => {
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

    if (status === 'completed' || status === 'cancelled') {
      let shouldFreeTable = true;
      if (typeof freeTable === 'boolean') {
        shouldFreeTable = freeTable;
      } else if (keepTableOccupied === true) {
        shouldFreeTable = false;
      }
      
      if (shouldFreeTable) {
        await Table.findOneAndUpdate(
          { restaurantName: req.user.restaurantName, tableId: order.tableId },
          { 
            status: 'available',
            currentOrder: null,
            customerCount: 0
          }
        );
      }
    }

    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order items
router.put('/:id', [auth, checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist', 'waiter'])], async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.body.items) {
      // Instead of replacing all items, we merge them to preserve status of existing items
      // If quantity is increased, we split the item so the new portion is 'queued'
      const finalItems = [];
      
      for (const newItem of req.body.items) {
        if (newItem._id) {
          const existingItem = order.items.id(newItem._id);
          if (existingItem) {
            if (newItem.quantity > existingItem.quantity && existingItem.status !== 'queued') {
              // Quantity increased AND item is already being processed (not queued) - split it
              const difference = newItem.quantity - existingItem.quantity;
              
              // 1. Keep the existing item with its original quantity and status
              // existingItem.quantity remains the same
              existingItem.notes = newItem.notes || existingItem.notes;
              finalItems.push(existingItem);
              
              // 2. Add the extra quantity as a new 'queued' item
              finalItems.push({
                menuItem: newItem.menuItem || existingItem.menuItem,
                quantity: difference,
                price: newItem.price || existingItem.price,
                notes: newItem.notes || '',
                status: 'queued'
              });
            } else {
              // Quantity is same or decreased - just update
              existingItem.quantity = newItem.quantity;
              existingItem.notes = newItem.notes || existingItem.notes;
              if (newItem.status) existingItem.status = newItem.status;
              finalItems.push(existingItem);
            }
          } else {
            // ID not found? Treat as new
            finalItems.push({
              menuItem: newItem.menuItem,
              quantity: newItem.quantity,
              price: newItem.price,
              notes: newItem.notes || '',
              status: 'queued'
            });
          }
        } else {
          // Completely new item
          finalItems.push({
            menuItem: newItem.menuItem,
            quantity: newItem.quantity,
            price: newItem.price,
            notes: newItem.notes || '',
            status: 'queued'
          });
        }
      }

      order.items = finalItems;
      
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
        order.totalAmount = finalItems
          .filter(item => item.status !== 'cancelled')
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
      
      // If the order was already 'ready' or 'served', but new items are added, 
      // we might need to move it back to 'active'
      const hasPendingItems = finalItems.some(i => ['queued', 'preparing'].includes(i.status));
      if (hasPendingItems && ['ready', 'served', 'completed'].includes(order.status)) {
        order.status = 'active';
      }
    }

    if (req.body.customerName !== undefined) order.customerName = req.body.customerName;
    if (req.body.customerPhone !== undefined) order.customerPhone = req.body.customerPhone;

    // Handle orderType and table changes
    const oldOrderType = order.orderType;
    const oldTableId = order.tableId;
    const newOrderType = req.body.orderType;
    const newTableId = req.body.tableId;

    if (newOrderType && newOrderType !== oldOrderType) {
      order.previousOrderType = oldOrderType;
      order.orderType = newOrderType;
    }

    if (newTableId !== undefined) {
      order.tableId = newTableId;
      order.tableLabel = req.body.tableLabel || null;
    }

    // Sync table status if orderType or table changed
    if (oldOrderType === 'dine-in' && (newOrderType !== 'dine-in' || (newTableId !== undefined && newTableId !== oldTableId))) {
      // Free old table
      await Table.findOneAndUpdate(
        { restaurantName: req.user.restaurantName, tableId: oldTableId },
        { status: 'available', currentOrder: null, customerCount: 0 }
      );
    }

    if (newOrderType === 'dine-in' && (oldOrderType !== 'dine-in' || (newTableId !== undefined && newTableId !== oldTableId))) {
      // Occupy new table
      await Table.findOneAndUpdate(
        { restaurantName: req.user.restaurantName, tableId: newTableId },
        { status: 'occupied', currentOrder: order._id, customerCount: req.body.customerCount || 0 }
      );
    }

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete order
router.delete('/:id', [auth, checkRole(['superadmin', 'owner', 'manager'])], async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantName: req.user.restaurantName });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Free the table
    await Table.findOneAndUpdate(
      { restaurantName: req.user.restaurantName, tableId: order.tableId },
      { 
        status: 'available',
        currentOrder: null,
        customerCount: 0
      }
    );

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order item status (KDS)
router.patch('/:id/item/:itemId/status', [auth, checkRole(['superadmin', 'owner', 'manager', 'kitchen_staff'])], async (req, res) => {
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

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Settle/Pay order
router.put('/:id/pay', [auth, checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist'])], async (req, res) => {
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

    if (order.tableId && shouldFreeTable) {
      await Table.findOneAndUpdate(
        { restaurantName: req.user.restaurantName, tableId: order.tableId },
        { 
          status: 'available',
          currentOrder: null,
          customerCount: 0
        }
      );
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Settle partial due amount
router.put('/:id/settle-due', [auth, checkRole(['superadmin', 'owner', 'manager', 'cashier', 'receptionist'])], async (req, res) => {
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

