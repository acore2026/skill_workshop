import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import type { ChatMessage, SkillInstall, ToolCall } from '../../store/useStore';
import { generateMockDocument } from '../../mocks/generator';
import type { SkillDocument } from '../../schemas/skill';
import { v4 as uuidv4 } from 'uuid';
import { Send, User, Bot, Loader2, RefreshCcw, Trash2, Terminal, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AgentChatbox.css';

const AgentChatbox: React.FC = () => {
  const [input, setInput] = useState('');
  const { messages, addMessage, clearMessages, setDocument, setAppState, appState } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || appState === 'generating') return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');
    setAppState('generating');

    // Simulate Agent API Call
    try {
      const response = await simulateAgentApi(input);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I've mapped your intent to an Agentic Skill Profile for: **${input}**. \n\nI've generated a Three-Stage Execution Pipeline with Service Directives. You can now validate the configuration or run a mock AgenticService-URI simulation in the orchestration dashboard.`,
        timestamp: new Date().toISOString(),
        documentId: response.document.meta.id,
        toolCalls: response.toolCalls,
        skillInstalls: response.skillInstalls,
      };

      addMessage(assistantMessage);
      setDocument(response.document);
      setAppState('draft_ready');
    } catch (error) {
      console.error('Agent API Error:', error);
      setAppState('error');
    }
  };

  // Simulated API response for real-world API ready structure
  const simulateAgentApi = async (prompt: string) => {
    return new Promise<{ 
      content: string, 
      document: SkillDocument,
      toolCalls: ToolCall[],
      skillInstalls: SkillInstall[]
    }>((resolve) => {
      setTimeout(() => {
        const doc = generateMockDocument(prompt);
        resolve({
          content: `I've analyzed your intent and generated an Agentic Skill Profile. I've orchestrated the necessary Service Directives to fulfill the request.`,
          document: doc,
          toolCalls: [
            { name: 'Nacrf_SkillDiscovery', args: { required_skill: prompt } },
            { name: 'Nnrf_NFDiscovery', args: { capability: 'semantic_match' } }
          ],
          skillInstalls: [
            { name: 'mcp://skill/analytics/local-inference', version: '1.0.0' },
            { name: 'mcp://skill/reliability/path-diversity', version: '2.0.0' }
          ]
        });
      }, 2000);
    });
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
          <span>Agentic AI Host Function (AAIHF)</span>
        </div>
        <button className="clear-btn" onClick={clearMessages} title="Clear history">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="messages-container" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-chat"
            >
              <Bot size={32} className="empty-icon" />
              <h3>Semantic Skill Discovery</h3>
              <p>State your high-level intent to generate an Agentic Skill Profile and orchestrate a Three-Stage Execution Pipeline.</p>
            </motion.div>
          )}
          
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message-bubble-wrapper ${msg.role}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="message-bubble">
                <div className="message-content">
                  {msg.content}
                </div>

                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="chat-telemetry">
                    <div className="telemetry-header">
                      <Terminal size={10} />
                      <span>Tool Calls</span>
                    </div>
                    <div className="telemetry-items">
                      {msg.toolCalls.map((tc, i) => (
                        <div key={i} className="telemetry-pill">
                          {tc.name}(...)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.skillInstalls && msg.skillInstalls.length > 0 && (
                  <div className="chat-telemetry">
                    <div className="telemetry-header">
                      <Cpu size={10} />
                      <span>Skill Installs</span>
                    </div>
                    <div className="telemetry-items">
                      {msg.skillInstalls.map((si, i) => (
                        <div key={i} className="telemetry-pill accent">
                          {si.name}@{si.version}
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="message-bubble-wrapper assistant"
            >
              <div className="message-avatar">
                <Bot size={14} />
              </div>
              <div className="message-bubble loading">
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking...</span>
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
            placeholder="Send a message..."
            rows={1}
            disabled={appState === 'generating'}
          />
          <button 
            className="send-btn" 
            onClick={handleSend}
            disabled={!input.trim() || appState === 'generating'}
          >
            {appState === 'generating' ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="input-footer">
          Generative Process Dashboard v1.0
        </div>
      </div>
    </div>
  );
};

export default AgentChatbox;
