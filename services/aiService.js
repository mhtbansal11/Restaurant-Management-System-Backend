const OpenAI = require('openai');

/**
 * Extract menu items from an image using OpenAI Vision API
 */
async function extractMenuItemsFromImage(imageUrl) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please set it in your .env file.');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this menu image and extract all menu items with their details. 
              Return a JSON array of objects with the following structure for each item:
              {
                "name": "item name",
                "description": "item description if available",
                "price": numeric_price_value,
                "category": "category name (e.g., Appetizers, Main Course, Desserts, Beverages)"
              }
              
              If price is not clearly visible, estimate a reasonable price or set to 0.
              Categories should be one of: Appetizers, Main Course, Desserts, Beverages, Salads, Soups, or Other.
              Return ONLY valid JSON array, no other text.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const menuItems = JSON.parse(jsonMatch[0]);
      return menuItems;
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error extracting menu items:', error);
    
    // Check for quota exceeded or billing errors
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('billing')) {
      console.warn('OpenAI API quota exceeded or billing issue. Returning MOCK data for demonstration.');
      return [
        {
          name: "Butter Chicken (Mock)",
          description: "Tender chicken in a rich tomato and butter sauce (Mock Data - API Quota Exceeded)",
          price: 14.99,
          category: "Main Course"
        },
        {
          name: "Paneer Tikka (Mock)",
          description: "Marinated cottage cheese cubes grilled to perfection",
          price: 11.50,
          category: "Appetizers"
        },
        {
          name: "Garlic Naan (Mock)",
          description: "Leavened flatbread topped with garlic and cilantro",
          price: 3.50,
          category: "Other"
        },
        {
          name: "Mango Lassi (Mock)",
          description: "Refreshing yogurt-based mango drink",
          price: 4.99,
          category: "Beverages"
        }
      ];
    }

    // Throw the actual error message to help with debugging
    throw new Error(`Failed to extract menu items: ${error.message}`);
  }
}

module.exports = {
  extractMenuItemsFromImage
};

