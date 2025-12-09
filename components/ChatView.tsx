
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Search, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { Message, Language } from '../types';
import { chatWithBot } from '../services/geminiService';
import getSupabase from '../services/supabaseClient'

interface ChatViewProps {
  lang: Language;
  initialContext?: { id: string, name: string, initialMessage?: string } | null;
}

const ChatView: React.FC<ChatViewProps> = ({ lang, initialContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeContact, setActiveContact] = useState<{name: string, isBot: boolean}>({ name: 'KOMBO Support', isBot: true });
  const [userId, setUserId] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle initialization logic
  useEffect(() => {
    (async () => {
      const supabase = getSupabase()
      const { data } = await supabase?.auth.getUser()!
      const u = data?.user
      if (u) setUserId(u.id)
      if (u) {
        const { data: rows } = await supabase!.from('messages').select('*').or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`).order('timestamp', { ascending: true }).limit(50)
        if (rows && Array.isArray(rows)) {
          const mapped: Message[] = rows.map((r: any) => ({ id: String(r.id), text: r.text || '', sender: (r.role || 'other') as Message['sender'], timestamp: new Date(r.timestamp || Date.now()) }))
          setMessages(mapped)
        }
      }
    })()
    if (initialContext) {
      setActiveContact({ name: initialContext.name, isBot: false });
      if (initialContext.initialMessage) {
         setMessages([{
            id: Date.now().toString(),
            text: initialContext.initialMessage,
            sender: 'user',
            timestamp: new Date()
         }]);
      } else {
        setMessages([]); // Start fresh
      }
    } else {
      // Default to Bot if no context
      setMessages([{ 
        id: '1', 
        text: lang === 'pt' ? 'Olá! Sou o assistente KOMBO. Como posso ajudar?' : 'Hello! I am your KOMBO assistant. How can I help you today?', 
        sender: 'bot', 
        timestamp: new Date() 
      }]);
    }
  }, [lang, initialContext]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    try {
      const supabase = getSupabase()
      if (supabase && userId) {
        await supabase.from('messages').insert({ text: userMsg.text, role: 'user', sender_id: userId, receiver_id: activeContact.isBot ? null : userId, timestamp: new Date().toISOString() })
      }
    } catch (_e) {}

    if (activeContact.isBot) {
        setIsTyping(true);
        // Call Gemini with lang param
        const responseText = await chatWithBot(userMsg.text, lang);

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
        try {
          const supabase = getSupabase()
          if (supabase && userId) {
            await supabase.from('messages').insert({ text: botMsg.text, role: 'bot', sender_id: userId, receiver_id: null, timestamp: new Date().toISOString() })
          }
        } catch (_e) {}
        setIsTyping(false);
    } else {
      // Simulate real person reply delay
      setIsTyping(true);
      setTimeout(async () => {
        const replyMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: lang === 'pt' ? 'Obrigado pelo contacto. Já respondo!' : 'Thanks for contacting. I will reply shortly!',
          sender: 'other',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, replyMsg]);
        try {
          const supabase = getSupabase()
          if (supabase && userId) {
            await supabase.from('messages').insert({ text: replyMsg.text, role: 'other', sender_id: userId, receiver_id: null, timestamp: new Date().toISOString() })
          }
        } catch (_e) {}
        setIsTyping(false);
      }, 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 md:bg-gray-50 dark:md:bg-gray-900 md:p-6 overflow-hidden transition-colors duration-200">
      
      {/* Desktop Chat Sidebar (Mocked Contacts) */}
      <div className="hidden md:flex w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-2xl flex-col shrink-0 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
           <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Mensagens</h2>
           <div className="relative">
             <Search size={16} className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
             <input type="text" placeholder="Buscar conversas..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          
          {/* Active Chat Item */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeContact.isBot ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-gray-200'}`}>
                {activeContact.isBot ? <Bot size={20} /> : <span className="font-bold">{activeContact.name[0]}</span>}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{activeContact.name}</span>
                  <span className="text-[10px] text-gray-400">Agora</span>
               </div>
               <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                 {messages.length > 0 ? messages[messages.length - 1].text : (activeContact.isBot ? 'Bot Support' : 'Initiating chat...')}
               </p>
            </div>
          </div>

          {/* If we are in a direct context, show the Bot as secondary option */}
          {!activeContact.isBot && (
             <div onClick={() => { setActiveContact({ name: 'KOMBO Support', isBot: true }); setMessages([]) }} className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-gray-700 opacity-60 hover:opacity-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300"><Bot size={20}/></div>
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-bold text-gray-800 dark:text-gray-300 text-sm">KOMBO Support</span>
                   </div>
                   <p className="text-xs text-gray-500 dark:text-gray-500 truncate">Clique para mudar</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800 md:border-y md:border-r md:border-gray-200 dark:md:border-gray-700 md:rounded-r-2xl relative transition-colors">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm z-10 bg-white dark:bg-gray-800 md:rounded-tr-2xl transition-colors">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
              {activeContact.isBot ? <Bot size={18} /> : <span className="font-bold">{activeContact.name[0]}</span>}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white">{activeContact.name}</h3>
              <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50 dark:bg-gray-900 transition-colors">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] md:max-w-[60%] p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-tl-none'
                }`}
              >
                {msg.text}
                <div className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-400'}`}>
                   {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-600 flex gap-1 shadow-sm">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 md:rounded-br-2xl md:mb-0 mb-[70px] md:mb-0 transition-colors">
          <div className="flex items-center gap-2 md:gap-4 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-all">
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors hidden md:block">
              <Paperclip size={20} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={lang === 'pt' ? "Digite uma mensagem..." : "Type a message..."}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 px-2"
            />
             <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors hidden md:block">
              <Smile size={20} />
            </button>
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-3 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Send size={18} className={input.trim() ? 'ml-0.5' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
