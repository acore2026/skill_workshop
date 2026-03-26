import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Send, Terminal, Trash2, User } from 'lucide-react';
import type { ChatMessage } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import './AgentChatbox.css';

const AgentChatbox: React.FC = () => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    addMessage,
    clearMessages,
    appState,
    setAppState,
    applyAgentPrompt,
  } = useStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || appState === 'generating') {
      return;
    }

    const prompt = input.trim();
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');
    setAppState('generating');

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const result = applyAgentPrompt(prompt);
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `${result.summary}\n\nThe workspace was updated through \`${result.toolCallName}\`.`,
        timestamp: new Date().toISOString(),
        toolCalls: [
          { name: result.toolCallName, args: { model: result.model } },
        ],
      };
      addMessage(assistantMessage);
      setAppState('draft_ready');
    } catch (error) {
      console.error('Agent Chat Error:', error);
      setAppState('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="agent-chatbox">
      <div className="chat-header">
        <div className="header-info">
          <Bot size={16} className="bot-icon" />
          <span>Skill Generator</span>
        </div>
        <button className="clear-btn" onClick={clearMessages} title="Clear history">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="messages-container" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-chat">
              <Bot size={32} className="empty-icon" />
              <h3>Build A Skill Flow</h3>
              <p>Describe the flow you want. The generator applies the graph update directly to the workspace.</p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message-bubble-wrapper ${msg.role}`}
            >
              <div className="message-avatar">{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
              <div className="message-bubble">
                <div className="message-content">{msg.content}</div>

                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="chat-telemetry">
                    <div className="telemetry-header">
                      <Terminal size={10} />
                      <span>Tool Calls</span>
                    </div>
                    <div className="telemetry-items">
                      {msg.toolCalls.map((tc, index) => (
                        <div key={index} className="telemetry-pill">
                          {tc.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}

          {appState === 'generating' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="message-bubble-wrapper assistant">
              <div className="message-avatar">
                <Bot size={14} />
              </div>
              <div className="message-bubble loading">
                <Loader2 size={16} className="animate-spin" />
                <span>Updating workspace...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe an SBI skill flow, add a branch, or update the current skill..."
            rows={2}
            disabled={appState === 'generating'}
          />
          <button className="send-btn" onClick={handleSend} disabled={!input.trim() || appState === 'generating'}>
            {appState === 'generating' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="input-footer">Describe a flow change, a new SBI action, or a routing update.</div>
      </div>
    </div>
  );
};

export default AgentChatbox;
