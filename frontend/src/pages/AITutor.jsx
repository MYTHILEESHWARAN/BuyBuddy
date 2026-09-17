import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/aiService';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';

const INITIAL_WELCOME = {
  role: 'assistant',
  content: `Hello! I'm your **CodeAlpha AI Tutor**. 🤖

How can I help you today? You can ask me to:
- 💡 **Explain programming concepts** (e.g. *Async/Await, Closures, OOP*)
- 🐛 **Debug error messages or code snippets**
- 💻 **Provide code examples** (e.g. *React, Express, Python, SQL*)
- 📚 **Give step-by-step guides & best practices**

Type a message below or select one of the suggested prompts to get started!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const SUGGESTED_PROMPTS = [
  { icon: '⚡', label: 'Explain Async/Await', prompt: 'Explain Async/Await in JavaScript with simple examples and best practices.' },
  { icon: '🐛', label: 'Debug React useEffect', prompt: 'Why does my React useEffect cause an infinite render loop and how do I fix it?' },
  { icon: '🚀', label: 'Express REST API', prompt: 'Show me an example of setting up a CRUD REST API endpoint using Express.js.' },
  { icon: '🍃', label: 'MongoDB Indexing', prompt: 'Explain how MongoDB indexes work step-by-step and how to optimize queries.' },
];

const AITutor = () => {
  const [messages, setMessages] = useState([INITIAL_WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || loading) return;

    const userMsg = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Send message thread (filtered without system UI welcome metadata if needed)
      const payload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await sendChatMessage(payload);

      const aiMsg = {
        role: 'assistant',
        content: data.reply,
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to get response from AI Tutor. Please try again.';
      toast.error(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error**: ${errorMsg}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_WELCOME]);
    toast.success('Chat history cleared');
  };

  // Helper to simple-format markdown code blocks and bold text
  const formatMarkdown = (text) => {
    if (!text) return '';
    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
        const code = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);
        return (
          <div key={index} className="ai-code-block">
            <div className="ai-code-header">
              <span>{lang || 'code'}</span>
              <button
                className="ai-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Code copied to clipboard!');
                }}
              >
                📋 Copy
              </button>
            </div>
            <pre><code>{code}</code></pre>
          </div>
        );
      }
      
      // Basic paragraph formatting (bold, inline code, headings)
      const lines = part.split('\n');
      return (
        <span key={index}>
          {lines.map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return <h3 key={lIdx} className="ai-heading-3">{line.substring(4)}</h3>;
            }
            if (line.startsWith('#### ')) {
              return <h4 key={lIdx} className="ai-heading-4">{line.substring(5)}</h4>;
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return <li key={lIdx} className="ai-list-item">{line.substring(2)}</li>;
            }
            return (
              <p key={lIdx} className="ai-paragraph">
                {line.split(/(`[^`]+`)/g).map((sub, sIdx) => {
                  if (sub.startsWith('`') && sub.endsWith('`')) {
                    return <code key={sIdx} className="ai-inline-code">{sub.slice(1, -1)}</code>;
                  }
                  // Bold formatting
                  return sub.split(/(\*\*[^*]+\*\*)/g).map((bText, bIdx) => {
                    if (bText.startsWith('**') && bText.endsWith('**')) {
                      return <strong key={bIdx}>{bText.slice(2, -2)}</strong>;
                    }
                    return bText;
                  });
                })}
              </p>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className="ai-tutor-page">
      <div className="container">
        <div className="ai-tutor-card">
          {/* Header */}
          <div className="ai-tutor-header">
            <div className="ai-tutor-header__info">
              <div className="ai-tutor-avatar">🤖</div>
              <div>
                <h1 className="ai-tutor-title">CodeAlpha AI Tutor</h1>
                <p className="ai-tutor-subtitle">
                  Your 24/7 Intelligent Assistant for Coding, Debugging & Concepts
                </p>
              </div>
            </div>
            <div className="ai-tutor-header__actions">
              <span className="badge badge--indigo">Multi-Turn Chat</span>
              <button className="btn btn--ghost btn--sm" onClick={handleClearChat} title="Clear conversation">
                🗑 Clear Chat
              </button>
            </div>
          </div>

          {/* Prompt Chips */}
          {messages.length <= 2 && (
            <div className="ai-prompts-row">
              {SUGGESTED_PROMPTS.map((sp, idx) => (
                <button
                  key={idx}
                  className="ai-prompt-chip"
                  onClick={() => handleSend(sp.prompt)}
                  disabled={loading}
                >
                  <span className="ai-prompt-chip__icon">{sp.icon}</span>
                  <span className="ai-prompt-chip__label">{sp.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chat Messages */}
          <div className="ai-chat-window">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-message ${msg.role === 'user' ? 'ai-message--user' : 'ai-message--assistant'} ${msg.isError ? 'ai-message--error' : ''}`}
              >
                <div className="ai-message__avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="ai-message__bubble">
                  <div className="ai-message__header">
                    <span className="ai-message__author">
                      {msg.role === 'user' ? 'You' : 'AI Tutor'}
                    </span>
                    <span className="ai-message__time">{msg.timestamp}</span>
                  </div>
                  <div className="ai-message__content">
                    {formatMarkdown(msg.content)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading / Typing Indicator */}
            {loading && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message__avatar">🤖</div>
                <div className="ai-message__bubble ai-message__bubble--loading">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="typing-text">AI Tutor is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="ai-chat-input-area">
            <div className="ai-chat-input-wrap">
              <textarea
                ref={inputRef}
                className="ai-chat-input"
                placeholder="Ask any programming question, request a concept explanation, or paste code to debug..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={loading}
              />
              <button
                className="btn btn--primary ai-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                id="ai-send-btn"
              >
                {loading ? '...' : 'Send 🚀'}
              </button>
            </div>
            <div className="ai-chat-footer-note">
              Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line • Powered by backend AI endpoint
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AITutor;
