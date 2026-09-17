const { validationResult } = require('express-validator');

// ──────────────────────────────────────────
// Helper: System prompt instructions for AI Tutor
// ──────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are CodeAlpha AI Tutor, an expert computer science and programming tutor.
Your mission is to help students and developers learn programming, debug code, understand concepts, and write clean software.
Provide clear, structured, well-formatted markdown responses with code blocks where appropriate.
Be encouraging, helpful, concise, and thorough in your explanations.`;

// ──────────────────────────────────────────
// Smart Fallback AI Response Generator
// ──────────────────────────────────────────
const generateFallbackResponse = (userPrompt, conversationHistory) => {
  const lower = userPrompt.toLowerCase();

  if (lower.includes('async') || lower.includes('await') || lower.includes('promise')) {
    return `### ⚡ Understanding Async/Await in JavaScript

**Async/Await** is a modern syntactic sugar built on top of JavaScript Promises. It allows you to write asynchronous code that looks and behaves like synchronous code.

#### 1. What is a Promise?
A \`Promise\` represents a value that may be available now, in the future, or never. It has three states:
- **Pending**: Initial state
- **Fulfilled**: Operation succeeded
- **Rejected**: Operation failed

#### 2. The \`async\` Keyword
Adding \`async\` before a function definition means the function always returns a Promise:
\`\`\`javascript
async function fetchUser() {
  return { id: 1, name: 'Alice' }; // Automatically wrapped in Promise.resolve()
}
\`\`\`

#### 3. The \`await\` Keyword
The \`await\` keyword pauses function execution until the Promise resolves:
\`\`\`javascript
async function getUserData() {
  try {
    const response = await fetch('https://api.example.com/user/1');
    const user = await response.json();
    console.log('User loaded:', user);
  } catch (error) {
    console.error('Failed to fetch user:', error.message);
  }
}
\`\`\`

#### 💡 Key Rules:
- You can only use \`await\` inside an \`async\` function (or top-level ES modules).
- Always handle errors using \`try...catch\` blocks.`;
  }

  if (lower.includes('debug') || lower.includes('error') || lower.includes('useeffect') || lower.includes('loop')) {
    return `### 🐛 Debugging React \`useEffect\` Loops

A common issue in React is an infinite re-render loop caused by \`useEffect\`.

#### Common Cause:
\`\`\`jsx
// ❌ BAD: State change triggers effect, effect triggers state change
useEffect(() => {
  const newCount = count + 1;
  setCount(newCount); 
}, [count]); // 'count' changes -> effect runs -> 'count' changes -> loop!
\`\`\`

#### 💡 Solution Strategies:
1. **Pass accurate dependencies**: Only include values that truly trigger a re-fetch.
2. **Use functional state updates** if you only need the previous state:
\`\`\`jsx
// ✅ GOOD: Updating state based on previous state without needing 'count' in deps
setCount(prev => prev + 1);
\`\`\`
3. **Memoize callback functions** using \`useCallback\` if passing functions into dependency arrays.`;
  }

  if (lower.includes('express') || lower.includes('rest') || lower.includes('endpoint') || lower.includes('route')) {
    return `### 🚀 Building RESTful APIs with Express.js

Here is a clean example of setting up a CRUD route handler in Node.js & Express:

\`\`\`javascript
const express = require('express');
const router = express.Router();

// GET /api/items - Retrieve all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({});
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/items - Create a new item
router.post('/', async (req, res) => {
  try {
    const newItem = await Item.create(req.body);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
\`\`\`

#### Best Practices:
- Always use standard HTTP status codes (\`200\`, \`201\`, \`400\`, \`404\`, \`500\`).
- Wrap asynchronous DB calls in \`try...catch\` or pass errors to global error middleware.`;
  }

  if (lower.includes('mongodb') || lower.includes('index') || lower.includes('mongoose')) {
    return `### 🍃 MongoDB Indexing & Optimization

Indexes support the efficient execution of queries in MongoDB. Without indexes, MongoDB must perform a *collection scan* (scanning every document in a collection).

#### 1. Creating Single Field & Compound Indexes
\`\`\`javascript
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, index: true }, // Single field index
  price: { type: Number, required: true }
});

// Compound index for queries filtering by category AND sorting by price
productSchema.index({ category: 1, price: -1 });

module.exports = mongoose.model('Product', productSchema);
\`\`\`

#### 2. Benefits:
- **Faster Queries**: Reduces query response time from O(N) to O(log N).
- **Sorted Results**: Avoids expensive in-memory sorts when querying large collections.`;
  }

  // Default general tutoring response
  return `### 🤖 CodeAlpha AI Tutor Response

Thank you for your question: **"${userPrompt}"**

Here is a step-by-step breakdown to guide your learning:

#### Key Concepts:
1. **Understand the Problem**: Break down complex problems into smaller, manageable sub-problems.
2. **Data Structure Choice**: Select the optimal data structures (Arrays, Objects/Maps, Trees, or Graphs) based on lookup and insertion requirements.
3. **Clean Code & Modularization**: Keep functions small, single-purpose, and clearly named.

\`\`\`javascript
// Example: Modular programming pattern
function processData(input) {
  if (!input) throw new Error('Invalid input');
  return input.trim().toUpperCase();
}
\`\`\`

#### 💡 Learning Tip:
Feel free to ask follow-up questions, provide code snippets for debugging, or request specific examples in any programming language (JavaScript, Python, C++, Java, SQL, etc.)!`;
};

// ──────────────────────────────────────────
// @route   POST /api/ai/chat
// @desc    Send multi-turn chat message to AI Tutor
// @access  Public
// ──────────────────────────────────────────
const chatWithTutor = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Messages array is required and must not be empty' });
  }

  // Restrict context size (keep max last 20 messages)
  const slicedMessages = messages.slice(-20);

  // Validate message content size
  for (const msg of slicedMessages) {
    if (!msg.content || typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content must be a non-empty string' });
    }
    if (msg.content.length > 4000) {
      return res.status(400).json({ message: 'Message content exceeds maximum allowed length of 4000 characters' });
    }
  }

  const latestUserMsg = slicedMessages[slicedMessages.length - 1].content.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  // If Gemini API Key is available, call Google Gemini REST API
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here') {
    try {
      const contents = slicedMessages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Prepend system instruction to first message if user
      contents.unshift({
        role: 'user',
        parts: [{ text: `[System Instruction: ${SYSTEM_INSTRUCTION}]` }],
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          generateFallbackResponse(latestUserMsg, slicedMessages);

        return res.status(200).json({
          reply,
          provider: 'gemini',
          timestamp: new Date().toISOString(),
        });
      } else {
        console.warn(`Gemini API returned status ${response.status}. Using fallback tutor engine.`);
      }
    } catch (err) {
      console.error('Error contacting Gemini API:', err.message);
    }
  }

  // Fallback engine response
  const reply = generateFallbackResponse(latestUserMsg, slicedMessages);
  return res.status(200).json({
    reply,
    provider: 'codealpha-tutor-engine',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { chatWithTutor };
