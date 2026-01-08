import React, { useState, useEffect } from 'react';

function App() {
  const [logs, setLogs] = useState([
    "Initializing Unbroken Chain Protocol...",
    "Monitoring Koii Network nodes...",
    "Establishing link to Kikokuryu-MS-7A34..."
  ]);

  // Simulates the agent finding data in real-time
  const runManualScan = () => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] SCANNING: Checking IPFS Gateways...`, ...prev]);
    
    setTimeout(() => {
      setLogs(prev => [`[${timestamp}] SUCCESS: GD Archive Genesis confirmed ONLINE.`, ...prev]);
    }, 1500);
  };

  return (
    <div style={{ backgroundColor: '#050505', color: '#00F0FF', minHeight: '100vh', padding: '40px', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '2px solid #00F0FF', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, letterSpacing: '3px' }}>SENTIENT GRID // COMMAND</h1>
        <p style={{ color: '#00FF41', fontSize: '0.9rem' }}>STATUS: NEURAL CORE ACTIVE</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Control Panel */}
        <section style={{ border: '1px solid #00F0FF', padding: '20px', background: 'rgba(0,240,255,0.05)' }}>
          <h3>CONTROLS</h3>
          <button 
            onClick={runManualScan}
            style={{ width: '100%', padding: '15px', backgroundColor: '#00F0FF', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
            MANUAL PATROL
          </button>
          <p style={{ fontSize: '0.8rem', color: '#888' }}>Last Archive Sync: Just Now</p>