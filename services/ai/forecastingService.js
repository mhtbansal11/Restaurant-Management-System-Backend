const OpenAI = require('openai');
const Order = require('../../models/Order');

/**
 * AI-Driven Demand Forecasting Service
 * Predicts future sales based on historical data
 */
async function getDemandForecast(userId, days = 7) {
  try {
    // 1. Fetch historical data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'completed'
    }).sort({ createdAt: 1 });

    // 2. Aggregate data by date
    const dailySales = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailySales[date]) dailySales[date] = 0;
      dailySales[date] += order.totalAmount;
    });

    const salesData = Object.entries(dailySales).map(([date, total]) => ({ date, total }));

    // If not enough data, return null or simple average
    if (salesData.length < 3) {
      return { 
        method: 'insufficient_data', 
        message: 'Not enough historical data for accurate forecasting.',
        forecast: [] 
      };
    }

    // 3. Use AI for forecasting
    if (process.env.OPENAI_API_KEY) {
      return await getAIForecast(salesData, days);
    } else {
      console.warn('OpenAI API Key missing. Using statistical fallback.');
      return getStatisticalForecast(salesData, days);
    }

  } catch (error) {
    console.error('Forecasting Error:', error);
    throw new Error('Failed to generate forecast');
  }
}

async function getAIForecast(salesData, days) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const dataString = salesData.map(d => `${d.date}: ${d.total}`).join('\n');
  const prompt = `
    Here is the daily sales revenue for a restaurant for the past 30 days:
    ${dataString}

    Task: Predict the total sales revenue for the NEXT ${days} days.
    Consider weekends and trends if visible.
    Return ONLY a JSON array of objects with 'date' (YYYY-MM-DD) and 'predictedTotal' (number).
    Example: [{"date": "2023-10-27", "predictedTotal": 5000}, ...]
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more deterministic/analytical output
    });

    const content = response.choices[0].message.content;
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\[.*\]/s);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const forecast = JSON.parse(jsonStr);
    return { method: 'ai', forecast };
  } catch (error) {
    console.error('OpenAI Forecasting Error:', error);
    return getStatisticalForecast(salesData, days);
  }
}

function getStatisticalForecast(salesData, days) {
  // Simple Moving Average (Last 7 days)
  const last7Days = salesData.slice(-7);
  const average = last7Days.reduce((sum, day) => sum + day.total, 0) / last7Days.length;

  const forecast = [];
  const lastDate = new Date(salesData[salesData.length - 1].date);

  for (let i = 1; i <= days; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i);
    forecast.push({
      date: nextDate.toISOString().split('T')[0],
      predictedTotal: Math.round(average)
    });
  }

  return { method: 'statistical', forecast };
}

module.exports = { getDemandForecast };
