const OpenAI = require('openai');

/**
 * AI-Driven Upselling Service
 * Suggests items based on current cart context
 */
async function getUpsellRecommendations(cartItems, fullMenu) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API Key missing. Using rule-based fallback.');
      return getRuleBasedRecommendations(cartItems, fullMenu);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Simplify payload to save tokens
    const cartSummary = cartItems.map(i => i.name).join(', ');
    const menuSummary = fullMenu.map(i => `${i.name} (${i.category})`).join(', ');

    const prompt = `
      Context: A customer has ordered: ${cartSummary}.
      Menu available: ${menuSummary}.
      Task: Recommend 3 specific items from the menu that complement the order (e.g., drinks, desserts, sides).
      Return ONLY a JSON array of item names. Example: ["Coke", "Fries", "Lava Cake"]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use 3.5 for speed/cost
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100
    });

    const content = response.choices[0].message.content;
    const suggestedNames = JSON.parse(content);

    // Filter full menu objects based on names
    return fullMenu.filter(item => suggestedNames.includes(item.name));

  } catch (error) {
    console.error('AI Recommendation Error:', error.message);
    return getRuleBasedRecommendations(cartItems, fullMenu);
  }
}

/**
 * Fallback Rule-Based Logic (Offline/No-Quota Mode)
 */
function getRuleBasedRecommendations(cartItems, fullMenu) {
  const cartCategories = cartItems.map(i => i.category);
  const suggestions = [];

  // Rule 1: If Main Course, suggest Beverages or Appetizers
  if (cartCategories.includes('Main Course')) {
    const beverages = fullMenu.filter(i => i.category === 'Beverages');
    const appetizers = fullMenu.filter(i => i.category === 'Appetizers');
    suggestions.push(...beverages.slice(0, 1), ...appetizers.slice(0, 1));
  }

  // Rule 2: If no Dessert, suggest Dessert
  if (!cartCategories.includes('Desserts')) {
    const desserts = fullMenu.filter(i => i.category === 'Desserts');
    suggestions.push(...desserts.slice(0, 1));
  }

  // Fallback: Random popular items
  if (suggestions.length === 0) {
    return fullMenu.slice(0, 3);
  }

  return suggestions.slice(0, 3);
}

module.exports = { getUpsellRecommendations };
