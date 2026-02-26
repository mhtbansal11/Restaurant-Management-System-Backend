const OpenAI = require('openai');

/**
 * AI Chatbot Service
 * Handles conversational queries about the menu and restaurant
 */
async function processChatQuery(message, history = [], fullMenu = []) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        reply: "I'm sorry, my AI brain is currently offline (API key missing). How can I help you manually?",
        suggestions: ["Show Menu", "Check Status"]
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const menuContext = fullMenu.map(i => `${i.name}: ₹${i.price} (${i.category})`).join('\n');
    
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant for a modern restaurant POS system. 
        You help staff and customers with menu queries, recommendations, and basic ordering.
        
        Available Menu:
        ${menuContext}
        
        Guidelines:
        - Be professional, helpful, and concise.
        - If someone wants to order, suggest they use the POS interface but you can confirm item availability.
        - If they ask for recommendations, suggest items from the menu.
        - Keep responses under 3 sentences unless necessary.`
      },
      ...history,
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 150
    });

    return {
      reply: response.choices[0].message.content,
      suggestions: ["What's popular?", "Any desserts?", "Help"]
    };

  } catch (error) {
    console.error('Chatbot Service Error:', error);
    return {
      reply: "Oops! I encountered an error. Try asking something else.",
      suggestions: ["Try again"]
    };
  }
}

module.exports = { processChatQuery };
