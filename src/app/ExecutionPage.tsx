import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, ShieldCheck, 
  Activity, Play, FileJson, ArrowRightLeft, X
} from 'lucide-react';
import AppShell from '../components/AppShell';
import NavHeader from '../components/NavHeader';
import './Workspace.css';

// --- SCENARIOS & MOCK DATA ---
const SCENARIOS = {
  acn: {
    id: 'ACN',
    label: 'ACN (Embodied Agent)',
    intent: 'Connect my new embodied agent to a high-reliability subnet.',
    tools: ['Subscription_tool', 'Create_Or_Update_Subnet_Context_tool', 'Issue_Access_Token_tool', 'Validate_Access_Token_tool', 'Create_Subnet_PDUSession_tool'],
  }
};

// Generates fake Wireshark-style packet details
const generateMockDetails = (src: string, dst: string, _proto: string, _info: string, method?: string, path?: string, isResponse?: boolean) => {
  const baseDetails: any = {
    "Frame": "412 bytes on wire (3296 bits), 412 bytes captured (3296 bits)",
    "Ethernet II": `Src: 02:42:ac:11:00:02, Dst: 02:42:ac:11:00:03`,
    "Internet Protocol Version 4": `Src: 10.0.0.5 (${src}), Dst: 10.0.0.6 (${dst})`,
    "Transmission Control Protocol": `Src Port: ${isResponse ? '80' : '48152'}, Dst Port: ${isResponse ? '48152' : '80'}, Seq: 1, Ack: 1`,
  };

  if (isResponse) {
    return {
      ...baseDetails,
      "Hypertext Transfer Protocol 2": {
        "Stream": "1",
        "Header: :status": "200",
        "Header: content-type": "application/json"
      },
      "JavaScript Object Notation (application/json)": {
        "status": "success",
        "cause": "REQUEST_ACCEPTED",
        "timestamp": new Date().toISOString(),
        "data": {
          "authorized": true,
          "contextId": "ctx_9921_xyz"
        }
      }
    };
  } else {
    return {
      ...baseDetails,
      "Hypertext Transfer Protocol 2": {
        "Stream": "1",
        "Header: :method": method || "POST",
        "Header: :path": path || "/api/v1/resource",
        "Header: content-type": "application/json"
      },
      "JavaScript Object Notation (application/json)": {
        "ueId": "SUCI_12345",
        "servingNetwork": {
          "mcc": "310",
          "mnc": "410"
        },
        "sNssai": {
          "sst": 1,
          "sd": "000001"
        },
        "requestType": "INITIAL_REQUEST"
      }
    };
  }
};

interface AIPayload {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface Packet {
  id: number;
  time: string;
  src: string;
  dst: string;
  proto: string;
  info: string;
  details: any;
}

const ExecutionPage: React.FC = () => {
  const [input, setInput] = useState(SCENARIOS['acn'].intent);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Data stores
  const [aiPayloads, setAiPayloads] = useState<AIPayload[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  
  // Selected packet for the detail view
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);

  const payloadRef = useRef<HTMLDivElement>(null);
  const pcapRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logic
  useEffect(() => { payloadRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiPayloads]);
  useEffect(() => { pcapRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [packets]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- MAIN SIMULATION ENGINE ---
  const runSimulation = async () => {
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setAiPayloads([]);
    setPackets([]);
    setSelectedPacket(null);
    setProgress(0);

    // Helpers to populate view data
    const addPayload = (role: 'user' | 'assistant', content: string) => 
      setAiPayloads(p => [...p, { id: Date.now()+Math.random(), role, content }]);
    
    const addPacket = (src: string, dst: string, proto: string, info: string, details: any) => 
      setPackets(p => [...p, { id: Date.now()+Math.random(), time: new Date().toLocaleTimeString(), src, dst, proto, info, details }]);

    // 1. Init & Routing
    addPayload('user', `Categorize intent: "${input}"\nAvailable Agents: Connection, Compute, Sense.`);
    await sleep(800);
    addPayload('assistant', `{\n  "routeTo": "ConnectionAgent",\n  "confidence": 0.98,\n  "intentClass": "ACN"\n}`);
    await sleep(600);

    // 2. Connection Agent Execution
    const tools = SCENARIOS['acn'].tools;
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      
      // AI Thinking
      addPayload('user', `Current State: Step ${i}. Next action?`);
      await sleep(600);
      addPayload('assistant', `THOUGHT: Executing next step to fulfill intent.\nCALL: ${tool}`);
      await sleep(300);

      // Tool Execution (API)
      let method = 'POST', path = '/api/v1/tool/execute', dest = 'Core';
      if (tool.includes('Subscription')) { method = 'GET'; path = '/nudm-sdm/v2/sm-data'; dest = 'UDM'; }
      if (tool.includes('Auth') || tool.includes('Validate')) { method = 'POST'; path = '/nausf-auth/v1/ue-auth'; dest = 'AUSF'; }
      if (tool.includes('Context')) { method = 'PUT'; path = '/nsmf-pdusession/v1/sm-contexts'; dest = 'SMF'; }
      if (tool.includes('PDUSession')) { method = 'POST'; path = '/nupf-oam/v1/datapath'; dest = 'UPF'; }

      // Outgoing Request
      const reqInfo = `${method} ${path}`;
      const reqDetails = generateMockDetails('ConnAgent', dest, 'HTTP/2', reqInfo, method, path, false);
      addPacket('ConnAgent', dest, 'HTTP/2', reqInfo, reqDetails);
      await sleep(200);
      
      // Incoming Response
      const resInfo = `200 OK (Application/JSON)`;
      const resDetails = generateMockDetails(dest, 'ConnAgent', 'HTTP/2', resInfo, method, path, true);
      addPacket(dest, 'ConnAgent', 'HTTP/2', resInfo, resDetails);
      
      setProgress(((i + 1) / tools.length) * 100);
      await sleep(600);
    }

    setIsProcessing(false);
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
                placeholder="Enter intent (e.g. Connect my embodied agent...)"
              />
            </div>
            <button 
              onClick={runSimulation}
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
            <div style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '99px', border: '1px solid #a7f3d0' }}>Mock Execution Mode</div>
          </div>

          {/* PROGRESS BAR */}
          {isProcessing && (
            <div style={{ height: '2px', background: '#e2e8f0', width: '100%', flexShrink: 0 }}>
              <div style={{ height: '100%', background: '#3b82f6', transition: 'width 0.3s ease', width: `${progress}%` }} />
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
                {aiPayloads.length === 0 && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Waiting for AI inference...</div>}
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
                      color: p.role === 'user' ? '#1d4ed8' : '#6d28d9'
                    }}>
                      {p.role === 'user' ? 'Request Payload' : 'Response Payload'}
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
                  {packets.length === 0 && <div style={{ padding: '1rem', color: '#94a3b8', fontStyle: 'italic' }}>Listening for signaling traffic...</div>}
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
