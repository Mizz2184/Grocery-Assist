# AI Chatbot Integration Guide

## Overview
Your Grocery Assist app now has an AI-powered chatbot that helps users find products across all 4 grocery stores (MaxiPali, MasxMenos, Walmart, and Automercado).

## Features
✅ **Natural Language Understanding** - Users can ask questions in Spanish or English
✅ **Product Search** - Automatically searches all stores when users ask about products
✅ **Price Comparison** - Shows products sorted by price from all stores
✅ **Conversational AI** - Provides helpful shopping tips and answers questions
✅ **Beautiful UI** - Floating chat button with modern chat interface
✅ **Context Aware** - Remembers conversation history

## Setup Instructions

### 1. Configure Your VPS LLM API Key

You need to add your VPS LLM API key to your environment variables:

**Option A: Using .env file (Recommended for local development)**
```bash
# Add this to your .env file
VPS_LLM_API_KEY=sk-cf79590018fc426692eb5d86133b2411
```

**Option B: Using Vercel Environment Variables (For production)**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `VPS_LLM_API_KEY` = `sk-cf79590018fc426692eb5d86133b2411`

### 2. Update LLM Endpoint (If using custom VPS)

If you're using your own VPS-hosted LLM instead of OpenAI, update the endpoint in `server.js`:

```javascript
// Line 1197 in server.js
const llmResponse = await axios.post('YOUR_VPS_URL/api/generate', {
  // Update this URL to point to your VPS LLM endpoint
  model: 'your-model-name',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message }
  ],
  max_tokens: 500,
  temperature: 0.7
}, {
  headers: {
    'Authorization': `Bearer ${process.env.VPS_LLM_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});
```

### 3. Start Your Servers

**Backend Server:**
```bash
npm run server
```

**Frontend Development Server:**
```bash
npm run dev
```

## How It Works

### Architecture Flow

```
User Message
    ↓
Frontend (AIChatbot.tsx)
    ↓
POST /api/chatbot/query
    ↓
Backend (server.js)
    ↓
VPS LLM API
    ↓
AI Response Analysis
    ↓
If product search needed:
    ↓
Search All 4 Stores in Parallel
    ↓
Combine & Sort Results
    ↓
Return to Frontend with Products
```

### Backend Endpoint

**Endpoint:** `POST /api/chatbot/query`

**Request Body:**
```json
{
  "message": "Busco arroz",
  "conversationHistory": [
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "¡Hola! ¿En qué puedo ayudarte?" }
  ]
}
```

**Response (Conversation):**
```json
{
  "message": "Claro, puedo ayudarte a encontrar arroz. Déjame buscar en todas las tiendas.",
  "type": "conversation"
}
```

**Response (Product Results):**
```json
{
  "message": "Encontré 10 productos para 'arroz'. Aquí están los mejores precios:",
  "products": [
    {
      "id": "123",
      "name": "Arroz Tío Pelón 1kg",
      "brand": "Tío Pelón",
      "price": 1500,
      "imageUrl": "https://...",
      "store": "MaxiPali"
    }
  ],
  "type": "product_results",
  "query": "arroz"
}
```

### Frontend Component

The chatbot appears as a floating button in the bottom-right corner of all pages.

**Key Features:**
- 🟢 **Floating Button** - Always accessible
- 💬 **Chat Window** - Opens on click
- 📱 **Responsive** - Works on mobile and desktop
- 🎨 **Theme Aware** - Adapts to light/dark mode
- 🔄 **Auto-scroll** - Scrolls to latest message
- ⌨️ **Keyboard Support** - Press Enter to send

## Customization

### Change AI Personality

Edit the system prompt in `server.js` (line 1175):

```javascript
const systemPrompt = `You are a helpful grocery shopping assistant...`;
```

### Modify Product Display

Edit the product card rendering in `AIChatbot.tsx` (line 195):

```tsx
<div className="bg-background rounded-lg p-2 border">
  {/* Customize product display here */}
</div>
```

### Change Chat Position

Modify the floating button position in `AIChatbot.tsx` (line 139):

```tsx
className="fixed bottom-6 right-6 h-14 w-14..."
// Change bottom-6 and right-6 to adjust position
```

## Testing

### Test Conversational Queries
- "Hola, ¿cómo estás?"
- "¿Qué tiendas tienen los mejores precios?"
- "Dame consejos para ahorrar en el supermercado"

### Test Product Search
- "Busco arroz"
- "Necesito leche"
- "¿Dónde encuentro aceite más barato?"
- "Quiero comprar frijoles"

### Test Bilingual Support
- English: "I need rice"
- Spanish: "Necesito arroz"

## Troubleshooting

### Chatbot Not Responding
1. Check if backend server is running on port 8080
2. Verify VPS_LLM_API_KEY is set correctly
3. Check browser console for errors
4. Verify LLM API endpoint is accessible

### Products Not Showing
1. Ensure all store APIs are working
2. Check server.js logs for API errors
3. Verify product search endpoints are responding

### API Key Issues
```bash
# Test if API key is loaded
curl http://localhost:8080/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Advanced Configuration

### Add Conversation Logging to Supabase

Create a table in Supabase:
```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  products JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Then add logging in `server.js`:
```javascript
// After getting AI response
await supabase.from('chatbot_conversations').insert({
  user_id: req.user?.id,
  message: message,
  response: aiResponse,
  products: allProducts
});
```

### Rate Limiting

Add rate limiting to prevent abuse:
```javascript
import rateLimit from 'express-rate-limit';

const chatbotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});

app.post('/api/chatbot/query', chatbotLimiter, async (req, res) => {
  // ... existing code
});
```

## Performance Tips

1. **Cache Common Queries** - Store frequent product searches
2. **Reduce LLM Tokens** - Lower max_tokens for faster responses
3. **Parallel Store Searches** - Already implemented ✅
4. **Add Loading States** - Already implemented ✅

## Support

For issues or questions:
1. Check server logs: `npm run server`
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test individual store APIs separately

## Future Enhancements

Potential features to add:
- [ ] Voice input support
- [ ] Image recognition for products
- [ ] Shopping list suggestions based on chat
- [ ] Price alerts and notifications
- [ ] Recipe recommendations
- [ ] Store location finder
- [ ] Nutrition information lookup

---

**Created:** November 16, 2025
**Version:** 1.0.0
