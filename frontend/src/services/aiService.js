import api from './api';

/**
 * Send multi-turn chat messages array to backend AI Tutor endpoint.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{reply: string, provider: string, timestamp: string}>}
 */
export const sendChatMessage = async (messages) => {
  const response = await api.post('/ai/chat', { messages });
  return response.data;
};
