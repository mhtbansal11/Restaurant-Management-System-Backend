const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MenuItem = require('../models/MenuItem');
const { getUpsellRecommendations } = require('../services/ai/recommendationService');
const { getDemandForecast } = require('../services/ai/forecastingService');
const { processChatQuery } = require('../services/ai/chatbotService');
const { getOperationalInsights } = require('../services/ai/operationalService');

// @route   POST /api/ai/chat
// @desc    Chat with AI assistant
// @access  Private
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const fullMenu = await MenuItem.find({ userId: req.user.id });
    const response = await processChatQuery(message, history, fullMenu);

    res.json(response);
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/ai/recommend
// @desc    Get AI-driven upselling recommendations based on cart
// @access  Private
router.post('/recommend', auth, async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }

    // Fetch full menu for context
    // In a real app, we might optimize this to only fetch relevant categories
    const fullMenu = await MenuItem.find({ userId: req.user.id });

    const recommendations = await getUpsellRecommendations(cartItems, fullMenu);

    res.json(recommendations);
  } catch (error) {
    console.error('Recommendation API Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/ai/forecast
// @desc    Get sales forecast for next N days
// @access  Private
router.get('/forecast', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const forecast = await getDemandForecast(req.user.id, days);
    res.json(forecast);
  } catch (error) {
    console.error('Forecast API Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/ai/operational-insights
// @desc    Get operational intelligence insights
// @access  Private
router.get('/operational-insights', auth, async (req, res) => {
  try {
    const insights = await getOperationalInsights(req.user.id);
    res.json(insights);
  } catch (error) {
    console.error('Operational Insights API Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
