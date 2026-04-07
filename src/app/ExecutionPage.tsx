import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, ShieldCheck, 
  Activity, Play, FileJson, ArrowRightLeft, X, BookOpen
} from 'lucide-react';
import AppShell from '../components/AppShell';
import NavHeader from '../components/NavHeader';
import RoutingBanner from '../features/execution/RoutingBanner';
import { useStore } from '../store/useStore';
import './Workspace.css';

// --- TYPES & INTERFACES ---

interface AIPayload {
  id: string | number;
  agent: string;
  role: 'user' | 'assistant';
  content: string;
  isThought?: boolean;
}

interface Packet {
  id: string | number;
  time: string;
  src: string;
  dst: string;
  proto: string;
  info: string;
  details: {
    method?: string;
    path?: string;
    status?: number;
    toolName?: string;
    payload?: unknown;
    [key: string]: unknown;
  };
}

type WebSocketMessageType = 'ai_payload' | 'llm_thought' | 'network_pcap' | 'workflow_complete' | 'routing_decision';

interface WebSocketMessage {
  type: WebSocketMessageType;
  data: unknown;
}

const ExecutionPage: React.FC = () => {
  const { setMatchedSkillId, setSkillLibraryOpen } = useStore();
  const [input, setInput] = useState('Connect my new embodied agent to a high-reliability subnet.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [aiPayloads, setAiPayloads] = useState<AIPayload[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);

  const payloadRef = useRef<HTMLDivElement>(null);
  const pcapRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => { payloadRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiPayloads]);
  useEffect(() => { pcapRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [packets]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('[WS] Cleanup: Closing WebSocket on unmount');
        socketRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const msg: WebSocketMessage = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'routing_decision': {
          const { skillId } = msg.data;
          setMatchedSkillId(skillId);
          break;
        }

        case 'ai_payload': {
          const { agent, role, content } = msg.data;
          setAiPayloads(prev => {
            // 1. User roles always start a new block
            if (role === 'user') {
              return [...prev, { id: crypto.randomUUID(), agent, role, content }];
            }

            // 2. For assistant, check if the absolute last message is an update target
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.agent === agent) {
              // If exact match, ignore
              if (last.content === content) return prev;

              // If it's a streaming update (new content starts with old content), update it
              if (content.startsWith(last.content)) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  content: content,
                  isThought: false // Final payloads usually aren't thoughts
                };
                return updated;
              }
            }

            // 3. Otherwise, it's a new message (or interleaved by a packet)
            return [...prev, {
              id: crypto.randomUUID(),
              agent,
              role,
              content
            }];
          });
          break;
        }
        
        case 'llm_thought': {
          const { agent, chunk } = msg.data;
          setAiPayloads(prev => {
            const last = prev[prev.length - 1];
            
            // Only append to the last message if it's the same agent turn
            if (last && last.role === 'assistant' && last.agent === agent) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + chunk,
                isThought: true
              };
              return updated;
            }

            // New block for new thought stream
            return [...prev, {
              id: crypto.randomUUID(),
              agent,
              role: 'assistant',
              content: chunk,
              isThought: true
            }];
          });
          break;
        }

        case 'network_pcap': {
          const { source, destination, protocol, info, details } = msg.data;
          setPackets(prev => [...prev, {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            src: source,
            dst: destination,
            proto: protocol,
            info,
            details
          }]);
          break;
        }

        case 'workflow_complete': {
          console.log('[WS] Handler: Workflow complete');
          setProgress(100);
          setIsProcessing(false);
          if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
          }
          break;
        }

        default:
          console.warn('[WS] Handler: Unknown type:', msg.type);
      }
    } catch (err) {
      console.error('[WS] Error parsing message:', err);
    }
  };

  const handleExecuteIntent = () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setMatchedSkillId(null);
    setAiPayloads([]);
    setPackets([]);
    setSelectedPacket(null);
    setProgress(0);

    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket = new WebSocket('ws://localhost:8080/v1/intents/stream');
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'execute_intent',
        data: {
          intent: input,
          scenarioId: 'ACN'
        }
      }));
    };

    socket.onmessage = handleWebSocketMessage;

    socket.onerror = (error) => {
      console.error('[WS] Event: Error', error);
      setIsProcessing(false);
    };

    socket.onclose = () => {
      setIsProcessing(false);
    };
  };

  const header = <NavHeader />;

  return (
    <AppShell
      header={header}
      mainContent={
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', background: '#f1f5f9', overflow: 'hidden' }}>
          
          {/* CONTROL BAR */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 10, flexShrink: 0 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 0.75rem' }}>
              <Terminal size={14} style={{ color: '#94a3b8' }} />
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.85rem', padding: '0.5rem 0', outline: 'none' }}
                placeholder="Enter intent..."
              />
            </div>
            <button
              onClick={() => setSkillLibraryOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <BookOpen size={14} />
              Skill Library
            </button>
            <button 
              onClick={handleExecuteIntent}
              disabled={isProcessing}
              style={{ 
                background: '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '0.5rem 1.25rem', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: isProcessing ? 0.7 : 1
              }}
            >
              {isProcessing ? <Activity size={14} className="animate-spin" /> : <Play size={14} />}
              Execute Intent
            </button>
            <div style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '99px', border: '1px solid #a7f3d0' }}>Live API Mode</div>
          </div>

          <RoutingBanner isProcessing={isProcessing} />

          {/* PROGRESS BAR */}
          {isProcessing && (
            <div style={{ height: '2px', background: '#e2e8f0', width: '100%', flexShrink: 0 }}>
              <div style={{ height: '100%', background: '#3b82f6', transition: 'width 0.3s ease', width: progress === 100 ? '100%' : '40%' }} />
            </div>
          )}

          {/* MONITORING VIEW */}
          <div style={{ flex: 1, display: 'flex', gap: '1rem', padding: '1rem', overflow: 'hidden', minHeight: 0 }}>
            
            {/* LLM PAYLOADS */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <FileJson size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>LLM API Payloads (JSON)</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', minHeight: 0 }}>
                {aiPayloads.length === 0 && !isProcessing && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Waiting for AI inference...</div>}
                {aiPayloads.map((p) => (
                  <div key={p.id} style={{ 
                    border: p.role === 'user' ? '1px solid #bfdbfe' : '1px solid #ddd6fe', 
                    borderRadius: '8px', 
                    background: p.role === 'user' ? '#fff' : 'rgba(237, 233, 254, 0.3)',
                    overflow: 'hidden',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}>
                    <div style={{ 
                      padding: '0.25rem 0.75rem', 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      borderBottom: p.role === 'user' ? '1px solid #dbeafe' : '1px solid #ddd6fe',
                      background: p.role === 'user' ? '#eff6ff' : '#ede9fe',
                      color: p.role === 'user' ? '#1d4ed8' : '#6d28d9',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{p.role === 'user' ? 'Request' : 'Response'} — {p.agent}</span>
                      {p.isThought && <span style={{ color: '#9333ea' }}>THOUGHT</span>}
                    </div>
                    <pre style={{ margin: 0, padding: '0.75rem', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#334155' }}>
                      {p.content}
                    </pre>
                  </div>
                ))}
                <div ref={payloadRef} />
              </div>
            </div>

            {/* PCAP MONITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', height: '100%' }}>
              
              {/* PCAP TABLE */}
              <div style={{ flex: selectedPacket ? 1 : 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'flex 0.3s ease', minHeight: 0 }}>
                <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRightLeft size={14} style={{ color: '#64748b' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Simulated Network Traffic (PCAP)</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Double-click for details</span>
                </div>
                
                {/* TABLE HEADER */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 0.75rem', fontSize: '11px', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                  <div style={{ gridColumn: 'span 2' }}>Time</div>
                  <div style={{ gridColumn: 'span 2' }}>Source</div>
                  <div style={{ gridColumn: 'span 2' }}>Dest</div>
                  <div style={{ gridColumn: 'span 2' }}>Proto</div>
                  <div style={{ gridColumn: 'span 4' }}>Info</div>
                </div>

                {/* TABLE BODY */}
                <div style={{ flex: 1, overflowY: 'auto', background: '#fff', fontSize: '11px', fontFamily: 'monospace', minHeight: 0 }}>
                  {packets.length === 0 && !isProcessing && <div style={{ padding: '1rem', color: '#94a3b8', fontStyle: 'italic' }}>Listening for signaling traffic...</div>}
                  {packets.map((pkt, i) => {
                    const isSelected = selectedPacket?.id === pkt.id;
                    return (
                      <div 
                        key={pkt.id} 
                        onDoubleClick={() => setSelectedPacket(pkt)}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(12, 1fr)', 
                          gap: '0.5rem', 
                          padding: '0.4rem 0.75rem', 
                          borderBottom: '1px solid #f1f5f9', 
                          cursor: 'pointer',
                          background: isSelected ? '#2563eb' : (i % 2 === 0 ? '#f8fafc' : '#fff'),
                          color: isSelected ? '#fff' : '#1e293b'
                        }}
                      >
                        <div style={{ gridColumn: 'span 2', color: isSelected ? '#bfdbfe' : '#64748b' }}>{pkt.time}</div>
                        <div style={{ gridColumn: 'span 2', fontWeight: 700, color: isSelected ? '#fff' : '#2563eb' }}>{pkt.src}</div>
                        <div style={{ gridColumn: 'span 2', fontWeight: 700, color: isSelected ? '#fff' : '#059669' }}>{pkt.dst}</div>
                        <div style={{ gridColumn: 'span 2', color: isSelected ? '#bfdbfe' : '#64748b' }}>{pkt.proto}</div>
                        <div style={{ gridColumn: 'span 4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkt.info}</div>
                      </div>
                    );
                  })}
                  <div ref={pcapRef} />
                </div>
              </div>

              {/* PACKET DETAILS */}
              {selectedPacket && (
                <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', minHeight: 0 }}>
                  <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={14} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Packet Details: Frame {packets.findIndex(p => p.id === selectedPacket.id) + 1}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedPacket(null)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '2px', borderRadius: '4px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
                    {Object.entries(selectedPacket.details).map(([layer, data], idx) => (
                      <details key={idx} open style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', listStyle: 'none' }}>
                          <span style={{ marginRight: '0.5rem' }}>▸</span>{layer}
                        </summary>
                        <div style={{ padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderLeft: '1px solid #e2e8f0', marginLeft: '0.5rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      }
    />
  );
};

export default ExecutionPage;
