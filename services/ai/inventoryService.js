const MenuItem = require('../../models/MenuItem');
const Order = require('../../models/Order');

/**
 * AI Smart Inventory Service
 * Predicts stock exhaustion and suggests reorders
 */
async function getInventoryInsights(inventoryItems, userId) {
  try {
    // 1. Fetch recent orders to calculate real consumption
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await Order.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'completed'
    }).populate('items.menuItem');

    // 2. Map inventory items to consumption quantities
    const consumptionMap = {};
    recentOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.menuItem && item.menuItem.ingredients) {
          item.menuItem.ingredients.forEach(ing => {
            const ingId = ing.inventoryItemId.toString();
            const totalQty = ing.quantity * item.quantity;
            consumptionMap[ingId] = (consumptionMap[ingId] || 0) + totalQty;
          });
        }
      });
    });

    // 3. Generate insights
    const insights = inventoryItems.map(item => {
      const totalConsumed = consumptionMap[item._id.toString()] || 0;
      const dailyConsumption = totalConsumed / 30;
      const daysLeft = dailyConsumption > 0 ? item.quantity / dailyConsumption : Infinity;

      let suggestion = '';
      let priority = 'low';

      if (item.quantity <= item.minThreshold) {
        priority = 'high';
        suggestion = `CRITICAL: Below threshold. Reorder ${item.minThreshold * 5} units immediately.`;
      } else if (daysLeft < 3) {
        priority = 'high';
        suggestion = `Running out in ~${Math.round(daysLeft)} days. Reorder soon.`;
      } else if (daysLeft < 7) {
        priority = 'medium';
        suggestion = `Running out in ~${Math.round(daysLeft)} days. Plan reorder.`;
      }

      if (suggestion) {
        return {
          itemId: item._id,
          name: item.name,
          currentStock: item.quantity,
          dailyConsumption: dailyConsumption.toFixed(2),
          daysLeft: daysLeft === Infinity ? 'N/A' : Math.round(daysLeft),
          suggestion,
          priority
        };
      }
      return null;
    }).filter(i => i !== null);

    return insights;

  } catch (error) {
    console.error('Inventory Insight Error:', error);
    return [];
  }
}

module.exports = { getInventoryInsights };
