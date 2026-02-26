# Environment Setup

## Quick Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

   Or on Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit the `.env` file and fill in your actual values:

   - **MONGODB_URI**: Your MongoDB connection string
     - Local: `mongodb://localhost:27017/restaurant_management`
     - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/restaurant_management`
   
   - **JWT_SECRET**: Any random string for signing JWT tokens (keep it secret!)
   
   - **OPENAI_API_KEY**: (Optional) Your OpenAI API key if you want to use AI menu extraction
     - Get one at: https://platform.openai.com/api-keys
     - Leave empty if you don't need AI features
   
   - **CLOUDINARY_*****: (Optional) Cloudinary credentials if you want image uploads
     - Get free account at: https://cloudinary.com
     - Leave empty if you don't need image storage

## Minimum Required Variables

For basic functionality, you only need:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - Any secret string

The OpenAI and Cloudinary variables are optional and only needed for:
- AI menu extraction (requires OpenAI API key)
- Image uploads (requires Cloudinary credentials)

