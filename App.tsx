
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Activity, 
  Terminal as TerminalIcon, 
  Database, 
  Cpu, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  Image as ImageIcon,
  ChevronRight,
  Zap,
  Sparkles,
  Search,
  Sliders,
  Wrench,
  TrendingUp,
  TrendingDown,
  Layers,
  FileSearch,
  Handshake,
  ToggleLeft,
  ToggleRight,
  Cpu as CpuIcon,
  ChevronUp,
  ChevronDown,
  X,
  Shield,
  Clock,
  MapPin,
  MessageSquareCode,
  ArrowRight,
  Video,
  Bot,
  MessageCircle,
  Send,
  User
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { AgentStatus, LogEntry, AssetHealth, LicensingDeal, GroundingSource } from './types';

// --- Function Declarations for AI Orchestration ---
const controlFunctions: FunctionDeclaration[] = [
  {
    name: 'update_system_config',
    parameters: {
      type: Type.OBJECT,
      description: 'Update agent system parameters like risk, depth, core engine type or sync toggle.',
      properties: {
        risk: { type: Type.NUMBER, description: 'Risk tolerance percentage (0-100)' },
        depth: { type: Type.NUMBER, description: 'Search depth in Light Years (10-100)' },
        coreType: { type: Type.STRING, enum: ['STANDARD', 'TURBO'], description: 'The processing engine type' },
        autoSync: { type: Type.BOOLEAN, description: 'Toggle automatic telemetry synchronization' }
      }
    }
  },
  {
    name: 'trigger_scout',
    parameters: {
      type: Type.OBJECT,
      description: 'Initiate a new scouting cycle for game assets.',
      properties: {
        focus: { type: Type.STRING, description: 'Optional specific focus for the scout (e.g. cybernetic wings, neon textures)' }
      }
    }
  },
  {
    name: 'heal_sector',
    parameters: {
      type: Type.OBJECT,
      description: 'Initiate repair on a specific grid sector or all critical sectors.',
      properties: {
        sectorName: { type: Type.STRING, description: 'Name of the sector to repair. If omitted, repairs all criticals.' }
      }
    }
  }
];

// --- Sub-Components ---

const StatCard = ({ title, value, icon: Icon, color, subValue, trend }: { title: string, value: string | number, icon: any, color: string, subValue?: string, trend?: 'up' | 'down' | 'stable' }) => (
  <div className="glass-panel p-5 rounded-3xl flex items-center gap-5 group hover:border-emerald-400 transition-all duration-700 shadow-[0_0_30px_rgba(0,255,136,0.02)] relative overflow-hidden">
    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon className="w-16 h-16 text-white" />
    </div>
    <div className={`p-4 rounded-2xl ${color} shadow-2xl group-hover:scale-110 transition-transform duration-500 border border-white/5 relative z-10`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="relative z-10 flex-1">
      <div className="flex items-center justify-between">
        <p className="text-emerald-900 text-[10px] font-black uppercase tracking-[0.2em]">{title}</p>
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400 animate-bounce" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500 animate-bounce" />}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors tabular-nums">{value}</p>
        {subValue && <span className="text-[10px] text-emerald-700 font-bold">{subValue}</span>}
      </div>
    </div>
  </div>
);

const WaveformVisualizer = ({ status }: { status: AgentStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = status === AgentStatus.ERROR ? '#e11d48' : '#00ff88';
      
      const amplitude = status === AgentStatus.IDLE ? 5 : status === AgentStatus.THINKING ? 20 : 35;
      const frequency = status === AgentStatus.IDLE ? 0.02 : status === AgentStatus.THINKING ? 0.08 : 0.15;
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * frequency + offset) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      offset += 0.1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status]);

  return <canvas ref={canvasRef} width={200} height={80} className="w-full h-20 opacity-40" />;
};

// --- Main Application ---

const App: React.FC = () => {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [telemetry, setTelemetry] = useState({ 
    revenue: 812.45, 
    nodes: 16384, 
    revenueTrend: 'stable' as 'up' | 'down' | 'stable',
    nodesTrend: 'stable' as 'up' | 'down' | 'stable'
  });
  
  const [config, setConfig] = useState({ 
    risk: 75, 
    depth: 40, 
    autoSync: true,
    coreType: 'TURBO' as 'STANDARD' | 'TURBO',
    useHoloScout: false
  });

  const [scoutPhase, setScoutPhase] = useState(0); 
  const [terminalCommand, setTerminalCommand] = useState('');
  const [strategyPrompt, setStrategyPrompt] = useState('');
  const [isOracleActive, setIsOracleActive] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof LicensingDeal | null, direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello Operative. I am the DDS Grid Assistant. How can I help you manage your autonomous assets today?" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);
  
  const [selectedAsset, setSelectedAsset] = useState<AssetHealth | null>(null);
  const [deals, setDeals] = useState<LicensingDeal[]>([
    { id: '1', gameTitle: 'MATRIX RUNNER', asset: 'BIO-SYNTH CORE', price: 0.35, status: 'Signed', previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&h=200&fit=crop' },
    { id: '2', gameTitle: 'TEAL SECTOR', asset: 'CYBER MESH V9', price: 0.18, status: 'Pending', previewUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=200&h=200&fit=crop' },
    { id: '3', gameTitle: 'NEON DRIFT', asset: 'CORE V3', price: 0.45, status: 'Negotiating', previewUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=200&h=200&fit=crop' }
  ]);

  const [assets, setAssets] = useState<AssetHealth[]>([
    { name: 'Neural Link', replicationFactor: 6, threshold: 5, status: 'healthy' },
    { name: 'Core Processor', replicationFactor: 2, threshold: 5, status: 'critical' },
    { name: 'Teal Reactor', replicationFactor: 8, threshold: 5, status: 'healthy' },
    { name: 'Bio-Shield', replicationFactor: 4, threshold: 5, status: 'critical' },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, level: LogEntry['level'], source: LogEntry['source']) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
      source
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const updateConfig = useCallback((updates: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    const key = Object.keys(updates)[0];
    const value = Object.values(updates)[0];
    addLog(`System recalibrated: ${key.toUpperCase()} modified to ${value}`, "success", "Brain");
  }, [addLog]);

  // Telemetry Loop
  useEffect(() => {
    if (!config.autoSync) return;
    const interval = setInterval(() => {
      setTelemetry(prev => {
        const revInc = Math.random() > 0.85 ? 0.01 : 0;
        return {
          ...prev,
          revenue: prev.revenue + revInc,
          revenueTrend: revInc > 0 ? 'up' : 'stable'
        };
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [config.autoSync]);

  const runScoutingCycle = useCallback(async (customPrompt?: string) => {
    setStatus(AgentStatus.THINKING);
    setScoutPhase(5);
    setGroundingSources([]);
    addLog(`Initiating autonomous scout cycle...`, "info", "System");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      setScoutPhase(20);
      addLog("Deep-scanning market vectors...", "search", "Search");
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: customPrompt || `Identify top 2025 game asset trends for neon-cyberpunk visuals.`,
        config: { tools: [{ googleSearch: {} }] }
      });

      const trend = searchResponse.text || "Neon Artifact";
      setScoutPhase(45);
      
      if (config.useHoloScout) {
        addLog("Compiling VEO-3.1 Holographic Motion Data...", "info", "Limbs");
        setStatus(AgentStatus.EXECUTING);
        
        const videoOp = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: `A 3D hologram of a ${trend} game item, teal energy glowing, dark cyberpunk background.`,
          config: { resolution: '720p', aspectRatio: '16:9' }
        });

        let operation = videoOp;
        while (!operation.done) {
          await new Promise(r => setTimeout(r, 8000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
          setScoutPhase(prev => Math.min(prev + 5, 90));
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        const videoUrl = `${videoUri}&key=${process.env.API_KEY}`;
        
        setDeals(prev => [{
          id: Date.now().toString(),
          gameTitle: 'HOLO-SYNC ' + (deals.length + 1),
          asset: `${trend.split(' ')[0]} VOID`,
          price: 1.50 + (Math.random() * 0.5),
          status: 'Pending',
          previewUrl: videoUrl,
          marketTrend: trend
        }, ...prev]);
      } else {
        addLog("Drafting high-fidelity static mesh...", "info", "Limbs");
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `A futuristic 3D ${trend} asset, neon teal and emerald colors.` }] }
        });
        
        let previewUrl = '';
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) previewUrl = `data:image/png;base64,${part.inlineData.data}`;
        }

        setDeals(prev => [{
          id: Date.now().toString(),
          gameTitle: 'CORE UNIT ' + (deals.length + 1),
          asset: `${trend.split(' ')[0]} MK-I`,
          price: 0.45 + (Math.random() * 0.2),
          status: 'Pending',
          previewUrl,
          marketTrend: trend
        }, ...prev]);
      }

      setScoutPhase(100);
      setStatus(AgentStatus.IDLE);
      addLog("Scout Cycle Successful. Asset logged to catalog.", "success", "System");
      setTimeout(() => setScoutPhase(0), 2000);
    } catch (err) {
      setStatus(AgentStatus.ERROR);
      addLog(`Cycle Failed: ${err instanceof Error ? err.message : 'Unknown uplink error'}`, "error", "System");
    }
  }, [config.useHoloScout, deals.length, addLog]);

  const healAsset = useCallback((name: string) => {
    setAssets(prev => prev.map(a => a.name === name ? { ...a, status: 'healing' } : a));
    addLog(`Repairing sector ${name}...`, "warning", "Limbs");
    setTimeout(() => {
      setAssets(prev => prev.map(a => a.name === name ? { ...a, replicationFactor: a.threshold + 2, status: 'healthy' } : a));
      addLog(`Sector ${name} integrity restored to 100%.`, "success", "Limbs");
    }, 2000);
  }, [addLog]);

  const healAllCritical = useCallback(() => {
    const criticals = assets.filter(a => a.status === 'critical');
    if (criticals.length === 0) {
      addLog("Scan complete: No critical sectors detected.", "info", "System");
      return;
    }
    criticals.forEach(c => healAsset(c.name));
  }, [assets, healAsset, addLog]);

  // Proactive Agent Reflex: Auto-healing logic
  useEffect(() => {
    if (!config.autoSync) return;
    
    const reflexInterval = setInterval(() => {
      const criticals = assets.filter(a => a.status === 'critical');
      if (criticals.length > 0 && status === AgentStatus.IDLE) {
        const target = criticals[0];
        addLog(`[Reflex] Autonomous healing triggered for sector ${target.name}.`, "thought", "Brain");
        healAsset(target.name);
      }
    }, 15000);

    return () => clearInterval(reflexInterval);
  }, [assets, config.autoSync, status, addLog, healAsset]);

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCommand.trim() || status !== AgentStatus.IDLE) return;
    
    const cmd = terminalCommand.trim();
    setTerminalCommand('');
    addLog(`> ${cmd}`, "info", "System");
    setStatus(AgentStatus.THINKING);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: cmd,
        config: { 
          tools: [{ functionDeclarations: controlFunctions }],
          systemInstruction: "You are the DDS Agent Core. Parse user commands. If they want to change settings, repair things, or scout, use functions. Otherwise, respond concisely as a technical AI agent."
        }
      });

      const toolCalls = response.functionCalls;
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          if (call.name === 'update_system_config') {
            updateConfig(call.args as any);
          } else if (call.name === 'trigger_scout') {
            runScoutingCycle((call.args as any).focus);
          } else if (call.name === 'heal_sector') {
            const sector = (call.args as any).sectorName;
            if (sector) healAsset(sector);
            else healAllCritical();
          }
          addLog(`Function executed: ${call.name}`, "success", "Reflection");
        }
      } else {
        addLog(response.text || "Command processed.", "thought", "Brain");
      }
    } catch (e) {
      addLog("Neural Uplink Malfunction.", "error", "System");
    } finally {
      setStatus(AgentStatus.IDLE);
    }
  };

  const handleOracleConsult = async () => {
    if (!strategyPrompt.trim()) return;
    setIsOracleActive(true);
    addLog(`Strategic Consult: ${strategyPrompt}`, "info", "System");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: strategyPrompt,
        config: { 
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are the Strategic Oracle. Provide 2025 market insights grounded in search data."
        }
      });
      
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const extracted = sources.filter(c => c.web).map(c => ({ title: c.web.title, uri: c.web.uri }));
      setGroundingSources(extracted as GroundingSource[]);
      
      addLog(response.text || "Analysis synthesized.", "success", "Reflection");
      setStrategyPrompt('');
    } catch (e) {
      addLog("Oracle connection unstable.", "error", "System");
    } finally {
      setIsOracleActive(false);
    }
  };

  // Chatbot Logic
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: "You are the DDS Grid Assistant, a friendly but professional AI companion for the Digital Data Solutions platform. You help users understand the grid, their assets, and market trends. Use technical but accessible language. Keep responses concise but helpful."
          }
        });
      }

      const response = await chatRef.current.sendMessage({ message: userMessage });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.text || "I apologize, my neural link flickered. Could you repeat that?" }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Error: Connection to Grid Assistant lost. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden max-h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-black/70 border-r border-emerald-900/30 p-8 flex flex-col gap-8 shrink-0 relative glass-panel overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-700 p-3 rounded-2xl shadow-[0_0_30px_rgba(0,255,136,0.3)] animate-neon">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-black text-3xl tracking-tighter text-white italic leading-none uppercase">DDS<span className="text-emerald-400">.LINK</span></h1>
            <p className="text-[9px] text-teal-700 font-black uppercase tracking-[0.4em] mt-1">Digital Data Solutions</p>
          </div>
        </div>

        <div className="relative z-10 border-y border-emerald-950/50 py-4 flex flex-col items-center">
          <p className="text-[8px] text-emerald-900 font-black uppercase tracking-[0.3em] mb-4">Neural Activity Pulse</p>
          <WaveformVisualizer status={status} />
        </div>

        <nav className="flex flex-col gap-2 relative z-10">
          <div className="px-4 py-2 text-[10px] font-black text-emerald-900 uppercase tracking-[0.4em]">Grid Control</div>
          <button className="flex items-center justify-between px-5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 font-black border border-emerald-500/30 group hover:bg-emerald-500/20 transition-all shadow-[0_0_15px_rgba(0,255,136,0.05)]">
            <div className="flex items-center gap-4">
              <Activity className="w-4 h-4 group-hover:animate-pulse" /> Monitor
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
          </button>
          <button className="flex items-center gap-4 px-5 py-3 rounded-2xl text-zinc-600 hover:bg-zinc-950 hover:text-teal-400 transition-all border border-transparent hover:border-teal-900/30">
            <Database className="w-4 h-4" /> Asset Hub
          </button>
        </nav>

        {/* Oracle Section */}
        <div className="relative z-10 space-y-4 pt-4 border-t border-emerald-950">
          <div className="px-4 py-1 text-[10px] font-black text-emerald-900 uppercase tracking-[0.4em] flex items-center gap-2">
            <MessageSquareCode className="w-3 h-3" /> Strategic Oracle
          </div>
          <div className="px-4 space-y-3">
             <textarea 
                value={strategyPrompt}
                onChange={(e) => setStrategyPrompt(e.target.value)}
                placeholder="Market consult..."
                className="w-full h-20 bg-zinc-950 border border-emerald-950 rounded-2xl p-3 text-xs text-emerald-200 placeholder-emerald-900 focus:outline-none focus:border-emerald-500 transition-all resize-none font-medium"
              ></textarea>
              <button 
                onClick={handleOracleConsult}
                disabled={isOracleActive || !strategyPrompt.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.1)]"
              >
                {isOracleActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Consult Core'}
              </button>
          </div>
        </div>

        {/* Protocol Module */}
        <div className="relative z-10 space-y-4 pt-4 border-t border-emerald-950 mt-auto">
          <div className="px-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Video className={`w-4 h-4 ${config.useHoloScout ? 'text-teal-400' : 'text-zinc-700'}`} />
              <span className={`text-[10px] font-black tracking-widest uppercase ${config.useHoloScout ? 'text-white' : 'text-emerald-900'}`}>Holo-Scout</span>
            </div>
            <button onClick={() => updateConfig({ useHoloScout: !config.useHoloScout })} className="transition-all">
               {config.useHoloScout ? <ToggleRight className="w-8 h-8 text-teal-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-800" />}
            </button>
          </div>
          <div className="px-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Zap className={`w-4 h-4 ${config.autoSync ? 'text-emerald-400' : 'text-zinc-700'}`} />
              <span className={`text-[10px] font-black tracking-widest uppercase ${config.autoSync ? 'text-white' : 'text-emerald-900'}`}>Reflex Core</span>
            </div>
            <button onClick={() => updateConfig({ autoSync: !config.autoSync })} className="transition-all">
               {config.autoSync ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-zinc-800" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto relative bg-transparent scroll-smooth custom-scrollbar">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16 relative">
          <div className="relative">
            <h2 className="text-5xl font-black text-white tracking-tighter italic text-neon-green uppercase">DDS COMMAND <span className="text-teal-400 text-3xl">V.1.2</span></h2>
            <div className="h-1 w-24 bg-emerald-500 mt-2 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></div>
            <div className="flex items-center gap-2 mt-4">
              <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] text-emerald-400 font-black uppercase tracking-widest">Autonomous Mode</div>
              <p className="text-emerald-900 font-black uppercase tracking-[0.3em] text-[10px]">Neural Agent Network</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => runScoutingCycle()}
              disabled={status !== AgentStatus.IDLE}
              className="group relative flex items-center gap-4 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 rounded-2xl font-black transition-all shadow-[0_0_40px_rgba(0,255,136,0.2)] overflow-hidden"
            >
              <Play className="w-4 h-4 relative z-10 fill-white text-white" /> 
              <span className="relative z-10 text-white uppercase tracking-[0.2em] text-xs">Manual Scout</span>
            </button>
            <button 
              onClick={healAllCritical}
              className="flex items-center gap-4 px-8 py-4 bg-zinc-950 hover:bg-zinc-900 rounded-2xl font-black border border-emerald-900/30 transition-all shadow-2xl"
            >
              <RefreshCw className={`w-4 h-4 text-teal-400 ${status === AgentStatus.EXECUTING ? 'animate-spin' : ''}`} /> 
              <span className="text-emerald-100 uppercase tracking-[0.2em] text-xs">Purge Faults</span>
            </button>
          </div>
        </header>

        {/* Scout Progress */}
        {scoutPhase > 0 && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-[10px] font-black text-emerald-400 tracking-[0.4em] italic uppercase">
                {scoutPhase < 100 ? 'Deep Grid Integration...' : 'Data Synthesis Finalized'}
              </span>
              <span className="text-[10px] font-black text-teal-800 tabular-nums">{scoutPhase}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-emerald-900/20">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,255,136,0.6)]"
                style={{ width: `${scoutPhase}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <StatCard title="Active Scans" value="1,248" icon={Activity} color="bg-emerald-600" />
          <StatCard title="Vault Flow" value={`$${telemetry.revenue.toFixed(2)}`} icon={CheckCircle2} color="bg-teal-700" trend={telemetry.revenueTrend} />
          <StatCard title="Critical Faults" value={assets.filter(a => a.status === 'critical').length} icon={AlertTriangle} color="bg-rose-950" />
          <StatCard title="Neural Nodes" value={telemetry.nodes} icon={Database} color="bg-zinc-900" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 mb-16">
          {/* Enhanced Neural Terminal */}
          <div className="xl:col-span-2 flex flex-col crt-container rounded-[2rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.9)] relative crt-scanlines min-h-[500px] border border-emerald-900/40">
            <div className="crt-vignette"></div>
            {status === AgentStatus.THINKING && (
              <>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse z-20"></div>
                <div className="thinking-particles"></div>
              </>
            )}
            <div className="bg-zinc-950/80 px-10 py-5 border-b border-emerald-900/30 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4 text-emerald-400 uppercase font-mono text-[10px] tracking-[0.5em] terminal-text font-black">
                <TerminalIcon className="w-4 h-4" /> Agent Core Terminal
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] text-emerald-900 font-bold uppercase tracking-widest">Secure Uplink</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_var(--neon-green)] animate-pulse"></div>
              </div>
            </div>
            
            <div ref={logContainerRef} className="p-10 flex-1 overflow-y-auto font-mono text-sm space-y-6 bg-transparent custom-scrollbar relative z-10">
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-emerald-950/5">
                  <Bot className="w-32 h-32 mb-6 opacity-10" />
                  <p className="font-black text-center uppercase tracking-[0.8em] text-[10px] italic">Awaiting Command Stream</p>
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-6 border-l-2 border-emerald-950/20 pl-6 group hover:border-emerald-500 transition-all duration-300">
                  <span className="text-emerald-950 shrink-0 text-[10px] mt-1 font-black tabular-nums tracking-tighter">[{log.timestamp}]</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-teal-900 mb-1 tracking-widest">{log.source}</span>
                    <p className={`leading-relaxed tracking-tight terminal-text ${
                      log.level === 'error' ? 'text-rose-500 font-black' : 
                      log.level === 'success' ? 'text-emerald-400' : 
                      log.level === 'thought' ? 'text-emerald-500/40 italic' : 
                      log.level === 'warning' ? 'text-amber-500' : 'text-emerald-50/80'
                    }`}>{log.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleTerminalSubmit} className="bg-zinc-950/95 p-6 border-t border-emerald-900/30 flex items-center gap-4 relative z-10">
              <span className="text-emerald-500 font-black font-mono tracking-widest text-xs terminal-text">AGENT:/></span>
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  placeholder="Ask core to scout, heal, or adjust settings..."
                  className="w-full bg-transparent border-none text-emerald-300 font-mono text-sm terminal-input placeholder-emerald-950/30"
                  disabled={status !== AgentStatus.IDLE}
                />
                {!terminalCommand && <div className="terminal-cursor absolute left-0 top-1/2 -translate-y-1/2"></div>}
                {terminalCommand && <div className="terminal-cursor" style={{ marginLeft: `${terminalCommand.length * 8.5}px`, position: 'absolute', top: '12px', left: '0px' }}></div>}
              </div>
            </form>
          </div>

          {/* Grid Sync / Sector Health */}
          <div className="glass-panel rounded-[2rem] p-10 shadow-2xl flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="w-32 h-32 text-emerald-400" />
            </div>
            <div className="flex items-center justify-between mb-10 relative z-10">
              <h3 className="font-black text-2xl flex items-center gap-4 italic text-white uppercase tracking-tighter">
                <Shield className="w-6 h-6 text-teal-400" /> Sector Health
              </h3>
              {config.autoSync && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-black animate-pulse">AUTONOMOUS</span>}
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {assets.map((asset, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-5 rounded-3xl border transition-all duration-500 group/item ${
                    asset.status === 'critical' ? 'bg-rose-950/20 border-rose-900/50 animate-critical-pulse' : 
                    asset.status === 'healing' ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-black/40 border-emerald-900/5 hover:border-emerald-500/30 hover:bg-black/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full transition-all duration-700 ${
                      asset.status === 'critical' ? 'bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.8)]' : 
                      asset.status === 'healing' ? 'bg-emerald-400 animate-spin' : 'bg-emerald-500 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                    }`}></div>
                    <div className="flex flex-col">
                      <span className="text-sm text-emerald-50 font-black uppercase italic tracking-tight">{asset.name}</span>
                      <span className="text-[10px] text-zinc-700 font-black uppercase tracking-widest mt-0.5">REPL: {asset.replicationFactor}/{asset.threshold}</span>
                    </div>
                  </div>
                  {asset.status === 'critical' && (
                    <button onClick={() => healAsset(asset.name)} className="p-2.5 bg-rose-600 hover:bg-rose-500 rounded-2xl text-white transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] active:scale-90">
                      <Wrench className="w-4 h-4" />
                    </button>
                  )}
                  {asset.status === 'healing' && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog */}
        <section className="glass-panel rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden mb-10 border border-emerald-900/10">
          <div className="px-12 py-10 border-b border-emerald-900/10 flex justify-between items-center bg-gradient-to-r from-emerald-950/10 to-transparent">
            <h3 className="font-black text-4xl text-white italic uppercase tracking-tighter text-neon-green">Asset Catalog</h3>
            <div className="flex gap-4">
               {deals.filter(d => d.previewUrl?.includes('key=')).length > 0 && (
                 <div className="flex items-center gap-3 px-6 py-3 bg-teal-500/5 border border-teal-500/10 rounded-2xl text-[10px] font-black text-teal-400 tracking-[0.3em]">
                   <Video className="w-4 h-4" /> HOLO-READY
                 </div>
               )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950/60 text-emerald-950 text-[10px] font-black uppercase tracking-[0.6em]">
                  <th className="px-12 py-8">Mesh Preview</th>
                  <th className="px-12 py-8">Identity / Unit</th>
                  <th className="px-12 py-8 text-center">Market Val</th>
                  <th className="px-12 py-8">Protocol State</th>
                  <th className="px-12 py-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5">
                {deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-emerald-950/5 transition-all duration-700 group">
                    <td className="px-12 py-10">
                      <div className="w-28 h-28 rounded-[2rem] bg-black border border-emerald-900/20 overflow-hidden shadow-2xl relative group-hover:border-emerald-500/40 transition-all duration-700 group-hover:scale-105">
                        {deal.previewUrl?.includes('mp4') || deal.previewUrl?.includes('key=') ? (
                          <video src={deal.previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
                        ) : (
                          <img src={deal.previewUrl} className="w-full h-full object-cover" alt={deal.asset} />
                        )}
                        {deal.previewUrl?.includes('key=') && (
                          <div className="absolute top-3 right-3 bg-teal-400 p-2 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.6)]">
                            <Sparkles className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      <p className="font-black text-white text-2xl uppercase italic group-hover:text-emerald-400 transition-colors tracking-tighter duration-500">{deal.gameTitle}</p>
                      <p className="text-[11px] text-teal-900 font-black uppercase mt-1 tracking-widest">{deal.asset}</p>
                    </td>
                    <td className="px-12 py-10 text-center font-mono font-black text-teal-400 text-3xl tracking-tighter tabular-nums text-neon-teal">${deal.price.toFixed(2)}</td>
                    <td className="px-12 py-10 uppercase font-black text-[11px] tracking-[0.4em] text-emerald-600 group-hover:text-emerald-400 transition-colors">{deal.status}</td>
                    <td className="px-12 py-10 text-right"><ChevronRight className="w-10 h-10 text-emerald-950 group-hover:text-emerald-400 transition-all duration-500 group-hover:translate-x-2" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* --- CHATBOT WIDGET --- */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
        {isChatOpen && (
          <div className="w-96 h-[550px] glass-panel rounded-[2.5rem] flex flex-col shadow-[0_32px_128px_rgba(0,0,0,0.8)] border border-teal-500/30 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            {/* Chat Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-teal-950/50 to-emerald-950/30 border-b border-teal-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 rounded-xl">
                  <Bot className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Grid Assistant</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] text-emerald-500 font-bold uppercase">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-black/40">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-xl shrink-0 ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-teal-500/10 text-teal-400'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 rounded-3xl text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20 rounded-tr-none' 
                        : 'bg-zinc-950/80 text-teal-50 border border-teal-500/10 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                      <Bot className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="p-4 rounded-3xl text-[10px] bg-zinc-950/80 text-teal-500/50 border border-teal-500/10 rounded-tl-none italic font-black uppercase tracking-widest">
                      Processing Data...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-6 bg-zinc-950/90 border-t border-teal-500/20 flex gap-3">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-black/40 border border-teal-500/20 rounded-2xl px-5 py-3 text-xs text-white placeholder-teal-900/50 focus:outline-none focus:border-teal-500/50 transition-all"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="p-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-20 rounded-2xl text-white transition-all active:scale-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Orb Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`group relative p-6 rounded-full shadow-[0_0_40px_rgba(0,229,255,0.3)] transition-all duration-500 active:scale-90 ${
            isChatOpen ? 'bg-rose-600 rotate-90 scale-110' : 'bg-gradient-to-tr from-teal-500 to-emerald-500 hover:scale-110'
          }`}
        >
          <div className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-20"></div>
          {isChatOpen ? (
            <X className="w-8 h-8 text-white relative z-10" />
          ) : (
            <MessageCircle className="w-8 h-8 text-white relative z-10" />
          )}
          
          {!isChatOpen && (
             <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-white rounded-full text-[10px] font-black text-black shadow-xl animate-bounce">
              AI
             </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default App;
