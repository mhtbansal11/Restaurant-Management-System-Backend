const OpenAI = require('openai');
const Order = require('../../models/Order');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

/**
 * AI Operational Intelligence Service
 * Analyzed peak hours, popular items, and service performance
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
        busiestDays: [],
        summary: "I'm still learning your restaurant's patterns. Start taking orders to see AI insights!"
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

    // 4. Generate AI Summary using OpenAI
    let summary = '';
    try {
      const prompt = `As an AI Restaurant Consultant, analyze this data from the last 30 days:
      - Busiest Days: ${busiestDays.map(d => `${d.day} (${d.count} orders)`).join(', ')}
      - Peak Hours: ${peakHours.map(h => `${h.hour}:00 (${h.count} orders)`).join(', ')}
      - Top Items: ${popularItems.map(i => `${i.name} (${i.count} sold)`).join(', ')}
      
      Provide a concise 2-3 sentence strategic briefing for the owner. Focus on staffing, inventory, and growth.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      summary = response.choices[0].message.content.trim();
    } catch (aiErr) {
      console.error('OpenAI Error:', aiErr);
      // Fallback to rule-based
      const topDay = busiestDays[0]?.day;
      const topHour = peakHours[0]?.hour;
      const topItem = popularItems[0]?.name;
      summary = `Your busiest day is ${topDay} at ${topHour}:00. ${topItem} is trending. Keep up the great work!`;
    }

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
