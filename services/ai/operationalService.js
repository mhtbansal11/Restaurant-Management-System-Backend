
const Order = require('../../models/Order');

/**
 * AI Operational Intelligence Service
 * Analyzes peak hours, popular items, and service performance
 */
async function getOperationalInsights(userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'completed'
    }).populate('items.menuItem');

    if (orders.length === 0) {
      return {
        message: 'Insufficient data for operational insights.',
        peakHours: [],
        popularItems: [],
        busiestDays: []
      };
    }

    // 1. Peak Hours Analysis
    const hourCounts = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 2. Popular Items Analysis
    const itemCounts = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemName = item.menuItem?.name || 'Unknown';
        itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity;
      });
    });

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Busiest Days Analysis
    const dayCounts = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    orders.forEach(order => {
      const day = dayNames[new Date(order.createdAt).getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const busiestDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Generate AI Summary (Rule-based for now, could use OpenAI)
    const topDay = busiestDays[0]?.day;
    const topHourRaw = peakHours[0]?.hour;
    const topItem = popularItems[0]?.name;

    const formatHour = (hour) => {
      const h = hour % 12 || 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${h} ${ampm}`;
    };
    const topHourFormatted = topHourRaw !== undefined ? formatHour(topHourRaw) : 'N/A';

    const summary = `Your busiest day is ${topDay}, with peak activity around ${topHourFormatted}. ${topItem} is your most popular item. Consider increasing staff on ${topDay}s and ensuring high stock for ${topItem}.`;

    return {
      peakHours,
      popularItems,
      busiestDays,
      summary
    };

  } catch (error) {
    console.error('Operational Insights Error:', error);
    throw error;
  }
}

module.exports = { getOperationalInsights };
