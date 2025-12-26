
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Send, 
  Settings, 
  Navigation, 
  Mic, 
  Volume2, 
  Bookmark, 
  Share2, 
  Clock, 
  Globe, 
  Compass,
  Star,
  History,
  X,
  Plane,
  Menu
} from 'lucide-react';
import { Message, UserPreferences, SavedRecommendation } from './types';
import { getGeminiResponse, generateTTS, decodeBase64, decodeAudioData } from './services/geminiService';

const QUICK_REPLIES = [
  "Recommend some local food",
  "Suggest a 3-day itinerary",
  "What are the top cultural sites?",
  "Tell me about local history",
  "How's the weather today?",
  "Find a budget hotel nearby"
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your AI Tour Guide. Where are we exploring today? 🌍✨ I can help you with itineraries, local secrets, history, and real-time navigation!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  const [preferences, setPreferences] = useState<UserPreferences>({
    budget: 'mid-range',
    interests: ['Culture', 'Food'],
    duration: '3 days',
    language: 'English'
  });
  const [saved, setSaved] = useState<SavedRecommendation[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Location permission denied or unavailable.")
      );
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const placeholderId = 'loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: placeholderId,
      role: 'model',
      text: 'Exploring the world for you...',
      timestamp: new Date(),
      isProcessing: true
    }]);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await getGeminiResponse(text, history, preferences, location);

      setMessages(prev => prev.map(m => m.id === placeholderId ? {
        ...m,
        text: response.text,
        groundingLinks: response.links,
        isProcessing: false
      } : m));

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === placeholderId ? {
        ...m,
        text: "I'm having trouble connecting to my travel satellites. Please check your internet or try again!",
        isProcessing: false
      } : m));
    }
  };

  const playAudio = async (text: string, messageId: string) => {
    if (isSpeaking === messageId) return;
    setIsSpeaking(messageId);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioData = await generateTTS(text);
      if (audioData) {
        const decoded = decodeBase64(audioData);
        const buffer = await decodeAudioData(decoded, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsSpeaking(null);
    }
  };

  const saveRec = (msg: Message) => {
    const newRec: SavedRecommendation = {
      id: msg.id,
      title: msg.text.slice(0, 30) + "...",
      description: msg.text
    };
    setSaved(prev => [...prev, newRec]);
    alert("Saved to your travel journal!");
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans selection:bg-indigo-100">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <Compass className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">TravelAI</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-2">My Journey</div>
            <button className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group">
              <Plane className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Active Trip</span>
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group">
              <History className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Past Adventures</span>
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group">
              <Bookmark className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Saved Places ({saved.length})</span>
            </button>
            
            <div className="pt-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-2">Preferences</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Budget Style</label>
                  <select 
                    value={preferences.budget}
                    onChange={(e) => setPreferences({...preferences, budget: e.target.value as any})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="budget">Backpacker (Budget)</option>
                    <option value="mid-range">Standard (Mid-range)</option>
                    <option value="luxury">Luxury (Comfort)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Interests</label>
                  <div className="flex flex-wrap gap-1">
                    {['Food', 'History', 'Nature', 'Art'].map(interest => (
                      <button 
                        key={interest}
                        onClick={() => {
                          const newInterests = preferences.interests.includes(interest)
                            ? preferences.interests.filter(i => i !== interest)
                            : [...preferences.interests, interest];
                          setPreferences({...preferences, interests: newInterests});
                        }}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-all ${preferences.interests.includes(interest) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className="p-4 border-t">
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 w-full p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-slate-50 h-full max-w-5xl mx-auto shadow-sm">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h2 className="font-bold text-slate-800">Local Guide Gemini</h2>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={10} className="text-indigo-500" />
                {location ? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : 'Searching location...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-4 shadow-sm relative group ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.isProcessing ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    </div>
                    <span className="text-sm text-slate-400 font-medium">{msg.text}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>

                    {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Globe size={10} /> Sources & Maps
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingLinks.map((link, idx) => (
                            <a 
                              key={idx} 
                              href={link.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 transition-colors"
                            >
                              <Navigation size={10} />
                              {link.title || 'Location details'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`absolute -bottom-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.role === 'user' ? 'right-0 flex-row-reverse' : 'left-0'}`}>
                      {msg.role === 'model' && (
                        <>
                          <button 
                            onClick={() => playAudio(msg.text, msg.id)}
                            className={`p-2 rounded-full shadow-md transition-all ${isSpeaking === msg.id ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-slate-500 hover:text-indigo-600'}`}
                            title="Listen to guide"
                          >
                            <Volume2 size={16} />
                          </button>
                          <button 
                            onClick={() => saveRec(msg)}
                            className="p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-amber-500 transition-all"
                            title="Save recommendation"
                          >
                            <Bookmark size={16} />
                          </button>
                        </>
                      )}
                      <span className="text-[10px] text-slate-400 self-center px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Controls */}
        <div className="p-4 md:p-6 bg-white border-t space-y-4">
          {/* Quick Replies */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
            {QUICK_REPLIES.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-full border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95"
              >
                {reply}
              </button>
            ))}
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1 group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your guide anything..."
                className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner group-hover:bg-white"
              />
              <button 
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Mic size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-4 rounded-3xl shadow-lg shadow-indigo-200 transition-all active:scale-95 ${input.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Send size={24} />
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 uppercase tracking-tighter">
            AI can make mistakes. Always verify flight times and local laws.
          </p>
        </div>
      </main>

      {/* Settings Modal (Overlay) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Travel Profile</h3>
                <p className="text-sm text-slate-500">Fine-tune your personal guide</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
                  <Globe size={16} className="text-indigo-500" /> Interaction Language
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['English', 'Spanish', 'French', 'Japanese', 'German', 'Chinese'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setPreferences({...preferences, language: lang})}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${preferences.language === lang ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-500" /> Typical Trip Duration
                </label>
                <div className="flex gap-2">
                  {['1 Day', '3 Days', '1 Week', 'Long Term'].map(dur => (
                    <button
                      key={dur}
                      onClick={() => setPreferences({...preferences, duration: dur})}
                      className={`flex-1 px-2 py-2 rounded-xl text-xs font-medium border transition-all ${preferences.duration === dur ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] mt-4"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
