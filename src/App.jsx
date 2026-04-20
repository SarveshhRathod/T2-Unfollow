import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function App() {
  const [session, setSession] = useState('');
  const [list, setList] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const stopReq = useRef(false);

  const addLog = (m) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 50)]);

  // --- ACTIONS ---
  const scan = async () => {
    setIsBusy(true);
    addLog("Scanning started...");
    try {
      const res = await axios.post('/api/scan', { sessionid: session });
      setList(res.data.users);
      addLog(`Found ${res.data.users.length} non-followers.`);
    } catch (e) { addLog("Error during scan."); }
    setIsBusy(false);
  };

  const startAuto = async () => {
    setIsBusy(true);
    stopReq.current = false;
    
    for (let user of list) {
      if (stopReq.current) break;
      if (whitelist.includes(user.pk) || user.is_verified) {
        addLog(`Skipping ${user.username}...`);
        continue;
      }

      // HUMAN DELAY: 60-120 seconds
      const delay = Math.floor(Math.random() * (120000 - 60000) + 60000);
      addLog(`Waiting ${Math.round(delay/1000)}s to unfollow ${user.username}`);
      await new Promise(r => setTimeout(r, delay));

      try {
        await axios.post('/api/unfollow', { sessionid: session, targetId: user.pk });
        addLog(`✅ Unfollowed ${user.username}`);
      } catch (e) { addLog("❌ Failed/Rate Limited."); break; }
    }
    setIsBusy(false);
    addLog("Finished.");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500">T2 UNFOLLOW [HYBRID]</h1>
          <input 
            type="password" placeholder="Session ID" 
            className="bg-black border border-zinc-700 p-2 rounded-lg text-sm w-64"
            onChange={e => setSession(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button onClick={scan} disabled={isBusy} className="bg-blue-600 p-3 rounded-xl font-bold">SCAN</button>
          <button onClick={startAuto} disabled={isBusy} className="bg-red-600 p-3 rounded-xl font-bold">AUTO UNFOLLOW</button>
          <button onClick={() => stopReq.current = true} className="bg-zinc-700 p-3 rounded-xl font-bold">STOP</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-2xl h-96 overflow-y-auto border border-zinc-800">
            <div className="p-4 border-b border-zinc-800 font-bold sticky top-0 bg-zinc-900">NON-FOLLOWERS</div>
            {list.map(u => (
              <div key={u.pk} className="p-3 flex justify-between border-b border-zinc-800/50 items-center">
                <span className="text-sm">@{u.username} {u.is_verified && '🔵'}</span>
                <button onClick={() => setWhitelist([...whitelist, u.pk])} className="text-[10px] bg-zinc-800 px-2 py-1 rounded">
                  {whitelist.includes(u.pk) ? 'SAFE' : 'WHITELIST'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-2xl h-96 overflow-y-auto border border-zinc-800 font-mono text-[10px] p-4 text-zinc-400">
             <div className="text-zinc-500 mb-2 border-b border-zinc-800 pb-1 font-bold">ACTIVITY LOG</div>
             {logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
