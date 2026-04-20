"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, UserX, UserCheck, Play, Square, ListFilter, Info, ShieldAlert, LogOut } from 'lucide-react';

export default function IGApp() {
  const [sessionId, setSessionId] = useState('');
  const [nonFollowers, setNonFollowers] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, scanning, running
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const stopRef = useRef(false);

  // Load Whitelist from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ig_whitelist');
    if (saved) setWhitelist(JSON.parse(saved));
  }, []);

  // Save Whitelist to LocalStorage
  useEffect(() => {
    localStorage.setItem('ig_whitelist', JSON.stringify(whitelist));
  }, [whitelist]);

  const addLog = (text) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 80)]);
  };

  const igHeaders = {
    "X-IG-App-ID": "936619743392459",
    "X-Requested-With": "XMLHttpRequest",
  };

  // --- FEATURE: SCANNING ---
  const handleScan = async () => {
    if (!sessionId) return alert("Please enter your Session ID!");
    setStatus('scanning');
    setLogs(["🚀 Starting Deep Scan..."]);
    
    try {
      addLog("Attempting connection to Instagram...");
      
      // Get User Profile to find ID
      const meRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=self`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const meData = await meRes.json();
      const myId = meData.data.user.id;

      addLog(`Authenticated as ID: ${myId}. Fetching lists...`);

      // Get Following (Simplified for demo - fetches up to 500)
      const followingRes = await fetch(`https://www.instagram.com/api/v1/friendships/${myId}/following/?count=500`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const followingData = await followingRes.json();

      // Get Followers
      const followersRes = await fetch(`https://www.instagram.com/api/v1/friendships/${myId}/followers/?count=500`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const followersData = await followersRes.json();

      const followerIds = new Set(followersData.users.map(u => u.pk));
      const targets = followingData.users.filter(u => !followerIds.has(u.pk));

      setNonFollowers(targets);
      addLog(`✅ Scan Complete. Found ${targets.length} accounts who do not follow back.`);
    } catch (err) {
      addLog("❌ Error: Check Session ID or ensure 'Allow CORS' extension is active.");
    }
    setStatus('idle');
  };

  // --- FEATURE: AUTO UNFOLLOW ---
  const handleAutoUnfollow = async () => {
    if (nonFollowers.length === 0) return alert("Scan first to find non-followers!");
    setStatus('running');
    stopRef.current = false;
    setProgress({ current: 0, total: nonFollowers.length });

    for (let i = 0; i < nonFollowers.length; i++) {
      if (stopRef.current) {
        addLog("🛑 Sequence stopped by user.");
        break;
      }

      const user = nonFollowers[i];

      // Filters
      if (whitelist.includes(user.pk)) {
        addLog(`⏩ Skipping @${user.username} (Whitelisted)`);
        continue;
      }
      if (user.is_verified) {
        addLog(`⏩ Skipping @${user.username} (Blue Tick/Verified)`);
        continue;
      }

      // Safe Human-Like Delay
      const delay = Math.floor(Math.random() * (120000 - 60000) + 60000);
      addLog(`⏳ Waiting ${Math.round(delay/1000)}s before unfollowing @${user.username}...`);
      await new Promise(r => setTimeout(r, delay));

      try {
        const res = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${user.pk}/`, {
          method: 'POST',
          headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
        });
        if (res.ok) {
          addLog(`🗑️ Successfully unfollowed @${user.username}`);
          setProgress(p => ({ ...p, current: i + 1 }));
        } else {
          addLog("⚠️ Rate limited by IG. Bot has self-stopped to save your account.");
          break;
        }
      } catch (e) {
        addLog("❌ Connection Error. Stopping bot.");
        break;
      }
    }
    setStatus('idle');
    addLog("🏁 Automation sequence finished.");
  };

  const toggleWhitelist = (pk) => {
    setWhitelist(prev => prev.includes(pk) ? prev.filter(id => id !== pk) : [...prev, pk]);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navbar */}
        <nav className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">T2 UNFOLLOW PRO</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Safe & Secure Client-Side</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="password" 
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste Session ID" 
                className="w-full bg-black border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-blue-500/50 transition-all"
              />
              <ShieldAlert className="absolute right-3 top-2.5 text-slate-600" size={18} />
            </div>
            <button 
                onClick={() => setSessionId('')}
                className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 transition-colors"
                title="Clear Session"
            >
                <LogOut size={18} />
            </button>
          </div>
        </nav>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sidebar Controls */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3">
              <h3 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 underline decoration-blue-500 underline-offset-4">COMMAND CENTER</h3>
              <button onClick={handleScan} disabled={status !== 'idle'} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/20">
                <ListFilter size={18} /> SCAN ACCOUNTS
              </button>
              <button onClick={handleAutoUnfollow} disabled={status !== 'idle'} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-red-600/20">
                <Play size={18} /> START AUTO
              </button>
              <button onClick={() => stopRef.current = true} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all">
                <Square size={18} /> STOP BOT
              </button>
            </div>

            <div className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-3xl">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-2">
                <Info size={14}/> SECURITY PROTOCOL
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                App is running in <b>Human-Simulation</b> mode. A random delay of 60-120 seconds is added between every action. Verified accounts and whitelisted accounts are ignored to keep your profile authority high.
              </p>
            </div>
          </div>

          {/* Main List */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="font-bold flex items-center gap-2"><UserX className="text-red-500" size={20}/> NON-FOLLOWERS ({nonFollowers.length})</h2>
              {status === 'running' && (
                <div className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                   PROGRESS: {progress.current}/{progress.total}
                </div>
              )}
            </div>
            <div className="h-[550px] overflow-y-auto p-4 space-y-2 bg-black/20">
              {nonFollowers.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <UserCheck size={48} strokeWidth={1} />
                    <p className="text-sm">Click "Scan" to find accounts to clean.</p>
                 </div>
              )}
              {nonFollowers.map(user => (
                <div key={user.pk} className="flex justify-between items-center p-3 bg-slate-800/30 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={user.profile_pic_url} className="w-10 h-10 rounded-full border border-slate-700 shadow-xl" />
                      {user.is_verified && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-slate-900"><UserCheck size={8} fill="white" /></div>}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">{user.username}</div>
                      <div className="text-[10px] text-slate-500 truncate w-32">{user.full_name}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleWhitelist(user.pk)}
                    className={`text-[10px] font-bold px-4 py-1.5 rounded-xl border transition-all ${whitelist.includes(user.pk) ? 'bg-green-500/10 border-green-500 text-green-500' : 'border-slate-700 text-slate-500 hover:border-slate-400'}`}
                  >
                    {whitelist.includes(user.pk) ? 'SAFE' : 'WHITELIST'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Console Log */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 font-bold flex items-center gap-2 text-xs text-slate-400">
              <Square size={12} className="fill-green-500 text-green-500 animate-pulse" /> SYSTEM CONSOLE
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-black/40 font-mono text-[10px] space-y-3">
              {logs.length === 0 && <div className="text-slate-700">Awaiting system initialization...</div>}
              {logs.map((log, i) => (
                <div key={i} className={`pl-2 border-l ${log.includes('✅') || log.includes('🗑️') ? 'border-green-500 text-green-400' : 'border-slate-800 text-slate-500'}`}>
                   {log}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
