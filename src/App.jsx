import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { 
  Users, 
  DollarSign, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  HeartHandshake, 
  Clock, 
  Lock, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  LogOut, 
  Settings2, 
  LayoutDashboard, 
  AlertTriangle, 
  Image as ImageIcon, 
  Type, 
  FileText, 
  Key, 
  Printer, 
  Link as LinkIcon, 
  ChevronLeft,
  AlertCircle,
  Mail,
  Upload,
  ImagePlus,
  ExternalLink
} from 'lucide-react';

// --- Firebase Initialization ---

const myFirebaseConfig = {
  apiKey: "AIzaSyDk7QMgHf0WMs5thI_Ip4pnOOu4Mz82Dgw",
  authDomain: "donation-tracker-b7f61.firebaseapp.com",
  projectId: "donation-tracker-b7f61",
  storageBucket: "donation-tracker-b7f61.firebasestorage.app",
  messagingSenderId: "71525680789",
  appId: "1:71525680789:web:a8725b1d3eea1dd952fd9c",
  measurementId: "G-2EDCCDJ7QT"
};

const isUsingPlatformConfig = typeof __firebase_config !== 'undefined';
const firebaseConfig = isUsingPlatformConfig 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'donation-tracker';

const DEFAULT_SETTINGS = {
  heading: "",
  description: "",
  imageUrl: "", 
  coachPassword: "coach123",
  redirectUrl: "",
  notificationEmail: ""
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('donor'); 
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false);
  const [coachPasswordInput, setCoachPasswordInput] = useState('');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  const [donations, setDonations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingDonation, setEditingDonation] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isUsingPlatformConfig && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
        try { await signInAnonymously(auth); } catch (e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubDonations = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'donations'), (snapshot) => {
      setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTeams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      } else {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), DEFAULT_SETTINGS);
      }
      setIsInitializing(false);
    });

    return () => { unsubDonations(); unsubTeams(); unsubSettings(); };
  }, [user]);

  // Email Notification Helper
  const sendNotification = async (teamName, amountValue) => {
    if (!settings.notificationEmail) {
      return;
    }

    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: "service_z9edhh6",
          template_id: "template_aiz7qdk",
          user_id: "1BLVtypzZ7JwrJKS_",
          template_params: {
            to_email: settings.notificationEmail,
            team_name: teamName,
            amount: `$${parseFloat(amountValue).toFixed(2)}`,
            timestamp: new Date().toLocaleString()
          }
        })
      });
    } catch (err) {
      console.error("Email failed:", err);
    }
  };

  const handleDonorSubmit = async (teamName, amountValue) => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'donations'), {
        team: teamName,
        amount: parseFloat(amountValue),
        timestamp: new Date().toISOString(),
      });
      
      sendNotification(teamName, amountValue);

      setSuccess(true);
      setLoading(false);
      
      const baseUrl = settings.redirectUrl || DEFAULT_SETTINGS.redirectUrl;
      const finalRedirectUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}x_amount=${amountValue}`;
      setTimeout(() => { 
        window.location.assign(finalRedirectUrl);
      }, 2000);
    } catch (err) { 
      setLoading(false); 
      console.error("Submission error:", err);
    }
  };

  const handleCoachLogin = (e) => {
    e.preventDefault();
    if (coachPasswordInput === settings.coachPassword) {
      setIsCoachAuthenticated(true);
      setErrorMsg('');
      setCoachPasswordInput('');
    } else {
      setErrorMsg('Incorrect password.');
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'teams'), { name: newTeamName.trim() });
    setNewTeamName('');
    setIsAddingTeam(false);
  };

  const handleAddTeamBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.type === 'submit') return;
    setTimeout(() => {
      setIsAddingTeam(false);
      setNewTeamName('');
    }, 150);
  };

  const handleUpdateTeam = async (id, newName) => {
    const trimmedNewName = newName.trim();
    const oldTeam = teams.find(t => t.id === id);
    const oldName = oldTeam ? oldTeam.name : null;

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teams', id), { name: trimmedNewName });
      
      if (oldName && oldName !== trimmedNewName) {
        const donationsToUpdate = donations.filter(d => d.team === oldName);
        await Promise.all(donationsToUpdate.map(d => 
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'donations', d.id), { team: trimmedNewName })
        ));
      }
      
      setEditingTeam(null);
    } catch (err) { console.error("Update team error:", err); }
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamToDelete.id));
      setTeamToDelete(null);
    } catch (err) { console.error("Delete team error:", err); }
  };

  const teamStats = useMemo(() => {
    const stats = {};
    teams.forEach(t => stats[t.name] = { total: 0, count: 0, items: [] });
    donations.forEach(d => {
      if (stats[d.team]) {
        stats[d.team].total += d.amount;
        stats[d.team].count += 1;
        stats[d.team].items.push(d);
      }
    });
    return stats;
  }, [donations, teams]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-blue-950 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'print') {
    return (
      <PrintView 
        teams={teams} 
        teamStats={teamStats} 
        totalRaised={donations.reduce((acc, d) => acc + d.amount, 0)} 
        onBack={() => setView('coach')} 
      />
    );
  }

  const backgroundStyle = settings.imageUrl 
    ? { 
        backgroundImage: `url(${settings.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } 
    : {};

  return (
    <div className="min-h-screen bg-blue-950 font-sans text-slate-100 transition-colors duration-700 flex justify-center items-center p-0 sm:p-4">
      {/* Container restricted to phone-like dimensions */}
      <div className="w-full max-w-lg sm:h-[900px] relative">
        <div 
          className={`relative overflow-y-auto h-full transition-all duration-700 shadow-2xl sm:rounded-[3rem] ${settings.imageUrl ? 'p-0' : 'bg-slate-50 p-6 sm:p-8'}`}
          style={backgroundStyle}
        >
          {/* Background Overlay (Subtle Shadow) for readability if image exists */}
          {settings.imageUrl && (
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          )}

          <div className="relative z-10 h-full flex flex-col p-6 sm:p-10">
            {view === 'donor' ? (
              <div className="flex flex-col h-full mx-auto w-full">
                <div className="flex-1 flex flex-col justify-center">
                  <DonorView 
                    settings={settings} 
                    teams={teams} 
                    onSubmit={handleDonorSubmit} 
                    loading={loading} 
                    success={success} 
                    onReset={() => setSuccess(false)}
                    onCoachClick={() => setView('coach')}
                  />
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full flex flex-col h-full">
                {!isCoachAuthenticated ? (
                  <div className="max-w-sm mx-auto p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl animate-in fade-in zoom-in-95 duration-300 my-auto w-full">
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-12 h-12 bg-red-900/90 text-white rounded-2xl flex items-center justify-center mb-4 shadow-sm"><Lock className="w-6 h-6" /></div>
                      <h2 className="text-xl font-bold uppercase tracking-tight text-center text-white">Coach Portal</h2>
                    </div>
                    <form onSubmit={handleCoachLogin} className="space-y-4">
                      <input autoFocus type="password" placeholder="Password" value={coachPasswordInput} onChange={(e) => setCoachPasswordInput(e.target.value)} className="w-full border-2 border-white/30 rounded-xl px-4 py-3 font-bold focus:outline-none bg-white/20 focus:border-red-900 transition-colors text-center text-white shadow-sm placeholder-slate-300" />
                      {errorMsg && <p className="text-red-900 text-xs text-center font-bold">{errorMsg}</p>}
                      <button className="w-full py-3 bg-blue-950/90 text-white rounded-xl font-bold hover:bg-black transition-all text-sm uppercase tracking-widest shadow-lg">Login</button>
                      <button type="button" onClick={() => setView('donor')} className="w-full py-2 text-slate-300 text-xs font-black hover:text-white uppercase tracking-widest">Cancel</button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col my-auto space-y-6 overflow-y-auto scrollbar-hide max-h-full">
                    <div className="space-y-4">
                      {teams.map(team => (
                        <TeamRow 
                          key={team.id}
                          team={team}
                          stats={teamStats[team.name] || { total: 0, count: 0, items: [] }}
                          onEditDonation={(item) => setEditingDonation(item)}
                          onEditTeam={() => setEditingTeam(team)}
                          onDeleteDonation={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'donations', id))}
                          onDeleteTeam={() => setTeamToDelete(team)}
                        />
                      ))}
                    </div>

                    <div className="space-y-3 pt-2">
                      {!isAddingTeam ? (
                        <button 
                          onClick={() => setIsAddingTeam(true)} 
                          className="w-full py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-2 border-white/30 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-md active:scale-[0.98]"
                        >
                          <Plus className="w-5 h-5 text-red-900" /> 
                          Add New Team
                        </button>
                      ) : (
                        <form onSubmit={handleAddTeam} className="bg-white/20 backdrop-blur-md p-4 rounded-3xl border-2 border-white/30 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                          <div className="flex gap-2">
                            <input 
                              autoFocus 
                              type="text" 
                              placeholder="Team name..." 
                              value={newTeamName} 
                              onChange={(e) => setNewTeamName(e.target.value)} 
                              onBlur={handleAddTeamBlur}
                              className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:border-red-900 text-white placeholder-slate-300 shadow-inner" 
                            />
                            <button type="submit" className="bg-red-900 text-white px-6 py-2 rounded-xl font-black text-sm uppercase transition-colors hover:bg-red-950">Create</button>
                          </div>
                        </form>
                      )}

                      <button 
                        onClick={() => setView('print')} 
                        className="w-full py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-2 border-white/30 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-md active:scale-95"
                      >
                        <Printer className="w-5 h-5 text-red-900" /> 
                        Generate Report
                      </button>
                    </div>

                    <SettingsPanel 
                      currentSettings={settings} 
                      onAutoSave={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), s)} 
                    />

                    <div className="flex justify-center pt-2">
                      <button 
                        onClick={() => { setIsCoachAuthenticated(false); setView('donor'); }} 
                        className="p-4 bg-white/10 backdrop-blur-sm hover:bg-red-900/50 text-slate-200 hover:text-white border-2 border-white/30 rounded-full transition-all flex items-center justify-center shadow-md active:scale-95"
                        aria-label="Return to Donor View"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingDonation && (
        <DonationModal teams={teams} initialData={editingDonation} onClose={() => setEditingDonation(null)} onSave={async (data) => {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'donations', editingDonation.id), { ...data, amount: parseFloat(data.amount) });
          setEditingDonation(null);
        }} />
      )}

      {editingTeam && (
        <TeamEditModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={handleUpdateTeam} />
      )}

      {teamToDelete && (
        <DeleteTeamModal teamName={teamToDelete.name} onClose={() => setTeamToDelete(null)} onConfirm={confirmDeleteTeam} />
      )}
    </div>
  );
}

function DonorView({ settings, teams, onSubmit, loading, success, onReset, onCoachClick }) {
  const [team, setTeam] = useState('');
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    if (!team || !amount || parseFloat(amount) <= 0) {
      setValidationError('Please select a team and enter a valid donation amount.');
      return;
    }
    onSubmit(team, amount);
  };

  const baseUrl = settings.redirectUrl || DEFAULT_SETTINGS.redirectUrl;
  const finalRedirectUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}x_amount=${amount}`;

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/20 shadow-2xl p-8 sm:p-10 flex flex-col">
      <div className="text-center mb-8 pt-4">
        {!settings.imageUrl && (
           <div className="w-20 h-20 bg-red-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-950/50 overflow-hidden border-2 border-white/50">
            <HeartHandshake className="w-10 h-10" />
          </div>
        )}
        <h1 className="text-3xl font-black tracking-tighter mb-3 leading-tight text-white drop-shadow-md">
          {settings.heading || ""}
        </h1>
        <p className="font-black text-xs px-4 text-slate-200 tracking-widest leading-relaxed opacity-90 drop-shadow-sm whitespace-pre-wrap">
          {settings.description || "Choose a team and pledge your support."}
        </p>
      </div>

      <div>
        {success ? (
          <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-green-500/20 backdrop-blur-sm text-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black mb-1 uppercase tracking-tight text-white">Pledge Recorded!</h2>
            <p className="text-slate-200 text-xs mb-6 font-bold leading-relaxed">
              Redirecting you to complete your donation...
            </p>
            <div className="space-y-4">
              <a 
                href={finalRedirectUrl}
                className="w-full py-5 bg-red-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-red-950/50 hover:bg-red-950 transition-all active:scale-95"
              >
                Click here if not redirected.<ExternalLink className="w-5 h-5" />
              </a>
              <button 
            onClick={() => {
              setTeam('');
              setAmount('');
              onReset();
            }}
                className="text-[10px] font-black uppercase text-slate-300 tracking-widest hover:text-white transition-colors"
              >
                New Pledge
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="block text-[10px] font-black text-slate-200 uppercase tracking-widest ml-1 italic">Select Your Team</label>
              <div className="relative">
                <select 
                  value={team} 
                  onChange={(e) => { setTeam(e.target.value); setValidationError(''); }} 
                  className="w-full bg-white/20 border-2 border-white/30 rounded-2xl px-5 py-4 appearance-none focus:border-red-900 font-bold outline-none cursor-pointer transition-colors text-white shadow-sm"
                >
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.name} className="text-blue-950">{t.name}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-5 w-5 h-5 text-slate-300 pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2 text-left">
              <label className="block text-[10px] font-black text-slate-200 uppercase tracking-widest ml-1 italic">Pledge Amount</label>
              <div className="relative">
                <span className="absolute left-6 top-4 font-black text-slate-300 text-2xl transition-colors">$</span>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => { setAmount(e.target.value); setValidationError(''); }} 
                  className="w-full bg-white/20 border-2 border-white/30 rounded-2xl pl-12 pr-6 py-4 font-black text-2xl focus:border-red-900 outline-none transition-colors text-white placeholder-slate-300 shadow-sm" 
                />
              </div>
            </div>

            {validationError && (
              <div className="bg-red-900/20 backdrop-blur-md border border-red-900/30 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-black leading-tight">{validationError}</p>
              </div>
            )}

            <button 
              disabled={loading} 
              className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all ${loading ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-red-900 text-white hover:bg-red-950 shadow-xl shadow-red-950/50 active:scale-95'}`}
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>DONATE NOW <ArrowRight className="w-6 h-6" /></>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 flex justify-center pb-2">
        <button 
          onClick={onCoachClick}
          className="p-3 text-white/40 hover:text-white transition-colors"
          aria-label="Coach Login"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TeamRow({ team, stats, onEditDonation, onEditTeam, onDeleteDonation, onDeleteTeam }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/20 shadow-md overflow-hidden group transition-all">
      <div className="flex items-stretch">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 p-5 sm:p-6 flex items-center justify-between hover:bg-white/20 text-left transition-colors">
          <div className="flex items-center gap-4 sm:gap-5">
            <h3 className="font-bold text-white text-lg leading-tight">{team.name}</h3>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <p className="text-lg sm:text-xl font-black text-white">${stats.total.toLocaleString()}</p>
            <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expanded ? 'rotate-180 text-red-900' : ''}`} />
          </div>
        </button>
        <div className="flex items-stretch border-l border-white/20 bg-white/10">
          <button onClick={(e) => { e.stopPropagation(); onEditTeam(); }} className="px-4 text-slate-300 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 transition-all border-r border-white/20"><Edit2 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteTeam(); }} className="px-4 text-slate-300 hover:text-red-900 sm:opacity-0 sm:group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && (
        <div className="bg-white/5 p-3 sm:p-4 border-t border-white/10 space-y-2">
          {stats.items.length > 0 ? stats.items.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(item => (
            <div key={item.id} className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 flex items-center justify-between group/item shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{new Date(item.timestamp).toLocaleDateString()}</span>
                <span className="text-[9px] font-medium text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-black text-red-900 text-lg tracking-tight">${item.amount.toLocaleString()}</span>
                <div className="flex gap-1">
                  <button onClick={() => onEditDonation(item)} className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDeleteDonation(item.id)} className="p-1.5 hover:bg-red-900/20 text-red-900 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )) : <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No donations yet</p>}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ currentSettings, onAutoSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(currentSettings);
  const [saveStatus, setSaveStatus] = useState('idle');
  const fileInputRef = useRef(null);

  useEffect(() => { setForm(currentSettings); }, [currentSettings]);

  useEffect(() => {
    if (JSON.stringify(form) === JSON.stringify(currentSettings)) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      onAutoSave(form);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
    return () => clearTimeout(timer);
  }, [form, currentSettings, onAutoSave]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resolution threshold: changed to 1920px (1080p) to allow higher quality compression within 1MB limit
        const max = 1920; 
        if (width > height) {
          if (width > max) { height *= max / width; width = max; }
        } else {
          if (height > max) { width *= max / height; height = max; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // WebP provides better quality-to-size ratio. 0.95 Quality will be noticeably sharper.
        const dataUrl = canvas.toDataURL('image/webp', 0.95); 
        setForm(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-6 mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full py-4 bg-white/5 backdrop-blur-md rounded-[2rem] border-2 border-white/20 text-white font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] hover:bg-white/10"
      >
        <Settings2 className="w-5 h-5 text-red-900" /> 
        Configuration
        <div className="flex items-center gap-2">
          {saveStatus !== 'idle' && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500/20 text-amber-300 animate-pulse border border-amber-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>}
          {isOpen ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border-2 border-white/20 shadow-2xl p-8 space-y-8 animate-in slide-in-from-top-4 duration-300 mt-4 overflow-hidden text-white">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-red-900 tracking-widest border-b border-white/20 pb-2 text-left">Branding & Links</h3>
            <div className="grid grid-cols-1 gap-6">
              <Input label="Main Heading" value={form.heading} onChange={v => setForm({...form, heading: v})} />
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-1 italic">Background Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 border-2 border-dashed border-white/30 rounded-xl overflow-hidden flex items-center justify-center text-slate-300 shadow-inner">{form.imageUrl ? <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6" />}</div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/30 transition-all flex items-center gap-2 shadow-md border border-white/20"><Upload className="w-3 h-3" /> Upload</button>
                    {form.imageUrl && <button onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))} className="text-[9px] font-black text-red-900 uppercase tracking-widest hover:underline text-left ml-1">Remove</button>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-1 italic block">Description</label>
                <textarea rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border-2 border-white/30 p-3 rounded-xl text-sm font-bold bg-white/10 focus:outline-none focus:border-red-900 text-white resize-none transition-colors shadow-inner placeholder-slate-300" />
              </div>
              <Input label="Redirect URL" value={form.redirectUrl} onChange={v => setForm({...form, redirectUrl: v})} />
              <Input label="Coach Password" value={form.coachPassword} onChange={v => setForm({...form, coachPassword: v})} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-red-900 tracking-widest border-b border-white/20 pb-2 flex items-center gap-2 text-left"><Mail className="w-3 h-3" /> Notifications</h3>
            <div className="grid grid-cols-1 gap-4">
              <Input label="Alert Email Address" placeholder="who gets the alert?" value={form.notificationEmail} onChange={v => setForm({...form, notificationEmail: v})} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest mt-4 border-t border-white/20 pt-4">Auto-sync active</p>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-1 italic">{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full border-2 border-white/30 p-3 rounded-xl text-sm font-bold bg-white/10 focus:outline-none focus:border-red-900 transition-colors shadow-inner text-white placeholder-slate-400" />
    </div>
  );
}

function DeleteTeamModal({ teamName, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl border-4 border-red-900/20 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-900/10 text-red-900 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10" /></div>
        <h2 className="text-2xl font-black mb-4 tracking-tight uppercase leading-none text-blue-950">Are you sure?</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed font-bold italic px-2 text-center">Deleting <span className="font-bold text-blue-950 underline decoration-red-900/30">"{teamName}"</span> is permanent. This removes the team from selection and hides its history.</p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} className="w-full py-4 bg-red-900 text-white rounded-2xl font-black hover:bg-red-950 transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest text-xs active:scale-95">Confirm</button>
          <button onClick={onClose} className="w-full py-4 bg-white/80 text-slate-400 rounded-2xl font-black hover:bg-white transition-all uppercase tracking-widest text-xs active:scale-95 border border-slate-100">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function DonationModal({ teams, initialData, onClose, onSave }) {
  const [formData, setFormData] = useState(initialData);
  return (
    <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white p-10 rounded-[2.5rem] max-w-sm w-full relative animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-white/50">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-black mb-8 tracking-tighter uppercase leading-none text-blue-950">Edit Record</h2>
        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1 italic">Assign Team</label>
            <select value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-xl font-bold bg-slate-50 outline-none focus:border-red-900 transition-colors cursor-pointer text-blue-950 shadow-inner">{teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1 italic">Amount ($)</label>
            <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-xl font-black text-2xl bg-slate-50 outline-none focus:border-red-900 transition-colors shadow-inner text-blue-950" />
          </div>
          <button onClick={() => onSave(formData)} className="w-full py-5 bg-blue-950 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest active:scale-95 text-center">Update</button>
        </div>
      </div>
    </div>
  );
}

function TeamEditModal({ team, onClose, onSave }) {
  const [name, setName] = useState(team.name);
  return (
    <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white p-10 rounded-[2.5rem] max-w-sm w-full relative animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-white/50">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-black mb-8 tracking-tighter uppercase leading-none text-blue-950">Rename Team</h2>
        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1 italic">Team Name</label>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-slate-100 p-4 rounded-xl font-bold bg-slate-50 outline-none focus:border-red-900 transition-colors shadow-inner text-blue-950" />
          </div>
          <button onClick={() => onSave(team.id, name)} className="w-full py-5 bg-blue-950 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest active:scale-95 text-center">Save Name</button>
        </div>
      </div>
    </div>
  );
}

function PrintView({ teams, teamStats, totalRaised, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-white p-6 sm:p-12 text-blue-950 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b-4 border-red-900 pb-4 mb-8 no-print">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-blue-950 font-bold text-xs uppercase tracking-widest"><ChevronLeft className="w-4 h-4" /> Back</button>
          <button onClick={() => window.print()} className="bg-red-900 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95 transition-all"><Printer className="w-4 h-4" /> Print / PDF</button>
        </div>
        <div className="print-area">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Fundraiser Submission Report</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated: {new Date().toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 mb-12 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Grand Total Pledged</p>
            <p className="text-5xl font-black text-red-900 tracking-tight">${totalRaised.toLocaleString()}</p>
          </div>
          <div className="space-y-12">
            {teams.map(team => {
              const stats = teamStats[team.id] || { total: 0, count: 0, items: [] };
              return (
                <div key={team.id} className="page-break">
                  <div className="flex items-baseline justify-between border-b-2 border-blue-950 pb-2 mb-4">
                    <h2 className="text-xl font-black uppercase tracking-tight">{team.name}</h2>
                    <p className="text-xl font-black text-red-900">${stats.total.toLocaleString()}</p>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                        <th className="py-3 px-2">Date & Time</th>
                        <th className="py-3 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.items.length > 0 ? stats.items.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(item => (
                        <tr key={item.id}>
                          <td className="py-3 px-2 text-xs font-bold">{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3 px-2 text-sm font-black text-right">${item.amount.toLocaleString()}</td>
                        </tr>
                      )) : <tr><td colSpan="2" className="py-8 text-center text-xs font-bold text-slate-300 uppercase italic">No items recorded</td></tr>}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {teamStats.orphaned && teamStats.orphaned.items.length > 0 && (
              <div key="orphaned" className="page-break opacity-75">
                <div className="flex items-baseline justify-between border-b-2 border-blue-950 pb-2 mb-4">
                  <h2 className="text-xl font-black uppercase tracking-tight text-blue-950">Orphaned Donations (Deleted Teams)</h2>
                  <p className="text-xl font-black text-red-900">${teamStats.orphaned.total.toLocaleString()}</p>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-3 px-2">Date & Time</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {teamStats.orphaned.items.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(item => (
                      <tr key={item.id}>
                        <td className="py-3 px-2 text-xs font-bold">{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-3 px-2 text-sm font-black text-right">${item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } .page-break { page-break-inside: avoid; margin-bottom: 40px; } }`}</style>
    </div>
  );
}