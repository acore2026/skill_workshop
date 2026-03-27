import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Bot, ChevronDown, ChevronRight, Loader2, PanelLeftClose, PanelLeftOpen, Send, Terminal, Trash2, User } from 'lucide-react';
import { requestBackendHealth } from '../../lib/api';
import type { ChatMessage } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import './AgentChatbox.css';

interface AgentChatboxProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const getStreamingMarkdownParts = (content: string) => {
  if (!content) {
    return { stable: '', tail: '' };
  }

  const fenceMatches = content.match(/```/g) ?? [];
  if (fenceMatches.length % 2 === 1) {
    const lastFenceIndex = content.lastIndexOf('```');
    return {
      stable: content.slice(0, lastFenceIndex).trimEnd(),
      tail: content.slice(lastFenceIndex),
    };
  }

  if (content.endsWith('\n\n') || content.endsWith('\n')) {
    return { stable: content.trimEnd(), tail: '' };
  }

  const lastParagraphBreak = content.lastIndexOf('\n\n');
  if (lastParagraphBreak >= 0) {
    return {
      stable: content.slice(0, lastParagraphBreak).trimEnd(),
      tail: content.slice(lastParagraphBreak).trimStart(),
    };
  }

  return { stable: '', tail: content };
};

const AgentChatbox: React.FC<AgentChatboxProps> = ({ collapsed, onToggleCollapse }) => {
  const gamingExamplePrompt = 'Enable Turbo Mode for Gaming';
  const [input, setInput] = useState('');
  const [backendHealth, setBackendHealth] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    addMessage,
    clearMessages,
    generationModel,
    setGenerationModel,
    appState,
    setAppState,
    applyAgentPrompt,
  } = useStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      setBackendHealth((current) => (current === 'online' ? current : 'checking'));
      try {
        await requestBackendHealth();
        if (!cancelled) {
          setBackendHealth('online');
        }
      } catch {
        if (!cancelled) {
          setBackendHealth('offline');
        }
      }
    };

    void checkHealth();

    const intervalId = window.setInterval(() => {
      void checkHealth();
    }, 15000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (!modelMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [modelMenuOpen]);

  const currentModelLabel = generationModel === 'kimi-k2.5' ? 'kimi-k2.5' : 'Qwen3-32B';
  const currentModelHealthy = generationModel === 'qwen3-32b' || backendHealth === 'online';

  const submitPrompt = async (rawPrompt: string) => {
    if (!rawPrompt.trim() || appState === 'generating') {
      return;
    }

    const prompt = rawPrompt.trim();
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
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      await applyAgentPrompt(prompt);
    } catch (error) {
      console.error('Agent Chat Error:', error);
      setAppState('error');
    }
  };

  const handleSend = async () => {
    await submitPrompt(input);
    setInput('');
  };

  const handleExamplePrompt = async () => {
    await submitPrompt(gamingExamplePrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`agent-chatbox ${collapsed ? 'is-collapsed' : ''}`}>
      {collapsed ? (
        <button type="button" className="chat-collapsed-rail" onClick={onToggleCollapse}>
          <Bot size={18} />
          <span>Skill Generator</span>
          <ChevronRight size={16} />
        </button>
      ) : (
        <>
      <div className="chat-header">
        <div className="header-info">
          <Bot size={16} className="bot-icon" />
          <span>Skill Generator</span>
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-header-toggle"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand skill generator' : 'Collapse skill generator'}
            aria-label={collapsed ? 'Expand skill generator' : 'Collapse skill generator'}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          <button className="clear-btn" onClick={clearMessages} title="Clear history">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="messages-container" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-chat">
              <Bot size={32} className="empty-icon" />
              <h3>Start With A Skill Idea</h3>
              <p>Describe the flow you want to create, and your agent will help turn it into a skill.</p>
              <button type="button" className="example-prompt-btn" onClick={handleExamplePrompt}>
                Example: {gamingExamplePrompt}
              </button>
            </motion.div>
          )}

          {messages.map((msg) => (
            (() => {
              if (msg.streaming && !msg.content.trim()) {
                return null;
              }
              const streamingParts = msg.streaming ? getStreamingMarkdownParts(msg.content) : null;
              if (msg.displayType === 'status') {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="message-status-row"
                  >
                    <span className="message-status-beacon" />
                    <span className="message-status-text">{msg.content}</span>
                    <span className="message-status-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                );
              }
              return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message-bubble-wrapper ${msg.role}`}
            >
              <div className="message-avatar">{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
              <div className="message-bubble">
                <div className="message-content">
                  {msg.streaming ? (
                    <>
                      {streamingParts?.stable ? <ReactMarkdown>{streamingParts.stable}</ReactMarkdown> : null}
                      {streamingParts?.tail ? <div className="message-streaming-text">{streamingParts.tail}</div> : null}
                    </>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>

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

                {msg.skillInstalls && msg.skillInstalls.length > 0 && (
                  <div className="chat-telemetry">
                    <div className="telemetry-header">
                      <Terminal size={10} />
                      <span>Skill Install</span>
                    </div>
                    <div className="telemetry-items">
                      {msg.skillInstalls.map((skill, index) => (
                        <div key={index} className="telemetry-pill">
                          {skill.name}@{skill.version}
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
              );
            })()
          ))}

          {appState === 'generating' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="message-bubble-wrapper assistant">
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
        <div className="chat-input-topbar">
          <div className="model-menu" ref={modelMenuRef}>
            <button
              type="button"
              className="model-menu-trigger"
              onClick={() => setModelMenuOpen((current) => !current)}
              disabled={appState === 'generating'}
            >
              <span className={`model-status-dot ${currentModelHealthy ? 'is-green' : 'is-red'}`} />
              <span className="model-menu-value">{currentModelLabel}</span>
              <ChevronDown size={14} className={`model-menu-chevron ${modelMenuOpen ? 'is-open' : ''}`} />
            </button>
            {modelMenuOpen && (
              <div className="model-menu-popover">
                <button
                  type="button"
                  className={`model-menu-item ${generationModel === 'kimi-k2.5' ? 'is-active' : ''}`}
                  onClick={() => {
                    setGenerationModel('kimi-k2.5');
                    setModelMenuOpen(false);
                  }}
                >
                  <span className={`model-status-dot ${backendHealth === 'online' ? 'is-green' : 'is-red'}`} />
                  <span>kimi-k2.5</span>
                </button>
                <button
                  type="button"
                  className={`model-menu-item ${generationModel === 'qwen3-32b' ? 'is-active' : ''}`}
                  onClick={() => {
                    setGenerationModel('qwen3-32b');
                    setModelMenuOpen(false);
                  }}
                >
                  <span className="model-status-dot is-green" />
                  <span>Qwen3-32B</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your skill creation agent..."
            rows={2}
            disabled={appState === 'generating'}
          />
          <button className="send-btn" onClick={handleSend} disabled={!input.trim() || appState === 'generating'}>
            {appState === 'generating' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AgentChatbox;
