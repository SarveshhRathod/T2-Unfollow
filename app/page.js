"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, UserX, UserCheck, Play, Square, ListFilter, Trash2 } from 'lucide-react';

export default function IGApp() {
  const [sessionId, setSessionId] = useState('');
  const [nonFollowers, setNonFollowers] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, scanning, running, paused
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const stopRef = useRef(false);

  // --- Logic: Direct Instagram API Calls ---
  const igHeaders = {
    "X-IG-App-ID": "936619743392459",
    "X-ASBD-ID": "129477",
    "X-IG-WWW-Claim": "0",
    "X-Requested-With": "XMLHttpRequest",
  };

  const addLog = (text) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 100)]);
  };

  // --- FEATURE: SCANNING ---
  const handleScan = async () => {
    if (!sessionId) return alert("Enter Session ID first!");
    setStatus('scanning');
    setLogs(["🚀 Initializing Deep Scan..."]);
    stopRef.current = false;

    try {
      // 1. Get current user ID
      const meRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=self`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const meData = await meRes.json();
      const myId = meData.data.user.id;

      addLog(`User Identified. Fetching lists for ID: ${myId}`);

      // 2. Fetch Following & Followers (Simplified for example)
      // Note: Real implementation would loop through cursors for large accounts
      const followingRes = await fetch(`https://www.instagram.com/api/v1/friendships/${myId}/following/?count=200`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const followingData = await followingRes.json();

      const followersRes = await fetch(`https://www.instagram.com/api/v1/friendships/${myId}/followers/?count=200`, {
        headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
      });
      const followersData = await followersRes.json();

      const followerIds = new Set(followersData.users.map(u => u.pk));
      const targets = followingData.users.filter(u => !followerIds.has(u.pk));

      setNonFollowers(targets);
      addLog(`✅ Scan Complete. Found ${targets.length} non-followers.`);
    } catch (err) {
      addLog("❌ Error: Check Session ID or CORS Extension.");
    }
    setStatus('idle');
  };

  // --- FEATURE: SAFE UNFOLLOW (The "Robot" Loop) ---
  const handleAutoUnfollow = async () => {
    if (nonFollowers.length === 0) return alert("Scan first!");
    setStatus('running');
    stopRef.current = false;
    setProgress({ current: 0, total: nonFollowers.length });

    for (let i = 0; i < nonFollowers.length; i++) {
      if (stopRef.current) break;

      const user = nonFollowers[i];

      // FILTER 1: Whitelist
      if (whitelist.includes(user.pk)) {
        addLog(`⏩ Skipping ${user.username} (Whitelisted)`);
        continue;
      }

      // FILTER 2: Blue Tick
      if (user.is_verified) {
        addLog(`⏩ Skipping ${user.username} (Blue Tick/Verified)`);
        continue;
      }

      // RATE LIMITING: Randomized delay (60s to 120s)
      const delay = Math.floor(Math.random() * (120000 - 60000) + 60000);
      addLog(`⏳ Human-Wait: ${Math.round(delay/1000)}s before unfollowing ${user.username}...`);
      
      await new Promise(r => setTimeout(r, delay));

      // THE ACTION
      try {
        const res = await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${user.pk}/`, {
          method: 'POST',
          headers: { ...igHeaders, "Cookie": `sessionid=${sessionId}` }
        });
        if (res.ok) {
          addLog(`🗑️ Unfollowed @${user.username}`);
          setProgress(p => ({ ...p, current: i + 1 }));
        } else {
          addLog(`⚠️ Rate limited by Instagram. Stopping.`);
          break;
        }
      } catch (e) {
        addLog(`❌ Connection Error.`);
        break;
      }
    }
    setStatus('idle');
    addLog("🏁 Automation Finished.");
  };

  return (
    <main className="min-h-screen text-slate-200 p-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <ShieldCheck className="text-green-400" /> IG SAFE-CLEANER
            </h1>
            <p className="text-slate-400 text-sm italic">v2.0 - Private Client-Side Build</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'running' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}>
              STATUS: {status.toUpperCase()}
            </span>
          </div>
        </header>

        {/* Configuration Section */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <label className="block text-sm font-semibold mb-2 text-slate-300">Instagram Session ID (Required)</label>
          <input 
            type="password" 
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg focus:ring-2 ring-blue-500 focus:outline-none mb-4"
            placeholder="Paste your sessionid cookie here..."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={handleScan} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold transition-all">
              <ListFilter size={20}/> START SCAN
            </button>
            <button onClick={handleAutoUnfollow} disabled={status === 'running'} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 p-3 rounded-xl font-bold transition-all disabled:opacity-50">
              <Play size={20}/> AUTO UNFOLLOW
            </button>
            <button onClick={() => stopRef.current = true} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold transition-all text-white">
              <Square size={20}/> STOP BOT
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Target List */}
          <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold flex items-center gap-2"><UserX className="text-red-400"/> NON-FOLLOWERS ({nonFollowers.length})</h3>
              <div className="text-xs text-slate-400">Verified and Whitelisted users are automatically skipped.</div>
            </div>
            <div className="h-[500px] overflow-y-auto p-2 space-y-1 bg-slate-900/30">
              {nonFollowers.map(user => (
                <div key={user.pk} className="flex justify-between items-center p-3 hover:bg-slate-700/50 rounded-lg border border-transparent hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={user.profile_pic_url} className="w-8 h-8 rounded-full border border-slate-600" />
                    <div>
                      <div className="font-medium text-white flex items-center gap-1">
                        {user.username} {user.is_verified && <span className="text-blue-400 text-[10px]">● Verified</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">{user.full_name}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setWhitelist([...whitelist, user.pk])}
                    className={`text-[10px] px-3 py-1 rounded border transition-all ${whitelist.includes(user.pk) ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-slate-600 text-slate-400 hover:border-blue-400'}`}
                  >
                    {whitelist.includes(user.pk) ? 'SAFE LISTED' : 'ADD WHITELIST'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 font-bold flex items-center gap-2">
              <UserCheck className="text-blue-400"/> BOT CONSOLE
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2 bg-black/20">
              {logs.length === 0 && <div className="text-slate-600 italic">Waiting for command...</div>}
              {logs.map((log, i) => (
                <div key={i} className={`border-l-2 pl-2 ${log.includes('✅') || log.includes('🗑️') ? 'border-green-500 text-green-400' : 'border-slate-700 text-slate-400'}`}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
